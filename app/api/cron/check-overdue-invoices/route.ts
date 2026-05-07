import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fireEmailEvent } from '@/lib/services/email'
import { fireWebhookEvent } from '@/lib/services/webhooks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Daily cron: marks sent invoices as overdue past their due_date and fires the
 * invoice.overdue email + webhook for each.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET}.
 * Vercel Cron sends this header automatically when configured in vercel.json.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: invoices, error } = await admin
    .from('invoices')
    .select(`
      id, company_id, invoice_number, total, issued_date, due_date, status,
      customer:customers(name, email),
      job:jobs(job_number)
    `)
    .eq('status', 'sent')
    .lt('due_date', today)

  if (error) {
    return NextResponse.json({ error: `Query failed: ${error.message}` }, { status: 500 })
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ checked: 0, marked: 0, emailed: 0 })
  }

  const ids = invoices.map(i => i.id)
  const { error: updateError } = await admin
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 })
  }

  let emailed = 0
  for (const inv of invoices) {
    const customer = Array.isArray((inv as any).customer)
      ? (inv as any).customer[0]
      : (inv as any).customer

    const dueDate = inv.due_date ? new Date(inv.due_date) : null
    const daysOverdue = dueDate
      ? Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1

    fireWebhookEvent(inv.company_id, 'invoice.overdue', {
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      previous_status: 'sent',
      new_status: 'overdue',
      total: inv.total,
    }).catch(() => {})

    fireEmailEvent(inv.company_id, 'invoice.overdue', {
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      customer_name: customer?.name ?? null,
      customer_email: customer?.email ?? null,
      total_amount: inv.total,
      due_date: inv.due_date,
      days_overdue: daysOverdue,
    }).catch(() => {})

    emailed += 1
  }

  return NextResponse.json({
    checked: invoices.length,
    marked: invoices.length,
    emailed,
  })
}
