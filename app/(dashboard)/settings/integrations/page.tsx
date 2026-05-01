import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IntegrationsView from './integrations-view'

export default async function IntegrationsPage() {
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

  // Fetch Xero connection
  const { data: xeroConnection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()

  // Fetch unassigned time entries
  const { data: unassignedEntries } = await supabase
    .from('job_time_entries')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('status', 'unassigned')
    .order('date', { ascending: false })

  // Fetch jobs for the assign dropdown
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, title')
    .eq('company_id', profile.company_id)
    .in('status', ['scheduled', 'in_progress'])
    .order('job_number', { ascending: false })

  return (
    <IntegrationsView
      xeroConnection={xeroConnection || null}
      unassignedEntries={unassignedEntries || []}
      jobs={jobs || []}
      userRole={profile.role}
    />
  )
}
