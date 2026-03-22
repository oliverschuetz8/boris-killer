import { createClient } from '@/lib/supabase/client'

export interface JobAssignment {
  id: string
  job_id: string
  user_id: string
  company_id: string
  role: string
  assigned_at: string
  user: {
    id: string
    full_name: string | null
    email: string
    role: string
    trade: string | null
  }
}

export async function getJobAssignments(jobId: string): Promise<JobAssignment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_assignments')
    .select(`
      id, job_id, user_id, company_id, role, assigned_at,
      user:users!job_assignments_user_id_fkey(
        id, full_name, email, role, trade
      )
    `)
    .eq('job_id', jobId)
    .order('assigned_at')

  if (error) throw error
  return (data || []) as unknown as JobAssignment[]
}

export async function assignWorker(
  jobId: string,
  userId: string,
  companyId: string,
  role: string = 'worker'
): Promise<JobAssignment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_assignments')
    .insert({
      job_id: jobId,
      user_id: userId,
      company_id: companyId,
      role,
    })
    .select(`
      id, job_id, user_id, company_id, role, assigned_at,
      user:users!job_assignments_user_id_fkey(
        id, full_name, email, role, trade
      )
    `)
    .single()

  if (error) throw error
  return data as unknown as JobAssignment
}

export async function unassignWorker(jobId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_assignments')
    .delete()
    .eq('job_id', jobId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function getAssignedJobIds(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_assignments')
    .select('job_id')
    .eq('user_id', userId)

  if (error) throw error
  return (data || []).map(row => row.job_id)
}
