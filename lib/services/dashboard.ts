import { createClient } from '@/lib/supabase/server'

export interface DashboardStats {
  activeJobs: number
  completedThisMonth: number
  totalWorkers: number
  workersOnSite: number
}

export interface RecentJob {
  id: string
  job_number: string
  title: string
  status: string
  scheduled_start: string | null
  created_at: string
  customer: { name: string } | null
  assignments: { id: string; user: { id: string; full_name: string | null } }[]
}

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: activeJobs },
    { count: completedThisMonth },
    { count: totalWorkers },
    inProgressJobs,
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['scheduled', 'in_progress']),

    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('completed_at', firstOfMonth),

    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('role', 'worker'),

    supabase
      .from('jobs')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'in_progress'),
  ])

  let workersOnSite = 0
  const activeJobIds = (inProgressJobs.data || []).map(j => j.id)
  if (activeJobIds.length > 0) {
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('user_id')
      .in('job_id', activeJobIds)

    const uniqueWorkers = new Set((assignments || []).map(a => a.user_id))
    workersOnSite = uniqueWorkers.size
  }

  return {
    activeJobs: activeJobs ?? 0,
    completedThisMonth: completedThisMonth ?? 0,
    totalWorkers: totalWorkers ?? 0,
    workersOnSite,
  }
}

export async function getRecentJobs(companyId: string): Promise<RecentJob[]> {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, status, scheduled_start, created_at,
      customer:customers!jobs_customer_id_fkey(name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!jobs || jobs.length === 0) return []

  const jobIds = jobs.map(j => j.id)
  const { data: assignments } = await supabase
    .from('job_assignments')
    .select(`
      id, job_id,
      user:users!job_assignments_user_id_fkey(id, full_name)
    `)
    .in('job_id', jobIds)

  const assignmentsByJob: Record<string, RecentJob['assignments']> = {}
  for (const a of (assignments || [])) {
    if (!assignmentsByJob[a.job_id]) assignmentsByJob[a.job_id] = []
    assignmentsByJob[a.job_id].push({ id: a.id, user: a.user as any })
  }

  return jobs.map(j => ({
    ...j,
    customer: j.customer as any,
    assignments: assignmentsByJob[j.id] || [],
  }))
}
