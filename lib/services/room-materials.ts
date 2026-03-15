import { createClient } from '@/lib/supabase/client'

export interface RoomMaterial {
  id: string
  job_id: string
  room_id: string
  level_id: string
  company_id: string
  material_id: string | null
  material_name_override: string | null
  quantity: number
  notes: string | null
  logged_by: string | null
  created_at: string
  material?: { id: string; name: string; unit: string | null }
}

export async function getRoomMaterials(roomId: string): Promise<RoomMaterial[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('room_materials')
    .select('*, material:materials(id, name, unit)')
    .eq('room_id', roomId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function addRoomMaterial(params: {
  jobId: string
  roomId: string
  levelId: string
  companyId: string
  loggedBy: string
  materialId: string | null
  materialNameOverride: string | null
  quantity: number
  notes?: string
}): Promise<RoomMaterial> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('room_materials')
    .insert({
      job_id: params.jobId,
      room_id: params.roomId,
      level_id: params.levelId,
      company_id: params.companyId,
      logged_by: params.loggedBy,
      material_id: params.materialId || null,
      material_name_override: params.materialNameOverride || null,
      quantity: params.quantity,
      notes: params.notes || null,
    })
    .select('*, material:materials(id, name, unit)')
    .single()
  if (error) throw error
  return data
}

export async function deleteRoomMaterial(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('room_materials').delete().eq('id', id)
  if (error) throw error
}