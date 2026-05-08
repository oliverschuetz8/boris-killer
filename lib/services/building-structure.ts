import { createClient } from '@/lib/supabase/client'

// ---- Buildings ----

export async function getBuildings(siteId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels (
        id, name, order_index, drawing_prefix,
        rooms (
          id, name, planned_count, done_count, is_done
        )
      )
    `)
    .eq('site_id', siteId)
    .order('name')
  return data || []
}

export async function createBuilding(siteId: string, companyId: string, name: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('buildings')
    .insert({ site_id: siteId, company_id: companyId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBuilding(id: string) {
  const supabase = createClient()
  await supabase.from('buildings').delete().eq('id', id)
}

// ---- Levels ----

export async function createLevel(buildingId: string, companyId: string, name: string, orderIndex: number, drawingPrefix?: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('levels')
    .insert({
      building_id: buildingId,
      company_id: companyId,
      name,
      order_index: orderIndex,
      drawing_prefix: drawingPrefix || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLevelPrefix(levelId: string, prefix: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('levels')
    .update({ drawing_prefix: prefix || null })
    .eq('id', levelId)
  if (error) throw error
}

/** Get a level's drawing prefix (used by penetrations service when saving) */
export async function getLevelPrefix(levelId: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('levels')
    .select('drawing_prefix')
    .eq('id', levelId)
    .single()
  if (error || !data) return null
  return data.drawing_prefix || null
}

export async function deleteLevel(id: string) {
  const supabase = createClient()
  await supabase.from('levels').delete().eq('id', id)
}

// ---- Rooms ----

export async function createRoom(levelId: string, companyId: string, name: string, plannedCount: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rooms')
    .insert({ level_id: levelId, company_id: companyId, name, planned_count: plannedCount })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markRoomDone(roomId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('rooms').update({ is_done: true }).eq('id', roomId)
}

export async function markRoomUndone(roomId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('rooms').update({ is_done: false }).eq('id', roomId)
}

export async function deleteRoom(id: string) {
  const supabase = createClient()
  await supabase.from('rooms').delete().eq('id', id)
}

// ---- Flat room list for photo selector / location picker ----

export async function getRoomsForJob(siteId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels (
        id, name, order_index, drawing_prefix,
        rooms ( id, name, planned_count, done_count, is_done )
      )
    `)
    .eq('site_id', siteId)
    .order('name')
  return data || []
}
