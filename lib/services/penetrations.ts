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
  company_id: string
  created_by: string
  field_values: Record<string, string>
  location_level: string | null
  location_room: string | null
  level_id: string | null
  room_id: string | null
  floorplan_x: number | null
  floorplan_y: number | null
  created_at: string
  updated_at: string
  photos: PenetrationPhoto[]
  creator?: { full_name: string | null }
}

export async function getPenetrations(jobId: string, roomId?: string): Promise<Penetration[]> {
  const supabase = createClient()
  let query = supabase
    .from('penetrations')
    .select(`
      *,
      creator:users!created_by(full_name),
      photos:penetration_photos(id, storage_path, caption, uploaded_at, uploaded_by)
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (roomId) {
    query = query.eq('room_id', roomId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Penetration[]
}

export async function getPenetrationCountsByRoom(jobId: string): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('penetrations')
    .select('room_id')
    .eq('job_id', jobId)
    .not('room_id', 'is', null)

  const counts: Record<string, number> = {}
  for (const row of (data || [])) {
    if (row.room_id) {
      counts[row.room_id] = (counts[row.room_id] || 0) + 1
    }
  }
  return counts
}

export async function createPenetration(
  jobId: string,
  companyId: string,
  createdBy: string,
  fieldValues: Record<string, string>,
  locationLevel?: string,
  locationRoom?: string,
  levelId?: string,
  roomId?: string,
  floorplanX?: number,
  floorplanY?: number,
): Promise<Penetration> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('penetrations')
    .insert({
      job_id: jobId,
      company_id: companyId,
      created_by: createdBy,
      field_values: fieldValues,
      location_level: locationLevel || null,
      location_room: locationRoom || null,
      level_id: levelId || null,
      room_id: roomId || null,
      floorplan_x: floorplanX ?? null,
      floorplan_y: floorplanY ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, photos: [] }
}

export async function updatePenetrationPin(
  penetrationId: string,
  floorplanX: number,
  floorplanY: number,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('penetrations')
    .update({ floorplan_x: floorplanX, floorplan_y: floorplanY })
    .eq('id', penetrationId)
  if (error) throw error
}

export async function deletePenetration(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('penetrations').delete().eq('id', id)
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
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${companyId}/${jobId}/penetrations/${penetrationId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError

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
  const { error } = await supabase.from('penetration_photos').delete().eq('id', id)
  if (error) throw error
}

export async function getPenetrationPhotoUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}