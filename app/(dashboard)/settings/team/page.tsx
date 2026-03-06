import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManager from './team-manager'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    redirect('/dashboard')
  }

  const { data: teamMembers } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone')
    .eq('company_id', profile.company_id)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  return (
    <TeamManager
      teamMembers={teamMembers || []}
      currentUserId={user.id}
    />
  )
}