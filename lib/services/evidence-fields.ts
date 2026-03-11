import { createClient } from '@/lib/supabase/client'

export interface EvidenceField {
  id: string
  job_id: string
  label: string
  field_type: 'dropdown' | 'text' | 'structure_level'
  options: string[] | null
  required: boolean
  order_index: number
}

export async function getEvidenceFields(jobId: string): Promise<EvidenceField[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_evidence_fields')
    .select('*')
    .eq('job_id', jobId)
    .order('order_index')
  if (error) throw error
  return data || []
}

export async function createEvidenceField(
  jobId: string,
  companyId: string,
  label: string,
  fieldType: 'dropdown' | 'text' | 'structure_level',
  options: string[],
  required: boolean,
  orderIndex: number
): Promise<EvidenceField> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_evidence_fields')
    .insert({
      job_id: jobId,
      company_id: companyId,
      label,
      field_type: fieldType,
      options: fieldType === 'dropdown' ? options : null,
      required,
      order_index: orderIndex,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvidenceField(
  id: string,
  updates: Partial<Pick<EvidenceField, 'label' | 'field_type' | 'options' | 'required' | 'order_index'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_evidence_fields')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteEvidenceField(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_evidence_fields')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderEvidenceFields(
  fields: { id: string; order_index: number }[]
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    fields.map(f =>
      supabase
        .from('job_evidence_fields')
        .update({ order_index: f.order_index })
        .eq('id', f.id)
    )
  )
}