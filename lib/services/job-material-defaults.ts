import { createClient } from '@/lib/supabase/client'

export interface JobMaterialDefault {
  id: string
  job_id: string
  material_id: string
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
}

export async function getJobMaterialDefaults(jobId: string): Promise<JobMaterialDefault[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_material_defaults')
    .select(`
      *,
      material:materials(id, name, unit, unit_price)
    `)
    .eq('job_id', jobId)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function upsertJobMaterialDefault(
  jobId: string,
  companyId: string,
  materialId: string,
  details: {
    seal_id?: string
    manufacturer?: string
    system_product?: string
  }
): Promise<JobMaterialDefault> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_material_defaults')
    .upsert(
      {
        job_id: jobId,
        company_id: companyId,
        material_id: materialId,
        seal_id: details.seal_id || null,
        manufacturer: details.manufacturer || null,
        system_product: details.system_product || null,
      },
      { onConflict: 'job_id,material_id' }
    )
    .select(`*, material:materials(id, name, unit, unit_price)`)
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