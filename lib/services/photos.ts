'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadJobPhoto(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const jobId = formData.get('job_id') as string
  const file = formData.get('photo') as File
  const level = (formData.get('level') as string)?.trim() || null
  const spaceType = (formData.get('space_type') as string)?.trim() || null
  const spaceIdentifier = (formData.get('space_identifier') as string)?.trim() || null
  const workType = (formData.get('work_type') as string)?.trim() || null
  const beforeAfter = formData.get('before_after') as string || null
  const caption = (formData.get('caption') as string)?.trim() || null

  if (!file || file.size === 0) throw new Error('No file provided')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('Company not found')

  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storagePath = `${profile.company_id}/${jobId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(storagePath, file, { contentType: file.type })

  if (uploadError) throw new Error('Failed to upload photo')

  // Normalized grouping key
  const spaceKey = spaceIdentifier
    ? `${(spaceType || '').toLowerCase().trim()}::${spaceIdentifier.toLowerCase().trim()}`
    : null

  const editDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

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
      level,
      space_type: spaceType,
      space_identifier: spaceIdentifier,
      space_key: spaceKey,
      work_type: workType,
      before_after: beforeAfter,
      caption,
      visible_to_customer: true,
      edit_deadline: editDeadline,
    })
    .select()
    .single()

  if (dbError) {
    console.error('DB Error:', JSON.stringify(dbError))
    throw new Error('Failed to save photo metadata')
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: 'photo.upload',
    entity_type: 'job_photo',
    entity_id: photo.id,
    metadata: { job_id: jobId, level, space_type: spaceType, space_identifier: spaceIdentifier },
  })

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
  return photo
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getJobPhotos(jobId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_photos')
    .select('*, uploader:uploaded_by(full_name)')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error('Failed to fetch photos')
  return data || []
}

export async function getPhotoUrl(storagePath: string) {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function getUsedIdentifiers(jobId: string, level: string, spaceType: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('job_photos')
    .select('space_identifier')
    .eq('job_id', jobId)
    .eq('level', level)
    .eq('space_type', spaceType)
    .is('deleted_at', null)
    .not('space_identifier', 'is', null)
  
  // Return unique identifiers preserving original casing
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of data || []) {
    const key = row.space_identifier.toLowerCase().trim()
    if (!seen.has(key)) {
      seen.add(key)
      result.push(row.space_identifier)
    }
  }
  return result
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function deleteJobPhoto(photoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const { data: photo } = await supabase
    .from('job_photos')
    .select('uploaded_by, edit_deadline, job_id, level, space_type, space_identifier, company_id')
    .eq('id', photoId)
    .single()

  if (!photo) throw new Error('Photo not found')

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager'
  const isOwner = photo.uploaded_by === user.id
  const withinWindow = photo.edit_deadline && new Date() < new Date(photo.edit_deadline)

  if (!isAdmin && !(isOwner && withinWindow)) {
    throw new Error('Not permitted to delete this photo')
  }

  const { error } = await supabase
    .from('job_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)

  if (error) throw new Error('Failed to delete photo')

  await supabase.from('audit_logs').insert({
    company_id: photo.company_id,
    user_id: user.id,
    action: 'photo.delete',
    entity_type: 'job_photo',
    entity_id: photoId,
    metadata: {
      job_id: photo.job_id,
      level: photo.level,
      space_type: photo.space_type,
      space_identifier: photo.space_identifier,
      deleted_by_role: userProfile?.role,
    },
  })

  revalidatePath(`/jobs/${photo.job_id}`)
  revalidatePath(`/jobs/${photo.job_id}/execute`)
}

// ─── Edit metadata ─────────────────────────────────────────────────────────────

export async function editPhotoMetadata(
  photoId: string,
  updates: {
    level?: string
    space_type?: string
    space_identifier?: string
    work_type?: string
    before_after?: string
    caption?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: photo } = await supabase
    .from('job_photos')
    .select('uploaded_by, edit_deadline, job_id, company_id, level, space_type, space_identifier, work_type, before_after, caption')
    .eq('id', photoId)
    .single()

  if (!photo) throw new Error('Photo not found')

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager'
  const isOwner = photo.uploaded_by === user.id
  const withinWindow = photo.edit_deadline && new Date() < new Date(photo.edit_deadline)

  if (!isAdmin && !(isOwner && withinWindow)) {
    throw new Error('Edit window has expired')
  }

  // Rebuild space_key if location changed
  const newSpaceType = updates.space_type ?? photo.space_type
  const newSpaceIdentifier = updates.space_identifier ?? photo.space_identifier
  const spaceKey = newSpaceIdentifier
    ? `${(newSpaceType || '').toLowerCase().trim()}::${newSpaceIdentifier.toLowerCase().trim()}`
    : null

  const { error } = await supabase
    .from('job_photos')
    .update({ ...updates, space_key: spaceKey })
    .eq('id', photoId)

  if (error) throw new Error('Failed to update photo')

  // Audit: log each changed field
  const changedFields: Record<string, { old: unknown; new: unknown }> = {}
  for (const [key, newVal] of Object.entries(updates)) {
    const oldVal = (photo as Record<string, unknown>)[key]
    if (oldVal !== newVal) changedFields[key] = { old: oldVal, new: newVal }
  }

  await supabase.from('audit_logs').insert({
    company_id: photo.company_id,
    user_id: user.id,
    action: 'photo.metadata_edit',
    entity_type: 'job_photo',
    entity_id: photoId,
    metadata: { job_id: photo.job_id, changes: changedFields },
  })

  revalidatePath(`/jobs/${photo.job_id}`)
  revalidatePath(`/jobs/${photo.job_id}/execute`)
}

// ─── Work types ───────────────────────────────────────────────────────────────

export async function getCompanyWorkTypes(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  console.log('User company_id:', profile?.company_id)

  if (!profile?.company_id) return []

  const { data: company } = await supabase
    .from('companies')
    .select('work_type_pack_id')
    .eq('id', profile.company_id)
    .single()

  console.log('Company pack id:', company?.work_type_pack_id)

  if (!company?.work_type_pack_id) {
    const { data: defaultPack } = await supabase
      .from('work_type_packs')
      .select('work_types')
      .eq('is_default', true)
      .single()
    return (defaultPack?.work_types as string[]) ?? []
  }

  const { data: pack } = await supabase
    .from('work_type_packs')
    .select('work_types')
    .eq('id', company.work_type_pack_id)
    .single()

  console.log('Pack work_types:', pack?.work_types)

  return (pack?.work_types as string[]) ?? []
}

export async function getPhotoById(photoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_photos')
    .select('*, uploader:uploaded_by(full_name)')
    .eq('id', photoId)
    .single()
  if (error) throw new Error('Photo not found')
  return data
}

export async function updatePhotoMetadata(
  photoId: string,
  updates: {
    level?: string
    space_type?: string
    space_identifier?: string
    work_type?: string
    before_after?: string
    caption?: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()

  const { data: photo } = await supabase
    .from('job_photos')
    .select('uploaded_by, edit_deadline, job_id, company_id')
    .eq('id', photoId).single()

  if (!photo) throw new Error('Photo not found')

  const isAdmin = ['admin', 'manager'].includes(userProfile?.role)
  const isOwner = photo.uploaded_by === user.id
  const withinWindow = photo.edit_deadline && new Date() < new Date(photo.edit_deadline)

  if (!isAdmin && !(isOwner && withinWindow)) throw new Error('Edit window expired')

  const newSpaceType = updates.space_type
  const newSpaceIdentifier = updates.space_identifier
  const spaceKey = newSpaceIdentifier
    ? `${(newSpaceType || '').toLowerCase().trim()}::${newSpaceIdentifier.toLowerCase().trim()}`
    : undefined

  const { error } = await supabase
    .from('job_photos')
    .update({ ...updates, ...(spaceKey ? { space_key: spaceKey } : {}) })
    .eq('id', photoId)

  if (error) throw new Error('Failed to update photo')

  await supabase.from('audit_logs').insert({
    company_id: photo.company_id,
    user_id: user.id,
    action: 'photo.metadata_edit',
    entity_type: 'job_photo',
    entity_id: photoId,
    metadata: { job_id: photo.job_id, changes: updates },
  })

  revalidatePath(`/jobs/${photo.job_id}`)
  revalidatePath(`/jobs/${photo.job_id}/execute`)
}

export async function getJobSettings(jobId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('job_settings')
    .eq('id', jobId)
    .single()
  return (data?.job_settings || {}) as {
    required_photo_fields?: string[]
    allowed_space_types?: string[]
  }
}