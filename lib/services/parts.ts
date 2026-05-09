'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Part {
  id: string
  company_id: string
  name: string
  subcategory: string | null
  unit: string
  buy_cost: number | null
  sell_price: number | null
  margin: number | null
  supplier: string | null
  part_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getParts(): Promise<Part[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error("Couldn't load parts. Refresh the page or check your connection.")
  return data || []
}

export async function getPartById(id: string): Promise<Part | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createPart(formData: {
  name: string
  subcategory?: string
  unit: string
  buy_cost?: number | null
  sell_price?: number | null
  margin?: number | null
  supplier?: string
  part_number?: string
}): Promise<Part> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error("We couldn't find your company. Refresh the page or contact support if this keeps happening.")

  const { data, error } = await supabase
    .from('parts')
    .insert({
      company_id: profile.company_id,
      name: formData.name,
      subcategory: formData.subcategory || null,
      unit: formData.unit,
      buy_cost: formData.buy_cost ?? null,
      sell_price: formData.sell_price ?? null,
      margin: formData.margin ?? null,
      supplier: formData.supplier || null,
      part_number: formData.part_number || null,
    })
    .select('*')
    .single()

  if (error) throw new Error("Couldn't create the part. Check the form and try again.")
  revalidatePath('/settings/parts')
  return data
}

export async function updatePart(id: string, formData: {
  name?: string
  subcategory?: string | null
  unit?: string
  buy_cost?: number | null
  sell_price?: number | null
  margin?: number | null
  supplier?: string | null
  part_number?: string | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('parts')
    .update(formData)
    .eq('id', id)
  if (error) throw new Error("Couldn't save changes to the part. Try again or refresh the page.")
  revalidatePath('/settings/parts')
}

export async function deletePart(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('parts')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error("Couldn't delete the part. It may be linked to products or jobs — remove those first, then try again.")
  revalidatePath('/settings/parts')
}

export async function bulkUpdateParts(
  ids: string[],
  updates: {
    margin?: number | null
    sell_price?: number | null
    supplier?: string | null
  }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('parts')
    .update(updates)
    .in('id', ids)
  if (error) throw new Error("Couldn't bulk-update the parts. Try again or refresh the page.")
  revalidatePath('/settings/parts')
}

export async function getDistinctSubcategories(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('subcategory')
    .eq('is_active', true)
    .not('subcategory', 'is', null)
    .order('subcategory')
  if (error) return []
  const unique = [...new Set((data || []).map(d => d.subcategory).filter(Boolean))] as string[]
  return unique
}

export async function getDistinctSuppliers(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('parts')
    .select('supplier')
    .eq('is_active', true)
    .not('supplier', 'is', null)
    .order('supplier')
  if (error) return []
  const unique = [...new Set((data || []).map(d => d.supplier).filter(Boolean))] as string[]
  return unique
}

export async function getSimilarPartNames(query: string): Promise<string[]> {
  if (!query || query.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('parts')
    .select('name')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(5)
  return (data || []).map(d => d.name)
}

export async function migrateOldMaterialsToParts(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error("We couldn't find your company. Refresh the page or contact support if this keeps happening.")

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)

  if (!materials || materials.length === 0) return 0

  const rows = materials.map((m: any) => ({
    company_id: profile.company_id,
    name: m.name,
    unit: m.unit || 'each',
    sell_price: m.unit_price ?? null,
    buy_cost: null,
    margin: null,
    supplier: null,
    part_number: null,
    is_active: true,
  }))

  const { error } = await supabase.from('parts').insert(rows)
  if (error) throw new Error("Couldn't import materials to parts. Try again or refresh the page.")

  revalidatePath('/settings/parts')
  return rows.length
}
