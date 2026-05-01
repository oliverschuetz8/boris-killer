import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWebhooks, getWebhookLogs } from '@/lib/services/webhooks'
import { getApiKeys } from '@/lib/services/api-keys'
import WebhooksView from './webhooks-view'

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'manager') redirect('/dashboard')

  const [webhooks, logs, apiKeys] = await Promise.all([
    getWebhooks(),
    getWebhookLogs(undefined, 50),
    profile.role === 'admin' ? getApiKeys() : Promise.resolve([]),
  ])

  return (
    <WebhooksView
      webhooks={webhooks}
      logs={logs}
      apiKeys={apiKeys}
      userRole={profile.role}
    />
  )
}
