import { createClient } from '@/lib/supabase/client'

export async function startTimeEntry(jobId: string, userId: string, companyId: string) {
  const supabase = createClient()

  // Get worker's current hourly rate — snapshot it at time of work
  const { data: worker } = await supabase
    .from('users')
    .select('hourly_rate')
    .eq('id', userId)
    .single()

  const { data, error } = await supabase
    .from('job_time_entries')
    .insert({
      job_id: jobId,
      user_id: userId,
      company_id: companyId,
      started_at: new Date().toISOString(),
      hourly_rate: worker?.hourly_rate || 0,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function completeTimeEntry(jobId: string, userId: string) {
  const supabase = createClient()

  // Find the open time entry for this worker on this job
  const { data: entry } = await supabase
    .from('job_time_entries')
    .select('id, started_at')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .is('completed_at', null)
    .single()

  if (!entry) return null

  const completedAt = new Date()
  const startedAt = new Date(entry.started_at)
  const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)

  const { data, error } = await supabase
    .from('job_time_entries')
    .update({
      completed_at: completedAt.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', entry.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTimeEntriesForJob(jobId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('job_time_entries')
    .select(`
      id, started_at, completed_at, duration_minutes, hourly_rate,
      user:users(id, full_name, trade)
    `)
    .eq('job_id', jobId)
    .order('started_at')

  return data || []
}

export function calculateLabourCost(entries: any[]) {
  return entries.reduce((total, entry) => {
    if (!entry.duration_minutes) return total
    const hours = entry.duration_minutes / 60
    return total + (hours * (entry.hourly_rate || 0))
  }, 0)
}

export function calculateTotalMinutes(entries: any[]) {
  return entries.reduce((total, entry) => {
    return total + (entry.duration_minutes || 0)
  }, 0)
}