import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEmailPreferences, getEmailLogs } from '@/lib/services/email'
import NotificationsView from './notifications-view'

export default async function NotificationsPage() {
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

  const [preferences, logs] = await Promise.all([
    getEmailPreferences(),
    getEmailLogs(50),
  ])

  return (
    <NotificationsView
      initialPreferences={preferences}
      initialLogs={logs}
      currentUserEmail={user.email || ''}
    />
  )
}
