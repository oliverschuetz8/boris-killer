import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLeads, getLeadStats } from '@/lib/services/leads'
import LeadsView from './leads-view'

export default async function LeadsPage() {
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

  const [leads, stats] = await Promise.all([
    getLeads(),
    getLeadStats(),
  ])

  return (
    <LeadsView
      leads={leads}
      stats={stats}
      userRole={profile.role}
    />
  )
}
