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

  const { data: invoice, error } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, subtotal, tax_rate, tax_amount, total,
      status, issued_date, due_date, paid_date, payment_method, payment_reference,
      notes, created_at, updated_at,
      customer:customers(id, name, email, phone),
      job:jobs(id, job_number, title),
      invoice_line_items(id, description, quantity, unit_price, amount, line_type)
    `)
    .eq('id', id)
    .eq('company_id', company_id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      ...invoice,
      customer: Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer,
      job: Array.isArray(invoice.job) ? invoice.job[0] ?? null : invoice.job,
    },
  })
}
