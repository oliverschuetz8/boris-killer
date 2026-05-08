'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Job, JobWithRelations } from '@/lib/types/database'
import { fireWebhookEvent } from '@/lib/services/webhooks'
import { fireEmailEvent } from '@/lib/services/email'

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
    .select(`
      *,
      customer:customers!jobs_customer_id_fkey(name)
    `)
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

  // Fire email (non-blocking)
  const customerForJob = Array.isArray(data.customer) ? data.customer[0] : data.customer
  const siteAddressBits = [
    data.site_address_line1,
    [data.site_city, data.site_state, data.site_postcode].filter(Boolean).join(' '),
  ].filter(Boolean) as string[]
  fireEmailEvent(userProfile.company_id, 'job.created', {
    job_id: data.id,
    job_number: data.job_number,
    title: data.title,
    customer_name: customerForJob?.name ?? null,
    scheduled_start: data.scheduled_start ?? null,
    site_address: siteAddressBits.length > 0 ? siteAddressBits.join(', ') : null,
  }).catch(() => {})

  revalidatePath('/jobs')
  return data
}

export async function updateJob(id: string, formData: FormData) {
  const supabase = await createClient()

  const evidenceCategoryId = formData.get('evidence_category_id') as string || null

  const recurrenceRaw = formData.get('recurrence_months') as string | null
  let recurrenceMonths: number | null = null
  if (recurrenceRaw && recurrenceRaw.trim()) {
    const parsed = parseInt(recurrenceRaw, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) recurrenceMonths = parsed
  }

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
    recurrence_months: recurrenceMonths,
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

  const [invoicesResult, jobTimeEntriesResult, timeEntriesResult] = await Promise.all([
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('job_id', id),
    supabase.from('job_time_entries').select('id', { count: 'exact', head: true }).eq('job_id', id),
    supabase.from('time_entries').select('id', { count: 'exact', head: true }).eq('job_id', id),
  ])

  const invoiceCount = invoicesResult.count ?? 0
  const timesheetCount = (jobTimeEntriesResult.count ?? 0) + (timeEntriesResult.count ?? 0)

  if (invoiceCount > 0 || timesheetCount > 0) {
    const blockers: string[] = []
    if (invoiceCount > 0) {
      blockers.push(`${invoiceCount} ${invoiceCount === 1 ? 'invoice' : 'invoices'}`)
    }
    if (timesheetCount > 0) {
      blockers.push(`${timesheetCount} ${timesheetCount === 1 ? 'timesheet entry' : 'timesheet entries'}`)
    }
    const blockersText = blockers.length === 1 ? blockers[0] : `${blockers.slice(0, -1).join(', ')} and ${blockers[blockers.length - 1]}`

    const fixSteps: string[] = []
    if (invoiceCount > 0) {
      fixSteps.push('cancel or delete the linked invoices on the Invoices page')
    }
    if (timesheetCount > 0) {
      fixSteps.push('reassign or remove the timesheet entries from Settings → Integrations')
    }

    throw new Error(
      `This job can't be deleted because it has ${blockersText} linked to it. ` +
      `To delete this job, first ${fixSteps.join(', then ')}, then try again.`
    )
  }

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting job:', error)
    throw new Error(`Couldn't delete this job: ${error.message}. If this keeps happening, contact support.`)
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

  // Get job details for webhook + email payload before updating
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      company_id, customer_id, job_number, title, description,
      status, priority, job_type,
      scheduled_start, scheduled_end,
      site_name, site_address_line1, site_city, site_state, site_postcode,
      site_manager, site_manager_phone,
      evidence_category_id, evidence_subcategory_id,
      recurrence_months, recurrence_spawned,
      customer:customers!jobs_customer_id_fkey(name)
    `)
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

  // Fire webhooks + emails (non-blocking)
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

      // Lookup name of user who completed it
      let completedByName: string | null = null
      if (user?.id) {
        const { data: actor } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single()
        completedByName = actor?.full_name ?? null
      }

      const customerForJob = Array.isArray((job as any).customer)
        ? (job as any).customer[0]
        : (job as any).customer

      fireEmailEvent(job.company_id, 'job.completed', {
        job_id: id,
        job_number: job.job_number,
        title: job.title,
        customer_name: customerForJob?.name ?? null,
        completed_by_name: completedByName,
        completed_at: updates.completed_at ?? new Date().toISOString(),
      }).catch(() => {})

      // Spawn next recurring draft if recurrence is set and not yet spawned
      if (job.recurrence_months && !job.recurrence_spawned) {
        try {
          await spawnRecurringDraft(supabase, id, job)
        } catch (err) {
          console.error('Failed to spawn recurring draft:', err)
        }
      }
    }
  }

  revalidatePath('/jobs')
  revalidatePath(`/jobs/${id}`)
}

async function spawnRecurringDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentJobId: string,
  parentJob: any,
): Promise<void> {
  const monthsToAdd: number = parentJob.recurrence_months
  if (!monthsToAdd) return

  const baseStart = parentJob.scheduled_start
    ? new Date(parentJob.scheduled_start)
    : new Date()
  const nextStart = new Date(baseStart)
  nextStart.setMonth(nextStart.getMonth() + monthsToAdd)

  let nextEnd: Date
  if (parentJob.scheduled_end) {
    const durationMs = new Date(parentJob.scheduled_end).getTime() - baseStart.getTime()
    nextEnd = new Date(nextStart.getTime() + Math.max(durationMs, 60 * 60 * 1000))
  } else {
    nextEnd = new Date(nextStart.getTime() + 2 * 60 * 60 * 1000)
  }

  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', parentJob.company_id)

  const jobNumber = `JOB-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`

  const { data: newJob, error } = await supabase
    .from('jobs')
    .insert({
      company_id: parentJob.company_id,
      customer_id: parentJob.customer_id,
      job_number: jobNumber,
      title: parentJob.title,
      description: parentJob.description,
      scheduled_start: nextStart.toISOString(),
      scheduled_end: nextEnd.toISOString(),
      status: 'draft',
      priority: parentJob.priority,
      job_type: parentJob.job_type,
      site_name: parentJob.site_name,
      site_address_line1: parentJob.site_address_line1,
      site_city: parentJob.site_city,
      site_state: parentJob.site_state,
      site_postcode: parentJob.site_postcode,
      site_manager: parentJob.site_manager,
      site_manager_phone: parentJob.site_manager_phone,
      evidence_category_id: parentJob.evidence_category_id,
      evidence_subcategory_id: parentJob.evidence_subcategory_id,
      parent_job_id: parentJobId,
      recurrence_months: parentJob.recurrence_months,
    })
    .select('id')
    .single()

  if (error || !newJob) throw new Error(`Failed to insert recurring draft: ${error?.message}`)

  await supabase
    .from('jobs')
    .update({ recurrence_spawned: true })
    .eq('id', parentJobId)

  fireWebhookEvent(parentJob.company_id, 'job.created', {
    job_id: newJob.id,
    job_number: jobNumber,
    title: parentJob.title,
    status: 'draft',
    parent_job_id: parentJobId,
  }).catch(() => {})
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
