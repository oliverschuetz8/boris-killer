'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { fireWebhookEvent } from '@/lib/services/webhooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XeroConnection {
  id: string
  company_id: string
  xero_tenant_id: string
  xero_tenant_name: string | null
  access_token: string
  refresh_token: string
  token_expires_at: string
  connected_at: string
  connected_by: string
  last_sync_at: string | null
  sync_status: string
}

export interface XeroTimeEntry {
  id: string
  company_id: string
  job_id: string | null
  user_id: string | null
  xero_timesheet_id: string | null
  xero_employee_id: string | null
  employee_name: string
  date: string
  hours: number
  hourly_rate: number | null
  cost: number | null
  status: 'unassigned' | 'assigned' | 'ignored'
  notes: string | null
}

// ---------------------------------------------------------------------------
// Connection CRUD
// ---------------------------------------------------------------------------

export async function getXeroConnection(): Promise<XeroConnection | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) return null

  const { data } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()

  return data || null
}

export async function deleteXeroConnection(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin') throw new Error('Admin only')

  // Revoke token at Xero first (best-effort)
  const { data: conn } = await supabase
    .from('xero_connections')
    .select('refresh_token')
    .eq('company_id', profile.company_id)
    .single()

  if (conn?.refresh_token) {
    try {
      await fetch('https://identity.xero.com/connect/revocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: conn.refresh_token,
          client_id: process.env.XERO_CLIENT_ID!,
        }),
      })
    } catch {
      // Best effort — continue with delete even if revocation fails
    }
  }

  const { error } = await supabase
    .from('xero_connections')
    .delete()
    .eq('company_id', profile.company_id)
  if (error) throw new Error(`Failed to disconnect: ${error.message}`)

  revalidatePath('/settings/integrations')
}

// ---------------------------------------------------------------------------
// Token Refresh
// ---------------------------------------------------------------------------

async function refreshTokenIfNeeded(connection: XeroConnection): Promise<XeroConnection> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt > fiveMinFromNow) return connection

  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: process.env.XERO_CLIENT_ID!,
      client_secret: process.env.XERO_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    throw new Error('Failed to refresh Xero token — admin may need to reconnect')
  }

  const tokens = await res.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Use admin client to update tokens (bypasses RLS since this may run from API routes)
  const admin = createAdminClient()
  await admin
    .from('xero_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id)

  return {
    ...connection,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: newExpiresAt,
  }
}

// ---------------------------------------------------------------------------
// Xero API Wrapper
// ---------------------------------------------------------------------------

async function xeroFetch(
  connection: XeroConnection,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const conn = await refreshTokenIfNeeded(connection)

  const baseUrl = path.startsWith('https://') ? '' : 'https://api.xero.com/api.xro/2.0'
  const url = path.startsWith('https://') ? path : `${baseUrl}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Xero-Tenant-Id': conn.xero_tenant_id,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero API ${res.status}: ${text}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Push Invoice to Xero
// ---------------------------------------------------------------------------

export async function pushInvoiceToXero(invoiceId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  // Get Xero connection
  const { data: connection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()
  if (!connection) throw new Error('Xero not connected — go to Settings > Integrations')

  // Get invoice with line items and customer
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, email),
      invoice_line_items(*)
    `)
    .eq('id', invoiceId)
    .single()
  if (!invoice) throw new Error('Invoice not found')

  const customer = Array.isArray(invoice.customer)
    ? invoice.customer[0]
    : invoice.customer

  // Build Xero invoice payload
  const lineItems = (invoice.invoice_line_items || []).map((li: any) => ({
    Description: li.description,
    Quantity: li.quantity,
    UnitAmount: li.unit_price,
    AccountCode: '200', // Default sales account — admin can change in Xero
    TaxType: 'OUTPUT', // GST on Income
  }))

  const xeroInvoice = {
    Type: 'ACCREC', // Accounts Receivable (sales invoice)
    Contact: {
      Name: customer?.name || 'Unknown Customer',
      EmailAddress: customer?.email || undefined,
    },
    Date: invoice.issued_date,
    DueDate: invoice.due_date,
    Reference: invoice.invoice_number,
    Status: 'DRAFT',
    LineAmountTypes: 'Exclusive', // Amounts are exclusive of tax
    LineItems: lineItems,
  }

  const result = await xeroFetch(connection, '/Invoices', {
    method: 'PUT',
    body: JSON.stringify({ Invoices: [xeroInvoice] }),
  })

  const xeroInvoiceId = result?.Invoices?.[0]?.InvoiceID
  if (!xeroInvoiceId) throw new Error('Xero did not return an invoice ID')

  // Store the Xero invoice ID on our invoice (for future reference)
  await supabase
    .from('invoices')
    .update({ xero_invoice_id: xeroInvoiceId })
    .eq('id', invoiceId)

  revalidatePath(`/invoices/${invoiceId}`)
  return xeroInvoiceId
}

// ---------------------------------------------------------------------------
// Pull Timesheets from Xero
// ---------------------------------------------------------------------------

export async function syncTimesheets(): Promise<{ imported: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  // Get Xero connection
  const { data: connection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()
  if (!connection) throw new Error('Xero not connected')

  // Update sync status
  await supabase
    .from('xero_connections')
    .update({ sync_status: 'syncing' })
    .eq('id', connection.id)

  const errors: string[] = []
  let imported = 0

  try {
    // Fetch timesheets from Xero Payroll AU API
    const timesheetData = await xeroFetch(
      connection,
      'https://api.xero.com/payroll.xro/1.0/Timesheets',
      { method: 'GET' }
    )

    const timesheets = timesheetData?.Timesheets || []

    // Get all jobs for auto-mapping by job number
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, job_number')
      .eq('company_id', profile.company_id)

    const jobMap = new Map((jobs || []).map(j => [j.job_number, j.id]))

    // Get all users for matching Xero employees
    const { data: companyUsers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('company_id', profile.company_id)

    for (const ts of timesheets) {
      const employeeId = ts.EmployeeID
      const employeeName = `${ts.FirstName || ''} ${ts.LastName || ''}`.trim() || 'Unknown'

      // Match Xero employee to our user by name (best effort)
      const matchedUser = (companyUsers || []).find(
        u => u.full_name?.toLowerCase() === employeeName.toLowerCase()
      )

      for (const line of ts.TimesheetLines || []) {
        // Try auto-mapping via tracking category (job number)
        let jobId: string | null = null
        const trackingCategory = line.TrackingItemID
        // If the earnings line has a tracking category matching a job number, auto-assign
        if (trackingCategory) {
          // Check if any job number matches the tracking category name
          for (const [jobNumber, id] of jobMap) {
            if (trackingCategory.includes(jobNumber) || jobNumber.includes(trackingCategory)) {
              jobId = id
              break
            }
          }
        }

        for (const unit of line.NumberOfUnits || []) {
          if (!unit.NumberOfUnits || unit.NumberOfUnits === 0) continue

          const date = unit.DateOfPay || ts.StartDate
          const hours = Number(unit.NumberOfUnits)
          const rate = line.EarningsRateID ? null : null // Rate comes from employee pay, not timesheet

          // Check for duplicate by xero_timesheet_id + date
          const entryKey = `${ts.TimesheetID}-${line.EarningsRateID}-${date}`
          const { data: existing } = await supabase
            .from('job_time_entries')
            .select('id')
            .eq('xero_timesheet_id', entryKey)
            .eq('company_id', profile.company_id)
            .limit(1)

          if (existing && existing.length > 0) continue // Skip duplicates

          const { error: insertError } = await supabase
            .from('job_time_entries')
            .insert({
              company_id: profile.company_id,
              job_id: jobId,
              user_id: matchedUser?.id || null,
              xero_timesheet_id: entryKey,
              xero_employee_id: employeeId,
              employee_name: employeeName,
              date,
              hours,
              hourly_rate: rate,
              cost: rate ? hours * rate : null,
              status: jobId ? 'assigned' : 'unassigned',
            })

          if (insertError) {
            errors.push(`Failed to import entry for ${employeeName}: ${insertError.message}`)
          } else {
            imported++
          }
        }
      }
    }

    // Update sync status
    await supabase
      .from('xero_connections')
      .update({
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
  } catch (err: any) {
    await supabase
      .from('xero_connections')
      .update({ sync_status: 'error' })
      .eq('id', connection.id)
    throw new Error(`Timesheet sync failed: ${err.message}`)
  }

  // Fire webhook for imported hours (non-blocking)
  if (imported > 0) {
    fireWebhookEvent(profile.company_id, 'hours.submitted', {
      imported_count: imported,
      source: 'xero',
      errors: errors.length,
    }).catch(() => {})
  }

  revalidatePath('/settings/integrations')
  return { imported, errors }
}

// ---------------------------------------------------------------------------
// Unassigned Hours Queue
// ---------------------------------------------------------------------------

export async function getUnassignedTimeEntries(): Promise<XeroTimeEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_time_entries')
    .select('*')
    .eq('status', 'unassigned')
    .order('date', { ascending: false })

  if (error) throw new Error(`Failed to fetch unassigned entries: ${error.message}`)
  return data || []
}

export async function assignTimeEntry(entryId: string, jobId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('job_time_entries')
    .update({ job_id: jobId, status: 'assigned' })
    .eq('id', entryId)

  if (error) throw new Error(`Failed to assign time entry: ${error.message}`)
  revalidatePath('/settings/integrations')
}

export async function ignoreTimeEntry(entryId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('job_time_entries')
    .update({ status: 'ignored' })
    .eq('id', entryId)

  if (error) throw new Error(`Failed to ignore time entry: ${error.message}`)
  revalidatePath('/settings/integrations')
}

// ---------------------------------------------------------------------------
// Sync Xero Employee Pay Rates
// ---------------------------------------------------------------------------

export async function syncEmployeePayRates(): Promise<{ updated: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')
  if (profile.role !== 'admin') throw new Error('Admin only')

  const { data: connection } = await supabase
    .from('xero_connections')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()
  if (!connection) throw new Error('Xero not connected')

  // Fetch employees from Xero Payroll
  const employeeData = await xeroFetch(
    connection,
    'https://api.xero.com/payroll.xro/1.0/Employees',
    { method: 'GET' }
  )

  const employees = employeeData?.Employees || []
  let updated = 0

  // Get our company users
  const { data: companyUsers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', profile.company_id)

  for (const emp of employees) {
    const name = `${emp.FirstName || ''} ${emp.LastName || ''}`.trim()
    const matchedUser = (companyUsers || []).find(
      u => u.full_name?.toLowerCase() === name.toLowerCase()
    )
    if (!matchedUser) continue

    // Get the employee's ordinary earnings rate
    const ordinaryRate = emp.PayTemplate?.EarningsLines?.find(
      (el: any) => el.EarningsRateID // Take the first earnings line
    )
    if (!ordinaryRate?.RatePerUnit) continue

    const rate = Number(ordinaryRate.RatePerUnit)

    // Check if worker has a labour rate part — if so, update its buy_cost
    const { data: userProfile } = await supabase
      .from('users')
      .select('labour_rate_part_id')
      .eq('id', matchedUser.id)
      .single()

    if (userProfile?.labour_rate_part_id) {
      await supabase
        .from('parts')
        .update({ buy_cost: rate })
        .eq('id', userProfile.labour_rate_part_id)
      updated++
    }

    // Also update hourly_rate on users table for backward compat
    await supabase
      .from('users')
      .update({ hourly_rate: rate })
      .eq('id', matchedUser.id)
  }

  revalidatePath('/settings/integrations')
  return { updated }
}
