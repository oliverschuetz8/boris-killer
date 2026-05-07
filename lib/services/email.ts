'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmailBranding } from '@/lib/email/branding'
import { renderJobCreatedEmail, type JobCreatedData } from '@/lib/email/templates/job-created'
import { renderJobCompletedEmail, type JobCompletedData } from '@/lib/email/templates/job-completed'
import { renderInvoiceSentEmail, type InvoiceSentData } from '@/lib/email/templates/invoice-sent'
import { renderInvoicePaidEmail, type InvoicePaidData } from '@/lib/email/templates/invoice-paid'
import { renderInvoiceOverdueEmail, type InvoiceOverdueData } from '@/lib/email/templates/invoice-overdue'
import type { EmailBranding, EmailEvent, EmailLog, EmailPreference, RenderedEmail } from '@/lib/email/types'

// ---------------------------------------------------------------------------
// Event payload shapes
// ---------------------------------------------------------------------------

export interface JobCreatedPayload extends Omit<JobCreatedData, 'app_url'> {}
export interface JobCompletedPayload extends Omit<JobCompletedData, 'app_url'> {}
export interface InvoiceSentPayload extends InvoiceSentData {
  customer_email: string | null
}
export interface InvoicePaidPayload extends Omit<InvoicePaidData, 'app_url'> {}
export interface InvoiceOverduePayload extends Omit<InvoiceOverdueData, 'app_url' | 'audience'> {
  customer_email: string | null
}

type EventPayloadMap = {
  'job.created': JobCreatedPayload
  'job.completed': JobCompletedPayload
  'invoice.sent': InvoiceSentPayload
  'invoice.paid': InvoicePaidPayload
  'invoice.overdue': InvoiceOverduePayload
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getEmailPreferences(): Promise<EmailPreference[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('company_id', profile.company_id)

  if (error) throw new Error(`Failed to load preferences: ${error.message}`)
  return (data || []) as EmailPreference[]
}

export async function upsertEmailPreference(
  event: EmailEvent,
  updates: {
    is_enabled?: boolean
    recipient_roles?: string[]
    extra_emails?: string[]
    notify_customer?: boolean
  },
): Promise<EmailPreference> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('email_preferences')
    .upsert(
      {
        company_id: profile.company_id,
        event,
        is_enabled: updates.is_enabled ?? true,
        recipient_roles: updates.recipient_roles ?? ['admin', 'manager'],
        extra_emails: updates.extra_emails ?? [],
        notify_customer: updates.notify_customer ?? false,
      },
      { onConflict: 'company_id,event' },
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save preference: ${error.message}`)
  return data as EmailPreference
}

export async function getEmailLogs(limit: number = 50): Promise<EmailLog[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load logs: ${error.message}`)
  return (data || []) as EmailLog[]
}

export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) return { success: false, error: 'Company not found' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { success: false, error: 'Admin or manager only' }
  }

  try {
    const branding = await getEmailBranding(profile.company_id)
    const rendered = renderJobCreatedEmail(
      {
        job_id: 'test-job-id',
        job_number: 'TEST-001',
        title: 'Test email from your notifications setup',
        customer_name: 'Sample Customer',
        scheduled_start: new Date().toISOString(),
        site_address: '123 Sample St, Melbourne VIC 3000',
        app_url: getAppUrl(),
      },
      branding,
    )
    await deliverEmail({
      branding,
      event: 'job.created',
      to: toEmail,
      rendered,
    })
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' }
  }
}

/**
 * Fire an email event. Non-blocking — call fire-and-forget style.
 *
 * Loads preferences for the event, resolves recipients, fetches branding,
 * renders the appropriate template, and delivers to each recipient.
 * Failures are logged but never thrown.
 */
export async function fireEmailEvent<E extends EmailEvent>(
  companyId: string,
  event: E,
  payload: EventPayloadMap[E],
): Promise<void> {
  try {
    const admin = createAdminClient()

    const pref = await loadPreference(companyId, event)
    if (!pref.is_enabled) return

    const recipients = await resolveRecipients(companyId, event, pref, payload)
    if (recipients.length === 0) return

    const branding = await getEmailBranding(companyId)
    const appUrl = getAppUrl()

    let rendered: RenderedEmail | null = null
    let customerRendered: RenderedEmail | null = null

    if (event === 'job.created') {
      rendered = renderJobCreatedEmail({ ...(payload as JobCreatedPayload), app_url: appUrl }, branding)
    } else if (event === 'job.completed') {
      rendered = renderJobCompletedEmail({ ...(payload as JobCompletedPayload), app_url: appUrl }, branding)
    } else if (event === 'invoice.sent') {
      // invoice.sent is customer-only — no internal version
      customerRendered = renderInvoiceSentEmail(payload as InvoiceSentPayload, branding)
    } else if (event === 'invoice.paid') {
      rendered = renderInvoicePaidEmail({ ...(payload as InvoicePaidPayload), app_url: appUrl }, branding)
    } else if (event === 'invoice.overdue') {
      const p = payload as InvoiceOverduePayload
      rendered = renderInvoiceOverdueEmail({ ...p, app_url: appUrl, audience: 'internal' }, branding)
      if (pref.notify_customer && p.customer_email) {
        customerRendered = renderInvoiceOverdueEmail({ ...p, app_url: appUrl, audience: 'customer' }, branding)
      }
    }

    const deliveries: Promise<void>[] = []
    for (const r of recipients) {
      const useCustomer = r.kind === 'customer' && customerRendered
      const message = useCustomer ? customerRendered : rendered
      if (!message) continue
      deliveries.push(
        deliverEmail({
          branding,
          event,
          to: r.email,
          rendered: message,
        }),
      )
    }

    await Promise.allSettled(deliveries)
    void admin
  } catch (err: any) {
    console.error(`[fireEmailEvent] ${event} failed:`, err?.message || err)
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface Recipient {
  email: string
  kind: 'user' | 'extra' | 'customer'
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

async function loadPreference(companyId: string, event: EmailEvent): Promise<EmailPreference> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('email_preferences')
    .select('*')
    .eq('company_id', companyId)
    .eq('event', event)
    .maybeSingle()

  if (data) return data as EmailPreference

  // Default preference (event enabled, sent to admin+manager)
  const isCustomerEvent = event === 'invoice.sent'
  return {
    id: '',
    company_id: companyId,
    event,
    is_enabled: true,
    recipient_roles: isCustomerEvent ? [] : ['admin', 'manager'],
    extra_emails: [],
    notify_customer: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function resolveRecipients(
  companyId: string,
  event: EmailEvent,
  pref: EmailPreference,
  payload: any,
): Promise<Recipient[]> {
  const admin = createAdminClient()
  const out: Recipient[] = []
  const seen = new Set<string>()

  const add = (email: string | null | undefined, kind: Recipient['kind']) => {
    if (!email) return
    const normalized = email.trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    out.push({ email: email.trim(), kind })
  }

  // Role-based recipients (skip for invoice.sent — it's customer-only)
  if (event !== 'invoice.sent' && pref.recipient_roles.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('email, role, is_active, email_notifications_enabled')
      .eq('company_id', companyId)
      .in('role', pref.recipient_roles)

    for (const u of users || []) {
      if (u.is_active === false) continue
      if (u.email_notifications_enabled === false) continue
      add(u.email, 'user')
    }
  }

  // Extra emails (always honoured, except for invoice.sent which goes to customer only)
  if (event !== 'invoice.sent') {
    for (const e of pref.extra_emails) add(e, 'extra')
  }

  // Customer email
  if (event === 'invoice.sent' && payload?.customer_email) {
    add(payload.customer_email, 'customer')
  }
  if (event === 'invoice.overdue' && pref.notify_customer && payload?.customer_email) {
    add(payload.customer_email, 'customer')
  }

  return out
}

interface DeliverArgs {
  branding: EmailBranding
  event: EmailEvent
  to: string
  rendered: RenderedEmail
}

async function deliverEmail({ branding, event, to, rendered }: DeliverArgs): Promise<void> {
  const admin = createAdminClient()
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.EMAIL_FROM_ADDRESS

  if (!apiKey || !fromAddress) {
    await admin.from('email_logs').insert({
      company_id: branding.company_id,
      event,
      recipient_email: to,
      subject: rendered.subject,
      success: false,
      error_message: 'Email service not configured (RESEND_API_KEY or EMAIL_FROM_ADDRESS missing)',
    })
    console.warn('[email] Skipping send — RESEND_API_KEY or EMAIL_FROM_ADDRESS not set')
    return
  }

  const resend = new Resend(apiKey)
  const fromName = branding.name.replace(/[<>]/g, '').trim() || 'Notifications'
  const replyTo = branding.email_reply_to || branding.email || undefined

  let success = false
  let errorMessage: string | null = null
  let messageId: string | null = null

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo,
    })
    if (result.error) {
      errorMessage = result.error.message || 'Resend returned an error'
    } else {
      success = true
      messageId = result.data?.id || null
    }
  } catch (err: any) {
    errorMessage = err?.message || 'Unknown error'
  }

  await admin.from('email_logs').insert({
    company_id: branding.company_id,
    event,
    recipient_email: to,
    subject: rendered.subject,
    success,
    error_message: errorMessage,
    provider_message_id: messageId,
  })
}
