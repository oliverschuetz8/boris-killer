'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

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

  if (error) throw new Error('Failed to fetch customers')
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
  if (!user) throw new Error('Not authenticated')

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userProfile?.company_id) throw new Error('Company not found')

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
    throw new Error('Failed to create customer')
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

  if (error) throw new Error('Failed to update customer')

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Failed to delete customer')

  revalidatePath('/customers')
}