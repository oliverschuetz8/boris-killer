import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-only guard for admin/manager-only pages.
 * Redirects unauthenticated users to /login and workers to /today.
 * Returns the authenticated user's id, role, and company_id.
 */
export async function requireAdminOrManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'worker') redirect('/today')

  return {
    userId: user.id,
    role: profile.role as string,
    companyId: profile.company_id as string,
  }
}
