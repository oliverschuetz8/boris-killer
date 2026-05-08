import { createClient } from '@/lib/supabase/server'

export interface UpcomingSummary {
  count: number
  startsWithinHour: number
  inProgress: number
}

/**
 * Returns count of "things to be aware of right now" for the nav-bar dot.
 *
 * For workers: jobs assigned to them starting within the next hour OR
 * currently in-progress.
 *
 * For admins/managers: jobs across the company starting within the next hour
 * OR currently in-progress.
 *
 * Phase E will extend this to count calendar events too.
 */
export async function getUpcomingSummary(): Promise<UpcomingSummary> {
  const empty: UpcomingSummary = { count: 0, startsWithinHour: 0, inProgress: 0 }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return empty

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) return empty

  const isWorker = profile.role === 'worker'
  const now = new Date()
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)

  let assignedJobIds: string[] = []
  if (isWorker) {
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('job_id')
      .eq('user_id', user.id)
    assignedJobIds = (assignments || []).map(a => a.job_id)
    if (assignedJobIds.length === 0) return empty
  }

  let upcomingQuery = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_start', now.toISOString())
    .lte('scheduled_start', inOneHour.toISOString())
    .in('status', ['scheduled', 'draft'])

  let inProgressQuery = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')

  if (isWorker) {
    upcomingQuery = upcomingQuery.in('id', assignedJobIds)
    inProgressQuery = inProgressQuery.in('id', assignedJobIds)
  } else {
    upcomingQuery = upcomingQuery.eq('company_id', profile.company_id)
    inProgressQuery = inProgressQuery.eq('company_id', profile.company_id)
  }

  const [{ count: startsWithinHour }, { count: inProgress }] = await Promise.all([
    upcomingQuery,
    inProgressQuery,
  ])

  const startsCount = startsWithinHour ?? 0
  const inProgressCount = inProgress ?? 0

  return {
    count: startsCount + inProgressCount,
    startsWithinHour: startsCount,
    inProgress: inProgressCount,
  }
}
