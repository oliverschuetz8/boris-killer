import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────

export interface EvidenceCategory {
  id: string
  company_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface EvidenceSubcategory {
  id: string
  company_id: string
  category_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface EvidenceTemplateField {
  id: string
  company_id: string
  subcategory_id: string
  label: string
  field_type: 'text' | 'dropdown' | 'structure_level'
  options: string[] | null
  required: boolean
  sort_order: number
  default_value: string | null
  created_at: string
}

// ─── Categories ──────────────────────────────────────────────

export async function getEvidenceCategories(): Promise<EvidenceCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function createEvidenceCategory(
  companyId: string,
  name: string,
  sortOrder: number,
): Promise<EvidenceCategory> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_categories')
    .insert({ company_id: companyId, name, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvidenceCategory(
  id: string,
  updates: Partial<Pick<EvidenceCategory, 'name' | 'sort_order'>>,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_categories')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteEvidenceCategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Subcategories ───────────────────────────────────────────

export async function getEvidenceSubcategories(
  categoryId?: string,
): Promise<EvidenceSubcategory[]> {
  const supabase = createClient()
  let query = supabase
    .from('evidence_subcategories')
    .select('*')
    .order('sort_order')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createEvidenceSubcategory(
  companyId: string,
  categoryId: string,
  name: string,
  sortOrder: number,
): Promise<EvidenceSubcategory> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_subcategories')
    .insert({ company_id: companyId, category_id: categoryId, name, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvidenceSubcategory(
  id: string,
  updates: Partial<Pick<EvidenceSubcategory, 'name' | 'sort_order'>>,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_subcategories')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteEvidenceSubcategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_subcategories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Template Fields ─────────────────────────────────────────

export async function getTemplateFields(
  subcategoryId: string,
): Promise<EvidenceTemplateField[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_template_fields')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function createTemplateField(
  companyId: string,
  subcategoryId: string,
  label: string,
  fieldType: 'text' | 'dropdown' | 'structure_level',
  options: string[],
  required: boolean,
  sortOrder: number,
  defaultValue?: string | null,
): Promise<EvidenceTemplateField> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_template_fields')
    .insert({
      company_id: companyId,
      subcategory_id: subcategoryId,
      label,
      field_type: fieldType,
      options: fieldType === 'dropdown' ? options : null,
      required,
      sort_order: sortOrder,
      default_value: defaultValue || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplateField(
  id: string,
  updates: Partial<Pick<EvidenceTemplateField, 'label' | 'field_type' | 'options' | 'required' | 'sort_order' | 'default_value'>>,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_template_fields')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteTemplateField(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('evidence_template_fields')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function reorderTemplateFields(
  fields: { id: string; sort_order: number }[],
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    fields.map(f =>
      supabase
        .from('evidence_template_fields')
        .update({ sort_order: f.sort_order })
        .eq('id', f.id)
    )
  )
}

// ─── Clone template fields into job_evidence_fields ──────────

export async function cloneTemplateFieldsToJob(
  jobId: string,
  companyId: string,
  subcategoryId: string,
): Promise<void> {
  const templateFields = await getTemplateFields(subcategoryId)
  if (templateFields.length === 0) return

  const supabase = createClient()
  const rows = templateFields.map(tf => ({
    job_id: jobId,
    company_id: companyId,
    label: tf.label,
    field_type: tf.field_type,
    options: tf.options,
    required: tf.required,
    order_index: tf.sort_order,
    default_value: tf.default_value,
    template_field_id: tf.id,
  }))

  const { error } = await supabase
    .from('job_evidence_fields')
    .insert(rows)
  if (error) throw error
}

// ─── Replace template fields on subcategory change ───────────

export async function replaceTemplateFieldsOnJob(
  jobId: string,
  companyId: string,
  newSubcategoryId: string,
): Promise<void> {
  const supabase = createClient()

  // Delete existing template-sourced fields (keep custom ones)
  const { error: delError } = await supabase
    .from('job_evidence_fields')
    .delete()
    .eq('job_id', jobId)
    .not('template_field_id', 'is', null)
  if (delError) throw delError

  // Get remaining custom fields to figure out max order_index
  const { data: remaining } = await supabase
    .from('job_evidence_fields')
    .select('order_index')
    .eq('job_id', jobId)
    .order('order_index', { ascending: false })
    .limit(1)

  const startIndex = remaining && remaining.length > 0 ? remaining[0].order_index + 1 : 0

  // Clone new template fields
  const templateFields = await getTemplateFields(newSubcategoryId)
  if (templateFields.length === 0) return

  const rows = templateFields.map((tf, i) => ({
    job_id: jobId,
    company_id: companyId,
    label: tf.label,
    field_type: tf.field_type,
    options: tf.options,
    required: tf.required,
    order_index: startIndex + i,
    default_value: tf.default_value,
    template_field_id: tf.id,
  }))

  const { error: insError } = await supabase
    .from('job_evidence_fields')
    .insert(rows)
  if (insError) throw insError
}
