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

export interface JobStatusBreakdown {
  status: string
  count: number
}

export interface CompletionOverTime {
  month: string
  count: number
}

export interface RevenueSummary {
  draft: number
  sent: number
  paid: number
  overdue: number
}

export interface WorkerJobCount {
  name: string
  jobs: number
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

export async function getJobStatusBreakdown(companyId: string): Promise<JobStatusBreakdown[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('jobs')
    .select('status')
    .eq('company_id', companyId)

  if (!data || data.length === 0) return []

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.status] = (counts[row.status] || 0) + 1
  }

  return Object.entries(counts).map(([status, count]) => ({ status, count }))
}

export async function getCompletionOverTime(companyId: string): Promise<CompletionOverTime[]> {
  const supabase = await createClient()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('jobs')
    .select('completed_at')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('completed_at', sixMonthsAgo.toISOString())

  // Build last 6 months labels
  const months: CompletionOverTime[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: d.toLocaleString('en-AU', { month: 'short' }),
      count: 0,
    })
  }

  // Count completions per month
  for (const row of data || []) {
    if (!row.completed_at) continue
    const d = new Date(row.completed_at)
    const label = d.toLocaleString('en-AU', { month: 'short' })
    const entry = months.find(m => m.month === label)
    if (entry) entry.count++
  }

  return months
}

export async function getRevenueSummary(companyId: string): Promise<RevenueSummary> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('invoices')
    .select('status, total')
    .eq('company_id', companyId)

  const summary: RevenueSummary = { draft: 0, sent: 0, paid: 0, overdue: 0 }

  for (const inv of data || []) {
    const amount = Number(inv.total) || 0
    if (inv.status === 'draft') summary.draft += amount
    else if (inv.status === 'sent') summary.sent += amount
    else if (inv.status === 'paid') summary.paid += amount
    else if (inv.status === 'overdue') summary.overdue += amount
  }

  return summary
}

export async function getJobsPerWorker(companyId: string): Promise<WorkerJobCount[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('job_assignments')
    .select('user_id, user:users!job_assignments_user_id_fkey(full_name)')
    .eq('company_id', companyId)

  if (!data || data.length === 0) return []

  const counts: Record<string, { name: string; jobs: number }> = {}
  for (const row of data) {
    const user = row.user as any
    const name = user?.full_name || 'Unknown'
    if (!counts[row.user_id]) {
      counts[row.user_id] = { name, jobs: 0 }
    }
    counts[row.user_id].jobs++
  }

  return Object.values(counts)
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 10)
}
