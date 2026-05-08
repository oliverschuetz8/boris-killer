import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getEmailPreferences, getEmailLogs, getCompanyUsers } from '@/lib/services/email'
import { getEmailGroups } from '@/lib/services/email-groups'
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

  const [preferences, logs, users, groups] = await Promise.all([
    getEmailPreferences(),
    getEmailLogs(50),
    getCompanyUsers(),
    getEmailGroups(),
  ])

  return (
    <NotificationsView
      initialPreferences={preferences}
      initialLogs={logs}
      initialUsers={users}
      initialGroups={groups}
      currentUserEmail={user.email || ''}
    />
  )
}
