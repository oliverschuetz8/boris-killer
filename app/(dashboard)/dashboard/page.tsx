import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardStats, getRecentJobs } from '@/lib/services/dashboard'
import DashboardView from './dashboard-view'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, full_name, role, companies(name)')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/onboarding')
  if (profile.role === 'worker') redirect('/today')

  const [stats, recentJobs] = await Promise.all([
    getDashboardStats(profile.company_id),
    getRecentJobs(profile.company_id),
  ])

  const companyName = (profile.companies as any)?.name ?? 'your company'
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <DashboardView
      firstName={firstName}
      companyName={companyName}
      stats={stats}
      recentJobs={recentJobs}
    />
  )
}
