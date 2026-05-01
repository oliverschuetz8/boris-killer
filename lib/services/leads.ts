'use server'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Lead {
  id: string
  company_id: string | null
  name: string
  email: string
  phone: string | null
  company_name: string | null
  source: string
  status: string
  message: string | null
  metadata: Record<string, any>
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadStats {
  total: number
  new: number
  contacted: number
  qualified: number
  converted: number
  lost: number
  conversionRate: number
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

export async function getLeads(filters?: {
  status?: string
  source?: string
  search?: string
  limit?: number
}): Promise<Lead[]> {
  const { supabase } = await getProfile()

  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch leads: ${error.message}`)
  return data || []
}

export async function getLeadStats(): Promise<LeadStats> {
  const { supabase } = await getProfile()

  const { data, error } = await supabase
    .from('leads')
    .select('status')

  if (error) throw new Error(`Failed to fetch lead stats: ${error.message}`)

  const rows = data || []
  const total = rows.length
  const counts = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 }

  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts]++
    }
  }

  return {
    total,
    ...counts,
    conversionRate: total > 0 ? Math.round((counts.converted / total) * 100) : 0,
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createLead(data: {
  name: string
  email: string
  phone?: string
  company_name?: string
  source?: string
  message?: string
  metadata?: Record<string, any>
}): Promise<Lead> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      company_id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company_name: data.company_name || null,
      source: data.source || 'manual',
      message: data.message || null,
      metadata: data.metadata || {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create lead: ${error.message}`)
  return lead
}

export async function updateLead(
  id: string,
  updates: {
    status?: string
    name?: string
    email?: string
    phone?: string
    company_name?: string
    message?: string
  }
): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') throw new Error('Admin or manager only')

  // If status is changing to 'converted', set converted_at
  const payload: Record<string, any> = { ...updates }
  if (updates.status === 'converted') {
    payload.converted_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(`Failed to update lead: ${error.message}`)
}

export async function deleteLead(id: string): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete lead: ${error.message}`)
}
