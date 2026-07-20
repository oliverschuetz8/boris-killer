'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('customers')
    .select('*, customer_sites(*)')
    .eq('company_id', userProfile?.company_id)
    .order('name')

  if (error) throw new Error("Couldn't load customers. Refresh the page or check your connection.")
  return data || []
}

export async function getCustomer(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*, customer_sites(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userProfile?.company_id) throw new Error("We couldn't find your company. Refresh the page or contact support if this keeps happening.")

const customerData = {
    company_id: userProfile.company_id,
    name: formData.get('name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    billing_address_line1: formData.get('address_line1') as string || null,
    billing_city: formData.get('city') as string || null,
    billing_state: formData.get('state') as string || null,
    billing_postcode: formData.get('postcode') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) {
    console.error('Error creating customer:', error)
    throw new Error("Couldn't create the customer. Check the form and try again.")
  }

  // Create site if address provided
  const siteAddress = formData.get('site_address_line1') as string
  if (siteAddress && data) {
    await supabase.from('customer_sites').insert({
      customer_id: data.id,
      company_id: userProfile.company_id,
      site_name: formData.get('site_name') as string || null,
      address_line1: siteAddress,
      city: formData.get('site_city') as string || null,
      state: formData.get('site_state') as string || null,
      postcode: formData.get('site_postcode') as string || null,
      site_manager_name: formData.get('site_manager_name') as string || null,
      site_manager_phone: formData.get('site_manager_phone') as string || null,
    })
  }

  revalidatePath('/customers')
  return data
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient()

const updates = {
    name: formData.get('name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    billing_address_line1: formData.get('address_line1') as string || null,
    billing_city: formData.get('city') as string || null,
    billing_state: formData.get('state') as string || null,
    billing_postcode: formData.get('postcode') as string || null,
    notes: formData.get('notes') as string || null,
    // Account / relationship fields (CRM hub)
    account_type: formData.get('account_type') as string || null,
    account_status: formData.get('account_status') as string || null,
    abn: formData.get('abn') as string || null,
    payment_terms: formData.get('payment_terms') as string || null,
    account_manager_id: formData.get('account_manager_id') as string || null,
    accounts_email: formData.get('accounts_email') as string || null,
    accounts_phone: formData.get('accounts_phone') as string || null,
    next_followup_date: formData.get('next_followup_date') as string || null,
  }

  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error("Couldn't save changes to this customer. Try again or refresh the page.")

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw new Error("Couldn't delete this customer. They may have linked jobs or invoices — cancel those first, then try again.")

  revalidatePath('/customers')
}

export async function createSite(customerId: string, formData: {
  site_name: string
  address_line1: string
  city: string
  state: string
  postcode: string
  site_manager_name?: string
  site_manager_phone?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('customer_sites')
    .insert({
      customer_id: customerId,
      company_id: userProfile?.company_id,
      site_name: formData.site_name || null,
      address_line1: formData.address_line1,
      city: formData.city || null,
      state: formData.state || null,
      postcode: formData.postcode || null,
      site_manager_name: formData.site_manager_name || null,
      site_manager_phone: formData.site_manager_phone || null,
    })
    .select()
    .single()

  if (error) throw new Error("Couldn't create the site. Check the form and try again.")
  revalidatePath('/customers')
  return data
}

export async function updateSite(siteId: string, customerId: string, formData: {
  site_name: string
  address_line1: string
  city: string
  state: string
  postcode: string
  site_manager_name?: string
  site_manager_phone?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_sites')
    .update({
      site_name: formData.site_name || null,
      address_line1: formData.address_line1,
      city: formData.city || null,
      state: formData.state || null,
      postcode: formData.postcode || null,
      site_manager_name: formData.site_manager_name || null,
      site_manager_phone: formData.site_manager_phone || null,
    })
    .eq('id', siteId)

  if (error) throw new Error("Couldn't save changes to this site. Try again or refresh the page.")
  revalidatePath(`/customers/${customerId}`)
}

export async function deleteSite(siteId: string, customerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_sites')
    .delete()
    .eq('id', siteId)

  if (error) throw new Error("Couldn't delete this site. It may have linked jobs — cancel those first, then try again.")
  revalidatePath(`/customers/${customerId}`)
}

// ===========================================================================
// CRM HUB — company users, contacts (people), job pinning, jobs, activity
// ===========================================================================

// Shared: resolve the signed-in user + their company_id, or throw actionable errors.
async function requireCompany() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error("We couldn't find your company. Refresh the page or contact support if this keeps happening.")
  return { supabase, userId: user.id, companyId: profile.company_id as string, role: profile.role as string }
}

// --- Company users (for the Account Manager picker) ------------------------
export async function getCompanyUsers() {
  const { supabase, companyId } = await requireCompany()
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('company_id', companyId)
    .order('full_name')
  if (error) throw new Error("Couldn't load your team. Refresh the page or check your connection.")
  return data || []
}

// --- Contacts (people) -----------------------------------------------------
export async function getCustomerContacts(customerId: string) {
  const { supabase } = await requireCompany()
  const { data, error } = await supabase
    .from('customer_contacts')
    .select('*, job_contacts(id, job_id, role_on_job, jobs(id, job_number, title, status))')
    .eq('customer_id', customerId)
    .order('is_primary', { ascending: false })
    .order('name')
  if (error) throw new Error("Couldn't load this customer's people. Refresh the page or check your connection.")
  return data || []
}

export async function createContact(customerId: string, data: {
  name: string
  job_title?: string
  role?: string
  email?: string
  phone?: string
  secondary_phone?: string
  preferred_contact_method?: string
  receives_reports?: boolean
  receives_quotes?: boolean
  approves_work?: boolean
  site_access?: boolean
  worker_visible?: boolean
  is_primary?: boolean
  is_active?: boolean
  notes?: string
}) {
  const { supabase, companyId, userId, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can add contacts. Ask your manager to make this change.")
  if (!data.name?.trim()) throw new Error("A contact needs a name. Add a name and try again.")

  const { data: contact, error } = await supabase
    .from('customer_contacts')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      created_by: userId,
      name: data.name.trim(),
      job_title: data.job_title || null,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      secondary_phone: data.secondary_phone || null,
      preferred_contact_method: data.preferred_contact_method || null,
      receives_reports: data.receives_reports ?? false,
      receives_quotes: data.receives_quotes ?? false,
      approves_work: data.approves_work ?? false,
      site_access: data.site_access ?? false,
      worker_visible: data.worker_visible ?? false,
      is_primary: data.is_primary ?? false,
      is_active: data.is_active ?? true,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (error) throw new Error("Couldn't save this contact. Check the form and try again.")
  revalidatePath(`/customers/${customerId}`)
  return contact
}

export async function updateContact(contactId: string, customerId: string, data: {
  name: string
  job_title?: string
  role?: string
  email?: string
  phone?: string
  secondary_phone?: string
  preferred_contact_method?: string
  receives_reports?: boolean
  receives_quotes?: boolean
  approves_work?: boolean
  site_access?: boolean
  worker_visible?: boolean
  is_primary?: boolean
  is_active?: boolean
  notes?: string
}) {
  const { supabase, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can edit contacts. Ask your manager to make this change.")
  if (!data.name?.trim()) throw new Error("A contact needs a name. Add a name and try again.")

  const { error } = await supabase
    .from('customer_contacts')
    .update({
      name: data.name.trim(),
      job_title: data.job_title || null,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      secondary_phone: data.secondary_phone || null,
      preferred_contact_method: data.preferred_contact_method || null,
      receives_reports: data.receives_reports ?? false,
      receives_quotes: data.receives_quotes ?? false,
      approves_work: data.approves_work ?? false,
      site_access: data.site_access ?? false,
      worker_visible: data.worker_visible ?? false,
      is_primary: data.is_primary ?? false,
      is_active: data.is_active ?? true,
      notes: data.notes || null,
    })
    .eq('id', contactId)

  if (error) throw new Error("Couldn't save changes to this contact. Try again or refresh the page.")
  revalidatePath(`/customers/${customerId}`)
}

export async function deleteContact(contactId: string, customerId: string) {
  const { supabase, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can remove contacts. Ask your manager to make this change.")

  const { error } = await supabase
    .from('customer_contacts')
    .delete()
    .eq('id', contactId)

  if (error) throw new Error("Couldn't remove this contact. Refresh the page and try again.")
  revalidatePath(`/customers/${customerId}`)
}

// --- Job pinning (link a contact to specific jobs) -------------------------
export async function pinContactToJob(contactId: string, jobId: string, customerId: string, roleOnJob?: string) {
  const { supabase, companyId, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can pin contacts to jobs. Ask your manager to make this change.")

  const { error } = await supabase
    .from('job_contacts')
    .insert({
      company_id: companyId,
      job_id: jobId,
      contact_id: contactId,
      role_on_job: roleOnJob || null,
    })

  if (error) {
    // Unique (job_id, contact_id) violation → already pinned
    if ((error as any).code === '23505') throw new Error("This person is already pinned to that job.")
    throw new Error("Couldn't pin this person to the job. Refresh the page and try again.")
  }
  revalidatePath(`/customers/${customerId}`)
}

export async function unpinContactFromJob(jobContactId: string, customerId: string) {
  const { supabase, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can change job contacts. Ask your manager to make this change.")

  const { error } = await supabase
    .from('job_contacts')
    .delete()
    .eq('id', jobContactId)

  if (error) throw new Error("Couldn't unpin this person from the job. Refresh the page and try again.")
  revalidatePath(`/customers/${customerId}`)
}

// --- Contacts pinned to a job (for the job detail + worker views) ----------
// Pass workerVisibleOnly=true for the tradie view so office-only contacts are hidden.
export async function getJobContacts(jobId: string, opts?: { workerVisibleOnly?: boolean }) {
  const { supabase } = await requireCompany()
  const { data, error } = await supabase
    .from('job_contacts')
    .select('id, role_on_job, contact:customer_contacts(id, name, role, job_title, phone, secondary_phone, email, worker_visible)')
    .eq('job_id', jobId)
  if (error) throw new Error("Couldn't load the contacts for this job. Refresh the page or check your connection.")

  const rows = (data || []).map((r: any) => {
    const contact = Array.isArray(r.contact) ? r.contact[0] : r.contact
    return { jobContactId: r.id, role_on_job: r.role_on_job, ...contact }
  }).filter((c: any) => c && c.id)

  return opts?.workerVisibleOnly ? rows.filter((c: any) => c.worker_visible) : rows
}

// --- Jobs for a customer ---------------------------------------------------
export async function getCustomerJobs(customerId: string) {
  const { supabase } = await requireCompany()
  const { data, error } = await supabase
    .from('jobs')
    .select('id, job_number, title, status, priority, scheduled_start, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error("Couldn't load this customer's jobs. Refresh the page or check your connection.")
  return data || []
}

// --- Activity (manual notes; job events are derived on the page) -----------
export async function getCustomerActivity(customerId: string) {
  const { supabase } = await requireCompany()
  const { data, error } = await supabase
    .from('customer_activity')
    .select('*')
    .eq('customer_id', customerId)
    .order('occurred_at', { ascending: false })
  if (error) throw new Error("Couldn't load this customer's activity. Refresh the page or check your connection.")
  return data || []
}

export async function logCustomerActivity(customerId: string, data: {
  activity_type: string
  description?: string
  markContactedToday?: boolean
}) {
  const { supabase, companyId, userId, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can log activity. Ask your manager to make this change.")

  const nowIso = new Date().toISOString()

  const { error } = await supabase
    .from('customer_activity')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      created_by: userId,
      activity_type: data.activity_type || 'note',
      description: data.description || null,
      occurred_at: nowIso,
    })

  if (error) throw new Error("Couldn't save this activity. Try again or refresh the page.")

  // Optionally stamp the customer's last-contacted date
  if (data.markContactedToday) {
    await supabase.from('customers').update({ last_contacted_at: nowIso }).eq('id', customerId)
  }

  revalidatePath(`/customers/${customerId}`)
}

export async function deleteCustomerActivity(activityId: string, customerId: string) {
  const { supabase, role } = await requireCompany()
  if (role !== 'admin' && role !== 'manager') throw new Error("Only an admin or manager can remove activity. Ask your manager to make this change.")

  const { error } = await supabase
    .from('customer_activity')
    .delete()
    .eq('id', activityId)

  if (error) throw new Error("Couldn't remove this activity entry. Refresh the page and try again.")
  revalidatePath(`/customers/${customerId}`)
}