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

    const [
      { data: evidenceFields },
      { data: materialDefaults },
      { data: companyWorkers },
      { data: initialAssignments },
    ] = await Promise.all([
    supabase
      .from('job_evidence_fields')
      .select('*')
      .eq('job_id', id)
      .order('order_index'),
    supabase
      .from('job_material_defaults')
      .select('*, material:materials(id, name, unit, unit_price)')
      .eq('job_id', id)
      .order('created_at'),
      supabase
      .from('users')
      .select('id, full_name, email, role, trade')
      .eq('company_id', job.company_id)
      .in('role', ['worker', 'manager'])
      .order('full_name'),
    supabase
      .from('job_assignments')
      .select(`
        id, job_id, user_id, company_id, role, assigned_at,
        user:users!job_assignments_user_id_fkey(
          id, full_name, email, role, trade
        )
      `)
      .eq('job_id', id)
      .order('assigned_at'),
  ])

  return (
    <JobEditForm
      job={job}
      customers={customers}
      materials={materials}
      initialEvidenceFields={evidenceFields || []}
      initialMaterialDefaults={materialDefaults || []}
      companyWorkers={companyWorkers || []}
      initialAssignments={(initialAssignments || []) as any}
    />
  )
}