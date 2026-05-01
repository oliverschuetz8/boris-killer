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
    .from('invoices')
    .select(`
      id, invoice_number, subtotal, tax_rate, tax_amount, total,
      status, issued_date, due_date, paid_date, notes,
      created_at, updated_at,
      customer:customers(id, name, email),
      job:jobs(id, job_number, title)
    `)
    .eq('company_id', company_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }

  return NextResponse.json({
    data: (data || []).map((inv: any) => ({
      ...inv,
      customer: Array.isArray(inv.customer) ? inv.customer[0] : inv.customer,
      job: Array.isArray(inv.job) ? inv.job[0] ?? null : inv.job,
    })),
  })
}
