import { createClient } from '@/lib/supabase/client'

// ---- Buildings ----

export async function getBuildings(siteId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels (
        id, name, order_index,
        rooms (
          id, name, planned_count, done_count
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

export async function createLevel(buildingId: string, companyId: string, name: string, orderIndex: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('levels')
    .insert({ building_id: buildingId, company_id: companyId, name, order_index: orderIndex })
    .select()
    .single()
  if (error) throw error
  return data
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

export async function markRoomDone(roomId: string, plannedCount: number) {
  const supabase = createClient()
  await supabase
    .from('rooms')
    .update({ done_count: plannedCount })
    .eq('id', roomId)
}

export async function markRoomUndone(roomId: string) {
  const supabase = createClient()
  await supabase
    .from('rooms')
    .update({ done_count: 0 })
    .eq('id', roomId)
}

export async function deleteRoom(id: string) {
  const supabase = createClient()
  await supabase.from('rooms').delete().eq('id', id)
}

// ---- Flat room list for photo selector ----

export async function getRoomsForJob(siteId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels (
        id, name, order_index,
        rooms ( id, name, planned_count, done_count )
      )
    `)
    .eq('site_id', siteId)
    .order('name')
  return data || []
}