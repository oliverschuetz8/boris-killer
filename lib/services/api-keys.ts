'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string
  company_id: string
  name: string
  key_prefix: string
  permissions: string[]
  last_used_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ApiKeyValidation {
  company_id: string
  permissions: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminProfile() {
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

  return { supabase, userId: user.id, company_id: profile.company_id }
}

function generateRawKey(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  return `ak_${hex}`
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getApiKeys(): Promise<ApiKey[]> {
  const { supabase } = await getAdminProfile()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, company_id, name, key_prefix, permissions, last_used_at, is_active, created_at, updated_at, created_by')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch API keys: ${error.message}`)
  return data || []
}

/**
 * Generate a new API key. Returns the full key — this is the ONLY time
 * the plaintext key is available. After this, only the hash is stored.
 */
export async function createApiKey(name: string): Promise<{ key: ApiKey; rawKey: string }> {
  const { supabase, userId, company_id } = await getAdminProfile()

  const rawKey = generateRawKey()
  const keyHash = await sha256(rawKey)
  const keyPrefix = rawKey.substring(0, 11) // "ak_" + first 8 hex chars

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      company_id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_by: userId,
    })
    .select('id, company_id, name, key_prefix, permissions, last_used_at, is_active, created_at, updated_at, created_by')
    .single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)
  return { key: data, rawKey }
}

export async function deleteApiKey(id: string): Promise<void> {
  const { supabase } = await getAdminProfile()

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete API key: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Validate API key (for external API routes — uses admin client, no auth)
// ---------------------------------------------------------------------------

export async function validateApiKey(key: string): Promise<ApiKeyValidation | null> {
  const admin = createAdminClient()

  const keyHash = await sha256(key)

  const { data, error } = await admin
    .from('api_keys')
    .select('id, company_id, permissions, is_active')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data || !data.is_active) return null

  // Update last_used_at (fire and forget)
  Promise.resolve(
    admin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
  ).catch(() => {})

  return {
    company_id: data.company_id,
    permissions: data.permissions,
  }
}
