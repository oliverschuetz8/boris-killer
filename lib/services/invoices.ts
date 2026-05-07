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
  scope_label: string | null
  is_partial: boolean
  period_start_date: string | null
  period_end_date: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  customer?: { name: string; email: string | null; phone: string | null }
  job?: { title: string; job_number: string } | null
  invoice_line_items?: InvoiceLineItem[]
}

export interface JobWithInvoiceTotals {
  id: string
  job_number: string
  title: string
  status: string
  customer_name: string | null
  total_job_value: number
  invoiced_amount: number
  invoice_count: number
  remaining: number
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

export async function getInvoicesForJob(jobId: string): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch invoices for job: ${error.message}`)
  return (data || []) as Invoice[]
}

export async function getInvoicedTotalForJob(
  jobId: string
): Promise<{ invoiced: number; invoiceCount: number }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('subtotal, status')
    .eq('job_id', jobId)
    .neq('status', 'cancelled')

  if (error) throw new Error(`Failed to fetch invoiced total: ${error.message}`)

  const invoices = data || []
  const invoiced = invoices.reduce((s, inv: any) => s + Number(inv.subtotal || 0), 0)
  return {
    invoiced: Math.round(invoiced * 100) / 100,
    invoiceCount: invoices.length,
  }
}

export async function getJobsWithInvoiceTotals(): Promise<JobWithInvoiceTotals[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  // Fetch jobs (excluding cancelled) with customer
  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, status,
      customer:customers(name)
    `)
    .eq('company_id', profile.company_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (jobsErr) throw new Error(`Failed to fetch jobs: ${jobsErr.message}`)

  const jobsList = jobs || []
  if (jobsList.length === 0) return []

  const jobIds = jobsList.map((j: any) => j.id)

  // Fetch all room_materials for these jobs in one query
  const { data: roomMaterials } = await supabase
    .from('room_materials')
    .select(`
      job_id, quantity,
      material:materials(unit_price),
      part:parts(sell_price),
      product:products(total_sell_price)
    `)
    .in('job_id', jobIds)

  // Fetch all assigned time entries for these jobs in one query
  const { data: timeEntries } = await supabase
    .from('job_time_entries')
    .select(`
      job_id, hours, user_id,
      user:users(labour_rate_part_id)
    `)
    .in('job_id', jobIds)
    .eq('status', 'assigned')

  // Collect labour_rate_part_ids and fetch their sell prices in one query
  const labourPartIds = Array.from(new Set(
    (timeEntries || [])
      .map((e: any) => {
        const u = Array.isArray(e.user) ? e.user[0] : e.user
        return u?.labour_rate_part_id
      })
      .filter(Boolean)
  )) as string[]

  const labourPartSellMap = new Map<string, number>()
  if (labourPartIds.length > 0) {
    const { data: labourParts } = await supabase
      .from('parts')
      .select('id, sell_price')
      .in('id', labourPartIds)
    for (const p of labourParts || []) {
      labourPartSellMap.set((p as any).id, Number((p as any).sell_price || 0))
    }
  }

  // Fetch all non-cancelled invoices for these jobs in one query
  const { data: invoices } = await supabase
    .from('invoices')
    .select('job_id, subtotal, status')
    .in('job_id', jobIds)
    .neq('status', 'cancelled')

  // Build per-job material sell totals
  const materialSellByJob = new Map<string, number>()
  for (const rm of roomMaterials || []) {
    const r = rm as any
    const part = Array.isArray(r.part) ? r.part[0] : r.part
    const product = Array.isArray(r.product) ? r.product[0] : r.product
    const material = Array.isArray(r.material) ? r.material[0] : r.material
    const qty = Number(r.quantity || 0)

    let sellPrice = 0
    if (part) sellPrice = Number(part.sell_price || 0)
    else if (product) sellPrice = Number(product.total_sell_price || 0)
    else if (material) sellPrice = Number(material.unit_price || 0)

    materialSellByJob.set(
      r.job_id,
      (materialSellByJob.get(r.job_id) || 0) + qty * sellPrice
    )
  }

  // Build per-job labour sell totals (using each worker's labour-rate-part sell price)
  const labourSellByJob = new Map<string, number>()
  for (const entry of timeEntries || []) {
    const e = entry as any
    const user = Array.isArray(e.user) ? e.user[0] : e.user
    const partId = user?.labour_rate_part_id
    const sellRate = partId ? (labourPartSellMap.get(partId) || 0) : 0
    const hrs = Number(e.hours || 0)
    labourSellByJob.set(
      e.job_id,
      (labourSellByJob.get(e.job_id) || 0) + hrs * sellRate
    )
  }

  // Build per-job invoiced totals
  const invoicedByJob = new Map<string, { sum: number; count: number }>()
  for (const inv of invoices || []) {
    const i = inv as any
    const cur = invoicedByJob.get(i.job_id) || { sum: 0, count: 0 }
    cur.sum += Number(i.subtotal || 0)
    cur.count += 1
    invoicedByJob.set(i.job_id, cur)
  }

  // Compose result
  const result: JobWithInvoiceTotals[] = jobsList.map((job: any) => {
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
    const materialSell = materialSellByJob.get(job.id) || 0
    const labourSell = labourSellByJob.get(job.id) || 0
    const totalJobValue = Math.round((materialSell + labourSell) * 100) / 100
    const invoicedRecord = invoicedByJob.get(job.id) || { sum: 0, count: 0 }
    const invoicedAmount = Math.round(invoicedRecord.sum * 100) / 100
    const remaining = Math.round((totalJobValue - invoicedAmount) * 100) / 100

    return {
      id: job.id,
      job_number: job.job_number,
      title: job.title,
      status: job.status,
      customer_name: customer?.name || null,
      total_job_value: totalJobValue,
      invoiced_amount: invoicedAmount,
      invoice_count: invoicedRecord.count,
      remaining,
    }
  })

  // Sort by status priority, then by job_number desc
  const statusOrder: Record<string, number> = {
    in_progress: 0,
    on_hold: 1,
    completed: 2,
    scheduled: 3,
    draft: 4,
  }
  result.sort((a, b) => {
    const ao = statusOrder[a.status] ?? 99
    const bo = statusOrder[b.status] ?? 99
    if (ao !== bo) return ao - bo
    return b.job_number.localeCompare(a.job_number)
  })

  return result
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

export interface PartialInvoiceContext {
  jobStart: string | null
  jobEnd: string | null
  jobStartedActual: boolean
  jobEndedActual: boolean
  lastPeriodEnd: string | null
  suggestedStart: string
  suggestedEnd: string
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export async function getPartialInvoiceContext(jobId: string): Promise<PartialInvoiceContext> {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('actual_start, scheduled_start, actual_end, scheduled_end')
    .eq('id', jobId)
    .single()

  const j = job as any
  const startTs = j?.actual_start || j?.scheduled_start || null
  const endTs = j?.actual_end || j?.scheduled_end || null
  const jobStart = startTs ? new Date(startTs).toISOString().split('T')[0] : null
  const jobEnd = endTs ? new Date(endTs).toISOString().split('T')[0] : null
  const jobStartedActual = !!j?.actual_start
  const jobEndedActual = !!j?.actual_end

  const { data: priorInvoices } = await supabase
    .from('invoices')
    .select('period_end_date, created_at, status')
    .eq('job_id', jobId)
    .neq('status', 'cancelled')

  let lastPeriodEnd: string | null = null
  for (const inv of priorInvoices || []) {
    const candidate =
      (inv as any).period_end_date ||
      (inv as any).created_at?.split('T')[0] ||
      null
    if (!candidate) continue
    if (!lastPeriodEnd || candidate > lastPeriodEnd) lastPeriodEnd = candidate
  }

  const today = todayISO()
  let suggestedStart: string
  if (lastPeriodEnd) {
    suggestedStart = addDaysISO(lastPeriodEnd, 1)
  } else if (jobStart) {
    suggestedStart = jobStart
  } else {
    suggestedStart = addDaysISO(today, -30)
  }

  // Don't let suggested start be after today
  const suggestedEnd = today
  if (suggestedStart > suggestedEnd) suggestedStart = suggestedEnd

  return {
    jobStart,
    jobEnd,
    jobStartedActual,
    jobEndedActual,
    lastPeriodEnd,
    suggestedStart,
    suggestedEnd,
  }
}

export interface BillableLineItem {
  description: string
  quantity: number
  unit_price: number
  source: 'material' | 'labour'
}

export async function getJobBillablesForPeriod(
  jobId: string,
  startDate: string,
  endDate: string
): Promise<BillableLineItem[]> {
  const supabase = await createClient()

  // Treat dates as Sydney days; build inclusive UTC bounds with a small safety margin
  // Materials filter (created_at is timestamptz)
  const startTs = `${startDate}T00:00:00+10:00`
  const endTsExclusive = `${addDaysISO(endDate, 1)}T00:00:00+10:00`

  const { data: roomMaterials } = await supabase
    .from('room_materials')
    .select(`
      id, quantity, material_name_override, created_at,
      material:materials(name, unit, unit_price),
      part:parts(name, unit, sell_price),
      product:products(name, total_sell_price)
    `)
    .eq('job_id', jobId)
    .gte('created_at', startTs)
    .lt('created_at', endTsExclusive)

  const materialLines: BillableLineItem[] = (roomMaterials || []).map((rm: any) => {
    const part = Array.isArray(rm.part) ? rm.part[0] : rm.part
    const product = Array.isArray(rm.product) ? rm.product[0] : rm.product
    const material = Array.isArray(rm.material) ? rm.material[0] : rm.material
    const qty = Number(rm.quantity || 0)

    let name = rm.material_name_override || 'Material'
    let unitPrice = 0
    if (part) {
      name = part.name
      unitPrice = Number(part.sell_price || 0)
    } else if (product) {
      name = product.name
      unitPrice = Number(product.total_sell_price || 0)
    } else if (material) {
      name = material.name
      unitPrice = Number(material.unit_price || 0)
    }

    return {
      description: name,
      quantity: qty,
      unit_price: unitPrice,
      source: 'material' as const,
    }
  })

  // Labour entries (date is a date column — no timezone shenanigans)
  const { data: timeEntries } = await supabase
    .from('job_time_entries')
    .select(`
      id, employee_name, hours, date, user_id,
      user:users(id, full_name, labour_rate_part_id)
    `)
    .eq('job_id', jobId)
    .eq('status', 'assigned')
    .gte('date', startDate)
    .lte('date', endDate)

  // Batch-fetch sell prices for all labour-rate-parts referenced
  const labourPartIds = Array.from(new Set(
    (timeEntries || [])
      .map((e: any) => {
        const u = Array.isArray(e.user) ? e.user[0] : e.user
        return u?.labour_rate_part_id
      })
      .filter(Boolean)
  )) as string[]

  const sellRateByPart = new Map<string, number>()
  if (labourPartIds.length > 0) {
    const { data: parts } = await supabase
      .from('parts')
      .select('id, sell_price')
      .in('id', labourPartIds)
    for (const p of parts || []) {
      sellRateByPart.set((p as any).id, Number((p as any).sell_price || 0))
    }
  }

  const labourLines: BillableLineItem[] = (timeEntries || []).map((entry: any) => {
    const u = Array.isArray(entry.user) ? entry.user[0] : entry.user
    const partId = u?.labour_rate_part_id
    const sellRate = partId ? (sellRateByPart.get(partId) || 0) : 0
    const hrs = Number(entry.hours || 0)
    const dateLabel = entry.date ? new Date(entry.date).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short',
    }) : ''
    return {
      description: dateLabel
        ? `Labour — ${entry.employee_name} (${dateLabel})`
        : `Labour — ${entry.employee_name}`,
      quantity: hrs,
      unit_price: sellRate,
      source: 'labour' as const,
    }
  })

  return [...materialLines, ...labourLines]
}

export interface CreateInvoiceOptions {
  taxRate?: number
  scopeLabel?: string
  isPartial?: boolean
  customLineItems?: { description: string; quantity: number; unit_price: number }[]
  periodStartDate?: string | null
  periodEndDate?: string | null
}

export async function createInvoiceFromJob(
  jobId: string,
  options: CreateInvoiceOptions = {}
): Promise<string> {
  const taxRate = options.taxRate ?? 10
  const isPartial = options.isPartial === true

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

  let allLines: { description: string; quantity: number; unit_price: number; amount: number; line_type: 'material' | 'labour' | 'custom' }[] = []
  let scopeLabel: string

  if (isPartial) {
    const customs = options.customLineItems || []
    if (customs.length === 0) {
      throw new Error('Custom line items required for partial invoice')
    }
    if (!options.scopeLabel || !options.scopeLabel.trim()) {
      throw new Error('Scope label required for partial invoice')
    }
    scopeLabel = options.scopeLabel.trim()

    allLines = customs.map(l => {
      const qty = Number(l.quantity || 0)
      const price = Number(l.unit_price || 0)
      return {
        description: l.description,
        quantity: qty,
        unit_price: price,
        amount: Math.round(qty * price * 100) / 100,
        line_type: 'custom' as const,
      }
    })
  } else {
    scopeLabel = options.scopeLabel?.trim() || 'Full job'

    // Fetch materials from room_materials
    const { data: materials } = await supabase
      .from('room_materials')
      .select(`
        quantity, notes,
        material:materials(name, unit, unit_price),
        material_name_override
      `)
      .eq('job_id', jobId)

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
      const u = Array.isArray(entry.user) ? entry.user[0] : entry.user
      let sellRate = 0

      if (u?.labour_rate_part_id) {
        const { data: labourPart } = await supabase
          .from('parts')
          .select('sell_price')
          .eq('id', u.labour_rate_part_id)
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

    allLines = [...materialLines, ...labourLines]
  }

  const subtotal = Math.round(allLines.reduce((s, l) => s + l.amount, 0) * 100) / 100
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  const invoiceNumber = await generateInvoiceNumber(supabase, profile.company_id)
  const today = new Date().toISOString().split('T')[0]
  const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const periodStartDate = isPartial ? (options.periodStartDate || null) : null
  const periodEndDate = isPartial ? (options.periodEndDate || null) : null

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
      scope_label: scopeLabel,
      is_partial: isPartial,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
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
    scope_label: scopeLabel,
    is_partial: isPartial,
    period_start_date: periodStartDate,
    period_end_date: periodEndDate,
  }).catch(() => {})

  revalidatePath('/invoices')
  revalidatePath(`/jobs/${jobId}`)
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
