import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getJob } from '@/app/actions/jobs'
import { getMaterials } from '@/lib/services/materials'
import { getParts } from '@/lib/services/parts'
import { getProducts } from '@/lib/services/products'
import { getPortalLinksForJob } from '@/lib/services/portal'
import JobDetailView from './job-detail-view'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'worker'
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager'

  const job = await getJob(id)
  if (!job) notFound()

  // Fetch category name if set
  let categoryName: string | null = null
  if (job.evidence_category_id) {
    const { data: cat } = await supabase
      .from('evidence_categories')
      .select('name')
      .eq('id', job.evidence_category_id)
      .single()
    categoryName = cat?.name || null
  }

  // Fetch setup data only for admin/manager (Setup tab)
  let setupData = undefined
  let portalLinks: any[] = []
  if (isAdminOrManager) {
    const [
      materials,
      parts,
      products,
      { data: evidenceFields },
      { data: materialDefaults },
      { data: companyWorkers },
      { data: initialAssignments },
      fetchedPortalLinks,
    ] = await Promise.all([
      getMaterials(),
      getParts(),
      getProducts(),
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
      getPortalLinksForJob(id),
    ])

    setupData = {
      materials: materials || [],
      parts: parts || [],
      products: products || [],
      evidenceFields: evidenceFields || [],
      materialDefaults: materialDefaults || [],
      companyWorkers: companyWorkers || [],
      assignments: (initialAssignments || []) as any,
    }
    portalLinks = fetchedPortalLinks || []
  }

  return (
    <JobDetailView
      job={job}
      userId={user.id}
      userRole={userRole}
      setupData={setupData}
      portalLinks={portalLinks}
      categoryName={categoryName}
    />
  )
}
