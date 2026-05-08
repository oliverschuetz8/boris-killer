'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fireWebhookEvent } from '@/lib/services/webhooks'
import type { ScheduleEvent } from '@/lib/services/schedule'

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  return { supabase, userId: user.id, ...profile }
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function rescheduleJob(jobId: string, start: string, end: string): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid start or end date')
  }
  if (endDate <= startDate) {
    throw new Error('End must be after start')
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .update({
      scheduled_start: startDate.toISOString(),
      scheduled_end: endDate.toISOString(),
    })
    .eq('id', jobId)
    .select('id, company_id, job_number, title, status, scheduled_start, scheduled_end')
    .single()

  if (error) throw new Error(`Failed to reschedule: ${error.message}`)

  fireWebhookEvent(job.company_id, 'job.rescheduled', {
    job_id: job.id,
    job_number: job.job_number,
    title: job.title,
    status: job.status,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
  }).catch(() => {})

  revalidatePath('/schedule')
  revalidatePath('/jobs')
  revalidatePath(`/jobs/${jobId}`)
}

export async function reassignJobToWorker(
  jobId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const { supabase, role, company_id } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  if (fromUserId === toUserId) return

  const { error: deleteError } = await supabase
    .from('job_assignments')
    .delete()
    .eq('job_id', jobId)
    .eq('user_id', fromUserId)
  if (deleteError) throw new Error(`Failed to remove assignment: ${deleteError.message}`)

  const { data: existing } = await supabase
    .from('job_assignments')
    .select('id')
    .eq('job_id', jobId)
    .eq('user_id', toUserId)
    .maybeSingle()

  if (!existing) {
    const { error: insertError } = await supabase
      .from('job_assignments')
      .insert({
        job_id: jobId,
        user_id: toUserId,
        company_id,
        role: 'worker',
      })
    if (insertError) throw new Error(`Failed to assign: ${insertError.message}`)
  }

  revalidatePath('/schedule')
  revalidatePath(`/jobs/${jobId}`)
}

interface QuickCreateInput {
  title: string
  customer_id: string
  scheduled_start: string
  scheduled_end: string
  job_type?: string
  priority?: string
  worker_ids?: string[]
}

export async function createScheduledJob(input: QuickCreateInput): Promise<ScheduleEvent> {
  const { supabase, userId, role, company_id } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  if (!input.title?.trim()) throw new Error('Title is required')
  if (!input.customer_id) throw new Error('Customer is required')

  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', company_id)

  const jobNumber = `JOB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      company_id,
      customer_id: input.customer_id,
      job_number: jobNumber,
      title: input.title.trim(),
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      status: 'scheduled',
      priority: input.priority || 'normal',
      job_type: input.job_type || 'installation',
      created_by: userId,
    })
    .select(`
      id, job_number, title, description, status, priority, job_type,
      scheduled_start, scheduled_end,
      customer_id, site_address_line1, site_city,
      recurrence_months, parent_job_id,
      customer:customers!jobs_customer_id_fkey(name)
    `)
    .single()

  if (error || !job) throw new Error(`Failed to create job: ${error?.message ?? 'unknown'}`)

  let assignments: ScheduleEvent['assignments'] = []
  if (input.worker_ids && input.worker_ids.length > 0) {
    const rows = input.worker_ids.map(uid => ({
      job_id: job.id,
      user_id: uid,
      company_id,
      role: 'worker',
    }))
    await supabase.from('job_assignments').insert(rows)

    const { data: workerRows } = await supabase
      .from('users')
      .select('id, full_name, trade')
      .in('id', input.worker_ids)
    assignments = (workerRows || []).map(w => ({
      user_id: w.id,
      full_name: w.full_name ?? null,
      role: 'worker',
      trade: w.trade ?? null,
    }))
  }

  fireWebhookEvent(company_id, 'job.created', {
    job_id: job.id,
    job_number: job.job_number,
    title: job.title,
    status: job.status,
  }).catch(() => {})

  revalidatePath('/schedule')
  revalidatePath('/jobs')

  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  return {
    id: job.id,
    job_number: job.job_number,
    title: job.title,
    description: job.description,
    status: job.status,
    priority: job.priority,
    job_type: job.job_type,
    scheduled_start: job.scheduled_start as string,
    scheduled_end: job.scheduled_end as string,
    customer_id: job.customer_id,
    customer_name: customer?.name ?? null,
    site_address: job.site_address_line1 ?? null,
    site_city: job.site_city ?? null,
    recurrence_months: job.recurrence_months ?? null,
    parent_job_id: job.parent_job_id ?? null,
    assignments,
  }
}

export async function enableCalendarSync(): Promise<{ token: string }> {
  const { supabase, userId } = await getProfile()

  const { data: existing } = await supabase
    .from('users')
    .select('calendar_token')
    .eq('id', userId)
    .single()

  if (existing?.calendar_token) {
    revalidatePath('/profile')
    return { token: existing.calendar_token }
  }

  const token = generateToken()
  const { error } = await supabase
    .from('users')
    .update({ calendar_token: token })
    .eq('id', userId)
  if (error) throw new Error(`Failed to enable sync: ${error.message}`)

  revalidatePath('/profile')
  return { token }
}

export async function regenerateCalendarToken(): Promise<{ token: string }> {
  const { supabase, userId } = await getProfile()

  const token = generateToken()
  const { error } = await supabase
    .from('users')
    .update({ calendar_token: token })
    .eq('id', userId)
  if (error) throw new Error(`Failed to regenerate token: ${error.message}`)

  revalidatePath('/profile')
  return { token }
}

export async function disableCalendarSync(): Promise<void> {
  const { supabase, userId } = await getProfile()

  const { error } = await supabase
    .from('users')
    .update({ calendar_token: null })
    .eq('id', userId)
  if (error) throw new Error(`Failed to disable sync: ${error.message}`)

  revalidatePath('/profile')
}
