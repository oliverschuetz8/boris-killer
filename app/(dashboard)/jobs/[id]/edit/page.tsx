import { notFound } from 'next/navigation'
import { getJob, getCustomers } from '@/app/actions/jobs'
import { getMaterials } from '@/lib/services/materials'
import { createClient } from '@/lib/supabase/server'
import JobEditForm from './job-edit-form'

export default async function JobEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [job, customers, materials] = await Promise.all([
    getJob(id),
    getCustomers(),
    getMaterials(),
  ])

  if (!job) notFound()

  const { data: evidenceFields } = await supabase
    .from('job_evidence_fields')
    .select('*')
    .eq('job_id', id)
    .order('order_index')

  const { data: materialDefaults } = await supabase
    .from('job_material_defaults')
    .select('*, material:materials(id, name, unit, unit_price)')
    .eq('job_id', id)
    .order('created_at')

  return (
    <JobEditForm
      job={job}
      customers={customers}
      materials={materials}
      initialEvidenceFields={evidenceFields || []}
      initialMaterialDefaults={materialDefaults || []}
    />
  )
}