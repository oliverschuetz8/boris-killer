'use server'

import { createClient } from '@/lib/supabase/server'
import type { EmailGroup } from '@/lib/email/types'

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

export async function getEmailGroups(): Promise<EmailGroup[]> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { data, error } = await supabase
    .from('email_groups')
    .select('*')
    .order('name')

  if (error) throw new Error(`Failed to load groups: ${error.message}`)
  return (data || []) as EmailGroup[]
}

export async function createEmailGroup(input: {
  name: string
  description?: string | null
  member_user_ids?: string[]
  member_emails?: string[]
}): Promise<EmailGroup> {
  const { supabase, company_id, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const trimmedName = input.name.trim()
  if (!trimmedName) throw new Error('Name is required')

  const { data, error } = await supabase
    .from('email_groups')
    .insert({
      company_id,
      name: trimmedName,
      description: input.description?.trim() || null,
      member_user_ids: input.member_user_ids ?? [],
      member_emails: (input.member_emails ?? [])
        .map(e => e.trim())
        .filter(e => e && e.includes('@')),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create group: ${error.message}`)
  return data as EmailGroup
}

export async function updateEmailGroup(
  id: string,
  input: {
    name?: string
    description?: string | null
    member_user_ids?: string[]
    member_emails?: string[]
  },
): Promise<EmailGroup> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const updates: Record<string, any> = {}
  if (input.name !== undefined) {
    const trimmed = input.name.trim()
    if (!trimmed) throw new Error('Name is required')
    updates.name = trimmed
  }
  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null
  }
  if (input.member_user_ids !== undefined) {
    updates.member_user_ids = input.member_user_ids
  }
  if (input.member_emails !== undefined) {
    updates.member_emails = input.member_emails
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))
  }

  const { data, error } = await supabase
    .from('email_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update group: ${error.message}`)
  return data as EmailGroup
}

export async function deleteEmailGroup(id: string): Promise<void> {
  const { supabase, role } = await getProfile()
  if (role !== 'admin' && role !== 'manager') {
    throw new Error('Admin or manager only')
  }

  const { error } = await supabase
    .from('email_groups')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete group: ${error.message}`)
}
