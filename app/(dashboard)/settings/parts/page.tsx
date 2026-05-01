import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PartsManager from './parts-manager'

export default async function PartsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/today')
  }

  return <PartsManager />
}
