import { createClient } from '@/lib/supabase/client'

export interface PenetrationPhoto {
  id: string
  storage_path: string
  caption: string | null
  uploaded_at: string
  uploaded_by: string
}

export interface Penetration {
  id: string
  job_id: string
  created_by: string
  field_values: Record<string, string>
  floorplan_x: number | null
  floorplan_y: number | null
  created_at: string
  updated_at: string
  photos: PenetrationPhoto[]
  creator?: { full_name: string | null }
}

export async function getPenetrations(jobId: string): Promise<Penetration[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('penetrations')
    .select(`
      *,
      creator:users!created_by(full_name),
      photos:penetration_photos(
        id, storage_path, caption, uploaded_at, uploaded_by
      )
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Penetration[]
}

export async function createPenetration(
  jobId: string,
  companyId: string,
  createdBy: string,
  fieldValues: Record<string, string>
): Promise<Penetration> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('penetrations')
    .insert({
      job_id: jobId,
      company_id: companyId,
      created_by: createdBy,
      field_values: fieldValues,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, photos: [] }
}

export async function deletePenetration(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('penetrations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function uploadPenetrationPhoto(
  penetrationId: string,
  jobId: string,
  companyId: string,
  uploadedBy: string,
  file: File,
  caption?: string
): Promise<PenetrationPhoto> {
  const supabase = createClient()

  // Upload file to storage
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${companyId}/${jobId}/penetrations/${penetrationId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError

  // Insert photo record
  const { data, error } = await supabase
    .from('penetration_photos')
    .insert({
      penetration_id: penetrationId,
      job_id: jobId,
      company_id: companyId,
      uploaded_by: uploadedBy,
      storage_path: path,
      caption: caption || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePenetrationPhoto(id: string, storagePath: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from('job-photos').remove([storagePath])
  const { error } = await supabase
    .from('penetration_photos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getPenetrationPhotoUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}