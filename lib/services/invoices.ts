'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fireWebhookEvent } from '@/lib/services/webhooks'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  company_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  line_type: 'material' | 'labour' | 'custom'
  created_at: string
}

export interface Invoice {
  id: string
  company_id: string
  customer_id: string
  job_id: string | null
  invoice_number: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issued_date: string
  due_date: string | null
  paid_date: string | null
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  customer?: { name: string; email: string | null; phone: string | null }
  job?: { title: string; job_number: string } | null
  invoice_line_items?: InvoiceLineItem[]
}

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('Company not found')

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, email, phone),
      job:jobs(title, job_number)
    `)
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`)

  return (data || []).map((inv: any) => ({
    ...inv,
    customer: Array.isArray(inv.customer) ? inv.customer[0] : inv.customer,
    job: Array.isArray(inv.job) ? inv.job[0] ?? null : inv.job,
  }))
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, email, phone),
      job:jobs(title, job_number),
      invoice_line_items(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    ...data,
    customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
    job: Array.isArray(data.job) ? data.job[0] ?? null : data.job,
  } as Invoice
}

async function generateInvoiceNumber(supabase: any, companyId: string): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const seq = String((count || 0) + 1).padStart(3, '0')
  return `INV-${year}-${seq}`
}

export async function createInvoiceFromJob(
  jobId: string,
  taxRate: number = 10
): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  // Fetch job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, customer_id, company_id, title, job_number')
    .eq('id', jobId)
    .single()
  if (jobError || !job) throw new Error('Job not found')

  // Fetch materials from room_materials
  const { data: materials } = await supabase
    .from('room_materials')
    .select(`
      quantity, notes,
      material:materials(name, unit, unit_price),
      material_name_override
    `)
    .eq('job_id', jobId)

  const invoiceNumber = await generateInvoiceNumber(supabase, profile.company_id)

  // Build material line items
  const materialLines = (materials || []).map((m: any) => {
    const name = m.material?.name ?? m.material_name_override ?? 'Material'
    const unitPrice = Number(m.material?.unit_price ?? 0)
    const qty = Number(m.quantity ?? 1)
    return {
      description: name,
      quantity: qty,
      unit_price: unitPrice,
      amount: Math.round(qty * unitPrice * 100) / 100,
      line_type: 'material' as const,
    }
  })

  // Labour lines from Xero time entries assigned to this job
  // Uses the worker's labour rate part sell_price for invoicing (not the buy_cost/Xero rate)
  const { data: timeEntries } = await supabase
    .from('job_time_entries')
    .select(`
      id, employee_name, hours, user_id,
      user:users(id, full_name, labour_rate_part_id)
    `)
    .eq('job_id', jobId)
    .eq('status', 'assigned')

  const labourLines: { description: string; quantity: number; unit_price: number; amount: number; line_type: 'labour' }[] = []

  for (const entry of timeEntries || []) {
    const user = Array.isArray(entry.user) ? entry.user[0] : entry.user
    let sellRate = 0

    // If worker has a labour rate part, use its sell_price for the invoice
    if (user?.labour_rate_part_id) {
      const { data: labourPart } = await supabase
        .from('parts')
        .select('sell_price')
        .eq('id', user.labour_rate_part_id)
        .single()
      sellRate = Number(labourPart?.sell_price || 0)
    }

    const hrs = Number(entry.hours || 0)
    labourLines.push({
      description: `Labour — ${entry.employee_name}`,
      quantity: hrs,
      unit_price: sellRate,
      amount: Math.round(hrs * sellRate * 100) / 100,
      line_type: 'labour' as const,
    })
  }

  const allLines = [...materialLines, ...labourLines]
  const subtotal = allLines.reduce((s, l) => s + l.amount, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = subtotal + taxAmount

  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      company_id: profile.company_id,
      customer_id: job.customer_id,
      job_id: jobId,
      invoice_number: invoiceNumber,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: 'draft',
      issued_date: today,
      due_date: dueDate,
      created_by: user.id,
      notes: null,
    })
    .select('id')
    .single()

  if (invError) throw new Error(`Failed to create invoice: ${invError.message}`)
  if (!invoice?.id) throw new Error('Invoice created but ID not returned')

  // Insert line items if any
  if (allLines.length > 0) {
    const { error: lineError } = await supabase
      .from('invoice_line_items')
      .insert(
        allLines.map(l => ({
          invoice_id: invoice.id,
          company_id: profile.company_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
          line_type: l.line_type,
        }))
      )
    if (lineError) throw new Error(`Failed to create line items: ${lineError.message}`)
  }

  // Fire webhook (non-blocking)
  fireWebhookEvent(profile.company_id, 'invoice.created', {
    invoice_id: invoice.id,
    invoice_number: invoiceNumber,
    job_id: jobId,
    job_number: job.job_number,
    subtotal,
    total,
    status: 'draft',
  }).catch(() => {})

  revalidatePath('/invoices')
  return invoice.id
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice['status'],
  paymentData?: { payment_method?: string; payment_reference?: string }
) {
  const supabase = await createClient()

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'paid') {
    updates.paid_date = new Date().toISOString().split('T')[0]
    if (paymentData?.payment_method) updates.payment_method = paymentData.payment_method
    if (paymentData?.payment_reference) updates.payment_reference = paymentData.payment_reference
  }

  // Get invoice details for webhook payload before updating
  const { data: invoice } = await supabase
    .from('invoices')
    .select('company_id, invoice_number, status, total')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update invoice: ${error.message}`)

  // Fire webhook (non-blocking)
  if (invoice) {
    const payload = {
      invoice_id: id,
      invoice_number: invoice.invoice_number,
      previous_status: invoice.status,
      new_status: status,
      total: invoice.total,
    }

    fireWebhookEvent(invoice.company_id, 'invoice.status_changed', payload).catch(() => {})

    if (status === 'overdue') {
      fireWebhookEvent(invoice.company_id, 'invoice.overdue', payload).catch(() => {})
    }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete invoice: ${error.message}`)
  revalidatePath('/invoices')
}