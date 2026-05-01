import { createClient } from '@/lib/supabase/client'

export interface RoomMaterial {
  id: string
  job_id: string
  room_id: string
  level_id: string
  company_id: string
  material_id: string | null
  part_id: string | null
  product_id: string | null
  material_name_override: string | null
  quantity: number
  notes: string | null
  logged_by: string | null
  created_at: string
  material?: { id: string; name: string; unit: string | null }
  part?: { id: string; name: string; unit: string }
  product?: { id: string; name: string }
}

export async function getRoomMaterials(roomId: string): Promise<RoomMaterial[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('room_materials')
    .select(`
      *,
      material:materials(id, name, unit),
      part:parts(id, name, unit),
      product:products(id, name)
    `)
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
  partId: string | null
  productId: string | null
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
      part_id: params.partId || null,
      product_id: params.productId || null,
      material_name_override: params.materialNameOverride || null,
      quantity: params.quantity,
      notes: params.notes || null,
    })
    .select(`
      *,
      material:materials(id, name, unit),
      part:parts(id, name, unit),
      product:products(id, name)
    `)
    .single()
  if (error) throw error
  return data
}

export async function deleteRoomMaterial(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('room_materials').delete().eq('id', id)
  if (error) throw error
}
