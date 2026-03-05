'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMaterials() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error('Failed to fetch materials')
  return data || []
}

export async function createMaterial(formData: {
  name: string
  unit: string
  unit_price: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('Company not found')

  const { error } = await supabase
    .from('materials')
    .insert({
      company_id: profile.company_id,
      name: formData.name,
      unit: formData.unit,
      unit_price: formData.unit_price,
    })

  if (error) throw new Error('Failed to create material')
  revalidatePath('/settings/materials')
}

export async function updateMaterial(id: string, formData: {
  name: string
  unit: string
  unit_price: number
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('materials')
    .update(formData)
    .eq('id', id)
  if (error) throw new Error('Failed to update material')
  revalidatePath('/settings/materials')
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('materials')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error('Failed to delete material')
  revalidatePath('/settings/materials')
}

export async function getJobMaterials(jobId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_materials')
    .select('*, logger:logged_by(full_name)')
    .eq('job_id', jobId)
    .order('logged_at', { ascending: false })
  if (error) throw new Error('Failed to fetch job materials')
  return data || []
}

export async function logJobMaterial(jobId: string, entries: Array<{
  material_id: string | null
  material_name: string
  unit: string
  unit_price: number
  quantity: number
  notes?: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('Company not found')

  const rows = entries.map(e => ({
    company_id: profile.company_id,
    job_id: jobId,
    material_id: e.material_id,
    material_name: e.material_name,
    unit: e.unit,
    unit_price: e.unit_price,
    quantity: e.quantity,
    notes: e.notes || null,
    logged_by: user.id,
  }))

  const { error } = await supabase.from('job_materials').insert(rows)
  if (error) {
    console.error('Log materials error:', JSON.stringify(error))
    throw new Error('Failed to log materials')
  }

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
}

export async function deleteJobMaterial(id: string, jobId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('job_materials')
    .delete()
    .eq('id', id)
  if (error) throw new Error('Failed to delete material entry')
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
}

export async function getJobCostSummary(jobId: string) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('started_at, completed_at')
    .eq('id', jobId)
    .single()

  const { data: materials } = await supabase
    .from('job_materials')
    .select('total_cost, quantity, unit, material_name')
    .eq('job_id', jobId)

  const materialTotal = (materials || []).reduce(
    (sum, m) => sum + Number(m.total_cost || 0), 0
  )

  let labourHours = 0
  if (job?.started_at && job?.completed_at) {
    const start = new Date(job.started_at)
    const end = new Date(job.completed_at)
    labourHours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10
  }

  return {
    materialTotal,
    labourHours,
    materials: materials || [],
  }
}

export async function seedMaterialsFromPack(companyId: string, packId: string) {
  const supabase = await createClient()

  const { data: pack } = await supabase
    .from('work_type_packs')
    .select('default_materials')
    .eq('id', packId)
    .single()

  if (!pack?.default_materials || !Array.isArray(pack.default_materials)) return

  const rows = (pack.default_materials as Array<{
    name: string
    unit: string
    unit_price: number
  }>).map(m => ({
    company_id: companyId,
    name: m.name,
    unit: m.unit,
    unit_price: m.unit_price,
  }))

  if (rows.length === 0) return

  await supabase.from('materials').insert(rows)
}