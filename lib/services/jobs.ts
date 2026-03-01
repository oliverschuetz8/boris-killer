'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startJob(jobId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) throw new Error('Failed to start job')

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
  revalidatePath('/jobs')
}

export async function completeJob(jobId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq('id', jobId)

  if (error) throw new Error('Failed to complete job')

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
  revalidatePath('/jobs')
}