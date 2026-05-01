import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/services/api-keys'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Authenticate via API key
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
  }

  const apiKey = authHeader.substring(7)
  const validation = await validateApiKey(apiKey)
  if (!validation) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { company_id } = validation
  const admin = createAdminClient()

  const { data: job, error } = await admin
    .from('jobs')
    .select(`
      id, job_number, title, description, status, priority, job_type,
      scheduled_start, scheduled_end, actual_start, actual_end,
      completed_at, created_at, updated_at, notes,
      site_name, site_address_line1, site_city, site_state, site_postcode,
      site_manager, site_manager_phone,
      customer:customers!jobs_customer_id_fkey(id, name, email, phone)
    `)
    .eq('id', id)
    .eq('company_id', company_id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Get assignments
  const { data: assignments } = await admin
    .from('job_assignments')
    .select(`
      id, role,
      user:users!job_assignments_user_id_fkey(id, full_name, email, role)
    `)
    .eq('job_id', id)
    .eq('company_id', company_id)

  return NextResponse.json({
    data: {
      ...job,
      customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
      assignments: (assignments || []).map((a: any) => ({
        ...a,
        user: Array.isArray(a.user) ? a.user[0] : a.user,
      })),
    },
  })
}
