import { createClient } from '@/lib/supabase/server'

export interface ScheduleEventAssignment {
  user_id: string
  full_name: string | null
  role: string | null
  trade: string | null
}

export interface ScheduleEvent {
  id: string
  job_number: string
  title: string
  description: string | null
  status: string
  priority: string | null
  job_type: string | null
  scheduled_start: string
  scheduled_end: string
  customer_id: string
  customer_name: string | null
  site_address: string | null
  site_city: string | null
  recurrence_months: number | null
  parent_job_id: string | null
  assignments: ScheduleEventAssignment[]
}

export interface CalendarWorker {
  id: string
  full_name: string | null
  email: string
  trade: string | null
  role: string
}

export async function getScheduledJobs(
  rangeStart: string,
  rangeEnd: string
): Promise<ScheduleEvent[]> {
  const supabase = await createClient()

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, description, status, priority, job_type,
      scheduled_start, scheduled_end,
      customer_id,
      site_address_line1, site_city,
      recurrence_months, parent_job_id,
      customer:customers!jobs_customer_id_fkey(id, name)
    `)
    .not('scheduled_start', 'is', null)
    .not('scheduled_end', 'is', null)
    .lte('scheduled_start', rangeEnd)
    .gte('scheduled_end', rangeStart)
    .order('scheduled_start', { ascending: true })

  if (error) throw new Error(`Failed to fetch scheduled jobs: ${error.message}`)
  if (!jobs || jobs.length === 0) return []

  const jobIds = jobs.map(j => j.id)
  const { data: assignmentRows } = await supabase
    .from('job_assignments')
    .select(`
      job_id, user_id, role,
      user:users!job_assignments_user_id_fkey(full_name, trade)
    `)
    .in('job_id', jobIds)

  const assignmentsByJob = new Map<string, ScheduleEventAssignment[]>()
  for (const row of assignmentRows || []) {
    const u = Array.isArray(row.user) ? row.user[0] : row.user
    const assignment: ScheduleEventAssignment = {
      user_id: row.user_id,
      full_name: u?.full_name ?? null,
      role: row.role ?? null,
      trade: u?.trade ?? null,
    }
    const arr = assignmentsByJob.get(row.job_id) ?? []
    arr.push(assignment)
    assignmentsByJob.set(row.job_id, arr)
  }

  return jobs.map(j => {
    const customer = Array.isArray(j.customer) ? j.customer[0] : j.customer
    return {
      id: j.id,
      job_number: j.job_number,
      title: j.title,
      description: j.description,
      status: j.status,
      priority: j.priority,
      job_type: j.job_type,
      scheduled_start: j.scheduled_start as string,
      scheduled_end: j.scheduled_end as string,
      customer_id: j.customer_id,
      customer_name: customer?.name ?? null,
      site_address: j.site_address_line1 ?? null,
      site_city: j.site_city ?? null,
      recurrence_months: j.recurrence_months ?? null,
      parent_job_id: j.parent_job_id ?? null,
      assignments: assignmentsByJob.get(j.id) ?? [],
    }
  })
}

export async function getActiveWorkers(): Promise<CalendarWorker[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, trade, role')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(`Failed to fetch workers: ${error.message}`)
  return (data || []) as CalendarWorker[]
}

export async function getCalendarCustomers() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  const { data, error } = await supabase
    .from('customers')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .order('name')

  if (error) throw new Error(`Failed to fetch customers: ${error.message}`)
  return data || []
}
