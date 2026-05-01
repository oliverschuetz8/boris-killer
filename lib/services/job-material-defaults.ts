import { createClient } from '@/lib/supabase/client'

export interface JobMaterialDefault {
  id: string
  job_id: string
  material_id: string | null
  part_id: string | null
  product_id: string | null
  material_name_override: string | null
  seal_id: string | null
  manufacturer: string | null
  system_product: string | null
  extra_details: Record<string, string>
  material?: {
    id: string
    name: string
    unit: string | null
    unit_price: number | null
  }
  part?: {
    id: string
    name: string
    unit: string
    sell_price: number | null
  }
  product?: {
    id: string
    name: string
    total_sell_price: number | null
  }
}

export async function getJobMaterialDefaults(jobId: string): Promise<JobMaterialDefault[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_material_defaults')
    .select(`
      *,
      material:materials(id, name, unit, unit_price),
      part:parts(id, name, unit, sell_price),
      product:products(id, name, total_sell_price)
    `)
    .eq('job_id', jobId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function upsertJobMaterialDefault(
  jobId: string,
  companyId: string,
  materialId: string | null,
  materialNameOverride: string | null,
  details: {
    seal_id?: string
    manufacturer?: string
    system_product?: string
    part_id?: string | null
    product_id?: string | null
  }
): Promise<JobMaterialDefault> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_material_defaults')
    .insert({
      job_id: jobId,
      company_id: companyId,
      material_id: materialId || null,
      material_name_override: materialNameOverride || null,
      part_id: details.part_id || null,
      product_id: details.product_id || null,
      seal_id: details.seal_id || null,
      manufacturer: details.manufacturer || null,
      system_product: details.system_product || null,
    })
    .select(`
      *,
      material:materials(id, name, unit, unit_price),
      part:parts(id, name, unit, sell_price),
      product:products(id, name, total_sell_price)
    `)
    .single()
  if (error) throw error
  return data
}

export async function deleteJobMaterialDefault(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_material_defaults')
    .delete()
    .eq('id', id)
  if (error) throw error
}
