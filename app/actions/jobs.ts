'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Job, JobWithRelations } from '@/lib/types/database'
import { fireWebhookEvent } from '@/lib/services/webhooks'

export async function getJobs(): Promise<JobWithRelations[]> {
  const supabase = await createClient()

  // First get jobs with customer and site
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers!jobs_customer_id_fkey(*),
      site:customer_sites!jobs_site_id_fkey(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching jobs:', error)
    throw new Error('Failed to fetch jobs')
  }

  // Then get assignments separately for each job
  const jobsWithAssignments = await Promise.all(
    (jobs || []).map(async (job) => {
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select(`
          id,
          role,
          user:users!job_assignments_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('job_id', job.id)

      return {
        ...job,
        assignments: assignments || []
      }
    })
  )

  return jobsWithAssignments as JobWithRelations[]
}

export async function getJob(id: string): Promise<JobWithRelations | null> {
  const supabase = await createClient()

  // Get job with customer and site
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers!jobs_customer_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching job:', error)
    return null
  }

  // Get assignments separately
  const { data: assignments } = await supabase
    .from('job_assignments')
    .select(`
      id,
      role,
      user:users!job_assignments_user_id_fkey(
        id,
        full_name,
        email,
        role
      )
    `)
    .eq('job_id', id)

  return {
    ...job,
    assignments: assignments || []
  } as JobWithRelations
}

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  // Get current user to get company_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userProfile?.company_id) {
    throw new Error('User profile not found or company not set')
  }

  // Generate job number
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', userProfile.company_id)

  const jobNumber = `JOB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

  const evidenceCategoryId = formData.get('evidence_category_id') as string || null

  const jobData = {
    company_id: userProfile.company_id,
    customer_id: formData.get('customer_id') as string,
    site_id: formData.get('site_id') as string || null,
    job_number: jobNumber,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    scheduled_start: formData.get('scheduled_start') as string || null,
    scheduled_end: formData.get('scheduled_end') as string || null,
    status: formData.get('status') as string || 'scheduled',
    priority: formData.get('priority') as string || 'normal',
    job_type: formData.get('job_type') as string || 'installation',
    evidence_category_id: evidenceCategoryId || null,
    notes: formData.get('notes') as string || null,
    site_name: formData.get('site_name') as string || null,
    site_address_line1: formData.get('site_address_line1') as string || null,
    site_city: formData.get('site_city') as string || null,
    site_state: formData.get('site_state') as string || null,
    site_postcode: formData.get('site_postcode') as string || null,
    site_manager: formData.get('site_manager') as string || null,
    site_manager_phone: formData.get('site_manager_phone') as string || null,
    created_by: user.id,
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    throw new Error('Failed to create job')
  }

  // Fire webhook (non-blocking)
  fireWebhookEvent(userProfile.company_id, 'job.created', {
    job_id: data.id,
    job_number: data.job_number,
    title: data.title,
    status: data.status,
  }).catch(() => {})

  revalidatePath('/jobs')
  return data
}

export async function updateJob(id: string, formData: FormData) {
  const supabase = await createClient()

  const evidenceCategoryId = formData.get('evidence_category_id') as string || null

  const updates = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    scheduled_start: formData.get('scheduled_start') as string || null,
    scheduled_end: formData.get('scheduled_end') as string || null,
    status: formData.get('status') as string,
    priority: formData.get('priority') as string,
    job_type: formData.get('job_type') as string || 'installation',
    evidence_category_id: evidenceCategoryId || null,
    notes: formData.get('notes') as string || null,
    site_name: formData.get('site_name') as string || null,
    site_address_line1: formData.get('site_address_line1') as string || null,
    site_city: formData.get('site_city') as string || null,
    site_state: formData.get('site_state') as string || null,
    site_postcode: formData.get('site_postcode') as string || null,
    site_manager: formData.get('site_manager') as string || null,
    site_manager_phone: formData.get('site_manager_phone') as string || null,
  }

  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating job:', error)
    throw new Error('Failed to update job')
  }

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
}

export async function deleteJob(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting job:', error)
    throw new Error('Failed to delete job')
  }

  revalidatePath('/jobs')
}

export async function updateJobStatus(id: string, status: string) {
  const supabase = await createClient()

  const updates: any = { status }

  const { data: { user } } = await supabase.auth.getUser()
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user?.id
  }

  // Get job details for webhook payload before updating
  const { data: job } = await supabase
    .from('jobs')
    .select('company_id, job_number, title, status')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating job status:', error)
    throw new Error('Failed to update job status')
  }

  // Fire webhooks (non-blocking)
  if (job) {
    const payload = {
      job_id: id,
      job_number: job.job_number,
      title: job.title,
      previous_status: job.status,
      new_status: status,
    }

    fireWebhookEvent(job.company_id, 'job.status_changed', payload).catch(() => {})

    if (status === 'completed') {
      fireWebhookEvent(job.company_id, 'job.completed', payload).catch(() => {})
    }
  }

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
}

export async function getCustomers() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('company_id', userProfile?.company_id)
    .order('name')

  if (error) throw new Error('Failed to fetch customers')
  return data || []
}
