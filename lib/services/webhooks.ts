'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Webhook {
  id: string
  company_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  description: string | null
  last_triggered_at: string | null
  last_status_code: number | null
  failure_count: number
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  company_id: string
  webhook_id: string
  event: string
  payload: Record<string, any>
  response_status: number | null
  response_body: string | null
  success: boolean
  created_at: string
}

// Webhook event names — defined in webhooks-view.tsx for client use
// (cannot export const from 'use server' files)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  return { supabase, userId: user.id, ...profile }
}

function generateSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getWebhooks(): Promise<Webhook[]> {
  const { supabase } = await getProfile()

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch webhooks: ${error.message}`)
  return data || []
}

export async function createWebhook(
  url: string,
  events: string[],
  description?: string
): Promise<Webhook> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  const secret = generateSecret()

  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      company_id,
      url,
      secret,
      events,
      description: description || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create webhook: ${error.message}`)
  return data
}

export async function updateWebhook(
  id: string,
  updates: {
    url?: string
    events?: string[]
    description?: string
    is_active?: boolean
  }
): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  const { error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update webhook: ${error.message}`)
}

export async function deleteWebhook(id: string): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete webhook: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function getWebhookLogs(
  webhookId?: string,
  limit: number = 50
): Promise<WebhookLog[]> {
  const { supabase } = await getProfile()

  let query = supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (webhookId) {
    query = query.eq('webhook_id', webhookId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch webhook logs: ${error.message}`)
  return data || []
}

// ---------------------------------------------------------------------------
// Fire webhook event (core function)
// ---------------------------------------------------------------------------

async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const msgData = encoder.encode(body)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const hex = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')
  return `sha256=${hex}`
}

/**
 * Fire a webhook event to all active subscribers.
 * This is non-blocking — call it fire-and-forget style.
 * Uses admin client because it runs detached from the user request.
 */
export async function fireWebhookEvent(
  companyId: string,
  event: string,
  data: Record<string, any>
): Promise<void> {
  const admin = createAdminClient()

  // Find all active webhooks for this company subscribed to this event
  const { data: webhooks, error } = await admin
    .from('webhooks')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .contains('events', [event])

  if (error || !webhooks || webhooks.length === 0) return

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    company_id: companyId,
    data,
  }

  const body = JSON.stringify(payload)

  const deliveries = webhooks.map(async (webhook) => {
    let responseStatus: number | null = null
    let responseBody: string | null = null
    let success = false

    try {
      const signature = await signPayload(webhook.secret, body)

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      responseStatus = res.status
      responseBody = (await res.text()).substring(0, 1000)
      success = res.ok
    } catch (err: any) {
      responseBody = (err.message || 'Unknown error').substring(0, 1000)
    }

    // Log the delivery
    await admin.from('webhook_logs').insert({
      company_id: companyId,
      webhook_id: webhook.id,
      event,
      payload,
      response_status: responseStatus,
      response_body: responseBody,
      success,
    })

    // Update webhook status
    await admin
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: responseStatus,
        failure_count: success ? 0 : (webhook.failure_count || 0) + 1,
      })
      .eq('id', webhook.id)
  })

  await Promise.allSettled(deliveries)
}
