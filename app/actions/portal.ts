'use server'

import { createClient } from '@/lib/supabase/server'
import { createPortalLink, revokePortalLink } from '@/lib/services/portal'
import { revalidatePath } from 'next/cache'

export async function generatePortalLink(jobId: string, companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is admin or manager
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    throw new Error('Only admins and managers can generate portal links')
  }

  const link = await createPortalLink(jobId, companyId, user.id)
  revalidatePath(`/jobs/${jobId}`)
  return link
}

export async function revokePortalLinkAction(linkId: string, jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify user is admin or manager
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    throw new Error('Only admins and managers can revoke portal links')
  }

  await revokePortalLink(linkId)
  revalidatePath(`/jobs/${jobId}`)
}
