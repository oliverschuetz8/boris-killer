'use server'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanySettings {
  id: string
  name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  abn: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  website: string | null
}

export interface CompanyCredential {
  id: string
  company_id: string
  label: string
  value: string
  display_order: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error('Company not found')

  return { supabase, userId: user.id, ...profile }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getCompanySettings(): Promise<CompanySettings> {
  const { supabase, company_id, role } = await getProfile()

  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, email, phone, address_line1, address_line2, city, state, postcode, country, abn, logo_url, primary_color, secondary_color, website')
    .eq('id', company_id)
    .single()

  if (error) throw new Error(`Failed to fetch company settings: ${error.message}`)
  return data
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateCompanySettings(data: {
  name?: string
  email?: string
  phone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  abn?: string
  primary_color?: string
  secondary_color?: string
  website?: string
}): Promise<void> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', company_id)

  if (error) throw new Error(`Failed to update company settings: ${error.message}`)
}

export async function uploadCompanyLogo(formData: FormData): Promise<string> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const file = formData.get('logo') as File
  if (!file) throw new Error('No file provided')

  const path = `${company_id}/branding/logo.png`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(`Failed to upload logo: ${uploadError.message}`)

  const { error: updateError } = await supabase
    .from('companies')
    .update({ logo_url: path })
    .eq('id', company_id)

  if (updateError) throw new Error(`Failed to update logo URL: ${updateError.message}`)

  return path
}

export async function deleteCompanyLogo(): Promise<void> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const { data: company } = await supabase
    .from('companies')
    .select('logo_url')
    .eq('id', company_id)
    .single()

  if (company?.logo_url) {
    await supabase.storage
      .from('job-photos')
      .remove([company.logo_url])
  }

  const { error } = await supabase
    .from('companies')
    .update({ logo_url: null })
    .eq('id', company_id)

  if (error) throw new Error(`Failed to remove logo: ${error.message}`)
}

export async function getCompanyLogoUrl(): Promise<string | null> {
  const { supabase, company_id } = await getProfile()

  const { data: company } = await supabase
    .from('companies')
    .select('logo_url')
    .eq('id', company_id)
    .single()

  if (!company?.logo_url) return null

  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(company.logo_url, 3600)

  return data?.signedUrl ?? null
}

// ---------------------------------------------------------------------------
// Credentials / Licences
// ---------------------------------------------------------------------------

export async function getCompanyCredentials(): Promise<CompanyCredential[]> {
  const { supabase, company_id, role } = await getProfile()

  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('company_credentials')
    .select('*')
    .eq('company_id', company_id)
    .order('display_order')

  if (error) throw new Error(`Failed to fetch credentials: ${error.message}`)
  return data || []
}

export async function addCompanyCredential(label: string, value: string): Promise<CompanyCredential> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  // Get next display_order
  const { data: existing } = await supabase
    .from('company_credentials')
    .select('display_order')
    .eq('company_id', company_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0

  const { data, error } = await supabase
    .from('company_credentials')
    .insert({ company_id, label, value, display_order: nextOrder })
    .select()
    .single()

  if (error) throw new Error(`Failed to add credential: ${error.message}`)
  return data
}

export async function updateCompanyCredential(
  id: string,
  updates: { label?: string; value?: string }
): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase
    .from('company_credentials')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update credential: ${error.message}`)
}

export async function deleteCompanyCredential(id: string): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase
    .from('company_credentials')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete credential: ${error.message}`)
}
