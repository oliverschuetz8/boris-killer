import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using service role key.
 * Bypasses RLS — use ONLY on the server for operations
 * that need to read data without an authenticated user
 * (e.g. customer portal via magic link).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
