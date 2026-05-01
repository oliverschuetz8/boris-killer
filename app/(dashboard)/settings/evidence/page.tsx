import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EvidenceSettingsView from './evidence-settings-view'

export default async function EvidenceSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.company_id) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'manager') redirect('/dashboard')

  return <EvidenceSettingsView companyId={profile.company_id} />
}
