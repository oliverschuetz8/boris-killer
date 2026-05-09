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