import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/services/api-keys'

export async function GET(request: NextRequest) {
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

  // Optional status filter
  const status = request.nextUrl.searchParams.get('status')

  let query = admin
    .from('jobs')
    .select(`
      id, job_number, title, description, status, priority, job_type,
      scheduled_start, scheduled_end, actual_start, actual_end,
      completed_at, created_at, updated_at,
      site_name, site_address_line1, site_city, site_state, site_postcode,
      customer:customers!jobs_customer_id_fkey(id, name, email)
    `)
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  return NextResponse.json({
    data: (data || []).map((job: any) => ({
      ...job,
      customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    })),
  })
}
