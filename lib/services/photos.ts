'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadJobPhoto(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const jobId = formData.get('job_id') as string
  const file = formData.get('photo') as File
  const areaLocation = formData.get('area_location') as string
  const workType = formData.get('work_type') as string
  const beforeAfter = formData.get('before_after') as string
  const caption = formData.get('caption') as string || null

  if (!file || file.size === 0) throw new Error('No file provided')

  // Build storage path: company/job/timestamp-filename
  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('Company not found')

  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storagePath = `${profile.company_id}/${jobId}/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(storagePath, file, { contentType: file.type })

  if (uploadError) throw new Error('Failed to upload photo')

  // Save metadata to database
  const { data: photo, error: dbError } = await supabase
    .from('job_photos')
    .insert({
      company_id: profile.company_id,
      job_id: jobId,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      area_location: areaLocation || null,
      work_type: workType || null,
      before_after: beforeAfter || null,
      caption,
      visible_to_customer: true,
    })
    .select()
    .single()

  if (dbError) {
    console.error('DB Error:', JSON.stringify(dbError))
    throw new Error('Failed to save photo metadata')
  }

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
  return photo
}

export async function getJobPhotos(jobId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error('Failed to fetch photos')
  return data || []
}

export async function getPhotoUrl(storagePath: string) {
  const supabase = await createClient()

  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600) // 1 hour expiry

  return data?.signedUrl ?? null
}