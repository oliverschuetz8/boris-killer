import { createClient } from '@/lib/supabase/client'

export interface LevelDrawing {
  id: string
  company_id: string
  level_id: string
  file_url: string
  file_name: string
  uploaded_by: string
  created_at: string
}

// ---- Fetch drawings for a level ----

export async function getLevelDrawings(levelId: string): Promise<LevelDrawing[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('level_drawings')
    .select('*')
    .eq('level_id', levelId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ---- Fetch drawings for multiple levels (batch for structure view) ----

export async function getDrawingsForJob(siteId: string): Promise<Record<string, LevelDrawing[]>> {
  const supabase = createClient()

  // First get all level IDs for this job's buildings
  const { data: buildings } = await supabase
    .from('buildings')
    .select('levels(id)')
    .eq('site_id', siteId)

  const levelIds: string[] = []
  for (const b of buildings || []) {
    for (const l of (b as any).levels || []) {
      levelIds.push(l.id)
    }
  }

  if (levelIds.length === 0) return {}

  const { data, error } = await supabase
    .from('level_drawings')
    .select('*')
    .in('level_id', levelIds)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Group by level_id
  const grouped: Record<string, LevelDrawing[]> = {}
  for (const drawing of data || []) {
    if (!grouped[drawing.level_id]) grouped[drawing.level_id] = []
    grouped[drawing.level_id].push(drawing)
  }
  return grouped
}

// ---- Upload a drawing ----

export async function uploadLevelDrawing(
  levelId: string,
  companyId: string,
  jobId: string,
  uploadedBy: string,
  file: File
): Promise<LevelDrawing> {
  const supabase = createClient()

  const ext = file.name.split('.').pop() || 'png'
  const storagePath = `${companyId}/${jobId}/drawings/${levelId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) throw new Error(`Failed to upload drawing: ${uploadError.message}`)

  const { data, error } = await supabase
    .from('level_drawings')
    .insert({
      company_id: companyId,
      level_id: levelId,
      file_url: storagePath,
      file_name: file.name,
      uploaded_by: uploadedBy,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save drawing: ${error.message}`)
  return data
}

// ---- Delete a drawing ----

export async function deleteLevelDrawing(id: string, storagePath: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from('job-photos').remove([storagePath])
  const { error } = await supabase.from('level_drawings').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete drawing: ${error.message}`)
}

// ---- Get signed URL for a drawing ----

export async function getDrawingUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}
