import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEmailBranding } from '@/lib/email/branding'
import { renderDailyDigestEmail, type DailyDigestData, type DigestItem } from '@/lib/email/templates/daily-digest'
import { renderEventReminderEmail, type EventReminderData } from '@/lib/email/templates/event-reminder'
import type { EmailBranding, RenderedEmail } from '@/lib/email/types'

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

async function sendEmail(
  branding: EmailBranding,
  to: string,
  rendered: RenderedEmail,
  logEvent: string,
  companyId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.EMAIL_FROM_ADDRESS

  if (!apiKey || !fromAddress) {
    await admin.from('email_logs').insert({
      company_id: companyId,
      event: logEvent,
      recipient_email: to,
      subject: rendered.subject,
      success: false,
      error_message: 'Email service not configured',
    })
    return { success: false, error: 'Email service not configured' }
  }

  const resend = new Resend(apiKey)
  const fromName = branding.name.replace(/[<>]/g, '').trim() || 'Notifications'
  const replyTo = branding.email_reply_to || branding.email || undefined

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to,
      replyTo: replyTo || undefined,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })
    const messageId = (result as any)?.data?.id ?? null
    await admin.from('email_logs').insert({
      company_id: companyId,
      event: logEvent,
      recipient_email: to,
      subject: rendered.subject,
      success: true,
      message_id: messageId,
    })
    return { success: true }
  } catch (err: any) {
    await admin.from('email_logs').insert({
      company_id: companyId,
      event: logEvent,
      recipient_email: to,
      subject: rendered.subject,
      success: false,
      error_message: err?.message ?? 'Unknown error',
    })
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}

// ---------------------------------------------------------------------------
// Daily digest
// ---------------------------------------------------------------------------

export async function sendDailyDigestsForAllUsers(): Promise<{ sent: number; skipped: number; failed: number }> {
  const admin = createAdminClient()

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, email, role, company_id, is_active, email_notifications_enabled')
    .eq('is_active', true)
    .eq('email_notifications_enabled', true)

  if (!users || users.length === 0) return { sent: 0, skipped: 0, failed: 0 }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const user of users) {
    if (!user.company_id || !user.email) {
      skipped++
      continue
    }
    try {
      const result = await sendDailyDigestForUser(user.id)
      if (result === 'sent') sent++
      else if (result === 'skipped') skipped++
      else failed++
    } catch (err) {
      console.error('[digest]', user.id, err)
      failed++
    }
  }

  return { sent, skipped, failed }
}

export async function sendDailyDigestForUser(userId: string): Promise<'sent' | 'skipped' | 'failed'> {
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('id, full_name, email, role, company_id, is_active, email_notifications_enabled')
    .eq('id', userId)
    .single()

  if (!user || !user.company_id || !user.email) return 'skipped'
  if (user.is_active === false || user.email_notifications_enabled === false) return 'skipped'

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const tomorrowStart = new Date(todayEnd.getTime() + 1)
  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setHours(23, 59, 59, 999)
  const sevenDaysEnd = new Date(now)
  sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 7)
  sevenDaysEnd.setHours(23, 59, 59, 999)

  const isAdminLike = user.role === 'admin' || user.role === 'manager'

  // --- Jobs ---
  let jobIdsForUser: string[] = []
  if (!isAdminLike) {
    const { data: assignments } = await admin
      .from('job_assignments')
      .select('job_id')
      .eq('user_id', user.id)
    jobIdsForUser = (assignments || []).map(a => a.job_id)
  }

  let jobQuery = admin
    .from('jobs')
    .select(`
      id, job_number, title, status, scheduled_start, scheduled_end,
      site_address_line1, site_city,
      customer:customers!jobs_customer_id_fkey(name)
    `)
    .gte('scheduled_start', todayStart.toISOString())
    .lte('scheduled_start', todayEnd.toISOString())
    .neq('status', 'cancelled')
    .order('scheduled_start')

  if (isAdminLike) {
    jobQuery = jobQuery.eq('company_id', user.company_id)
  } else {
    if (jobIdsForUser.length === 0) jobQuery = jobQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    else jobQuery = jobQuery.in('id', jobIdsForUser)
  }

  const { data: todayJobs } = await jobQuery

  // --- Calendar events visible to user ---
  const { data: todayEvents } = await admin
    .from('calendar_events')
    .select(`
      id, event_type, title, start_time, end_time, is_all_day, location,
      customer:customers!calendar_events_customer_id_fkey(name)
    `)
    .eq('company_id', user.company_id)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .or(`created_by.eq.${user.id},visibility.in.("team","company")`)
    .order('start_time')

  // --- Tomorrow + next 7 day counts ---
  let tomorrowJobsQuery = admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_start', tomorrowStart.toISOString())
    .lte('scheduled_start', tomorrowEnd.toISOString())
    .neq('status', 'cancelled')
  if (isAdminLike) {
    tomorrowJobsQuery = tomorrowJobsQuery.eq('company_id', user.company_id)
  } else {
    if (jobIdsForUser.length === 0) tomorrowJobsQuery = tomorrowJobsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    else tomorrowJobsQuery = tomorrowJobsQuery.in('id', jobIdsForUser)
  }

  let weekJobsQuery = admin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gt('scheduled_start', tomorrowEnd.toISOString())
    .lte('scheduled_start', sevenDaysEnd.toISOString())
    .neq('status', 'cancelled')
  if (isAdminLike) {
    weekJobsQuery = weekJobsQuery.eq('company_id', user.company_id)
  } else {
    if (jobIdsForUser.length === 0) weekJobsQuery = weekJobsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    else weekJobsQuery = weekJobsQuery.in('id', jobIdsForUser)
  }

  const [{ count: tomorrowJobsCount }, { count: weekJobsCount }] = await Promise.all([
    tomorrowJobsQuery, weekJobsQuery,
  ])

  // --- Build digest items ---
  const appUrl = getAppUrl()
  const digestItems: DigestItem[] = []

  for (const j of todayJobs || []) {
    const customer = Array.isArray(j.customer) ? j.customer[0] : j.customer
    const subtitle = [
      customer?.name,
      [j.site_address_line1, j.site_city].filter(Boolean).join(', '),
    ].filter(Boolean).join(' · ')
    digestItems.push({
      type: 'job',
      title: `${j.job_number} — ${j.title}`,
      start_time: j.scheduled_start,
      end_time: j.scheduled_end,
      subtitle: subtitle || null,
      status: j.status,
      url: `${appUrl}/jobs/${j.id}`,
    })
  }

  for (const e of todayEvents || []) {
    const customer = Array.isArray(e.customer) ? e.customer[0] : e.customer
    digestItems.push({
      type: 'event',
      event_type: e.event_type,
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time,
      is_all_day: e.is_all_day,
      subtitle: customer?.name ?? e.location ?? null,
      url: `${appUrl}/schedule`,
    })
  }

  digestItems.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Skip empty digest if user has nothing today/tomorrow/week
  const totalUpcoming =
    digestItems.length + (tomorrowJobsCount ?? 0) + (weekJobsCount ?? 0)
  if (totalUpcoming === 0) return 'skipped'

  const branding = await getEmailBranding(user.company_id)

  const data: DailyDigestData = {
    recipient_name: user.full_name || 'there',
    date_label: now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    today_items: digestItems,
    tomorrow_count: tomorrowJobsCount ?? 0,
    next_seven_days_count: weekJobsCount ?? 0,
    app_url: appUrl,
  }

  const rendered = renderDailyDigestEmail(data, branding)
  const result = await sendEmail(branding, user.email, rendered, 'daily.digest', user.company_id)
  return result.success ? 'sent' : 'failed'
}

// ---------------------------------------------------------------------------
// Per-event reminders
// ---------------------------------------------------------------------------

export async function processPendingEventReminders(): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient()
  const now = new Date()

  // Find events with reminder set, not yet sent, and start_time within the
  // [now + reminder_minutes, now + reminder_minutes + 5min] window.
  // We over-fetch and filter in-memory because Postgres can't compare a column
  // expression with a timestamp natively across rows efficiently.
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h ahead

  const { data: events, error } = await admin
    .from('calendar_events')
    .select(`
      id, company_id, created_by, event_type, title, description,
      start_time, end_time, location, video_link,
      reminder_minutes_before, reminder_sent_at,
      customer:customers!calendar_events_customer_id_fkey(name)
    `)
    .not('reminder_minutes_before', 'is', null)
    .is('reminder_sent_at', null)
    .gte('start_time', now.toISOString())
    .lte('start_time', horizon.toISOString())

  if (error || !events || events.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const dueEvents = events.filter(ev => {
    const start = new Date(ev.start_time).getTime()
    const minutesUntilStart = Math.floor((start - now.getTime()) / (60 * 1000))
    const reminderAt = (ev.reminder_minutes_before ?? 0)
    // Fire if we're now within the reminder window (i.e., minutesUntilStart <= reminderAt and not yet past the event)
    return minutesUntilStart <= reminderAt && minutesUntilStart >= -1
  })

  const appUrl = getAppUrl()
  let sent = 0
  let failed = 0

  for (const ev of dueEvents) {
    if (!ev.created_by) continue
    const { data: creator } = await admin
      .from('users')
      .select('email, full_name, is_active, email_notifications_enabled')
      .eq('id', ev.created_by)
      .single()
    if (!creator?.email) continue
    if (creator.is_active === false) continue
    if (creator.email_notifications_enabled === false) continue

    const customer = Array.isArray(ev.customer) ? ev.customer[0] : ev.customer
    const branding = await getEmailBranding(ev.company_id)

    const minutesUntilStart = Math.max(
      0,
      Math.floor((new Date(ev.start_time).getTime() - now.getTime()) / (60 * 1000)),
    )

    const data: EventReminderData = {
      event_id: ev.id,
      event_type_label: labelForType(ev.event_type),
      title: ev.title,
      start_time: ev.start_time,
      end_time: ev.end_time,
      location: ev.location,
      video_link: ev.video_link,
      description: ev.description,
      customer_name: customer?.name ?? null,
      minutes_before: minutesUntilStart,
      app_url: appUrl,
    }

    const rendered = renderEventReminderEmail(data, branding)
    const result = await sendEmail(branding, creator.email, rendered, 'event.reminder', ev.company_id)

    if (result.success) {
      await admin
        .from('calendar_events')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', ev.id)
      sent++
    } else {
      failed++
    }
  }

  return { sent, failed }
}

function labelForType(type: string): string {
  const map: Record<string, string> = {
    meeting: 'Meeting',
    call: 'Call',
    reminder: 'Reminder',
    task: 'Task',
    material_delivery: 'Material delivery',
    interview: 'Interview',
    block: 'Focus block',
    custom: 'Event',
  }
  return map[type] ?? 'Event'
}
