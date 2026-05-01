import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanySettings, getCompanyLogoUrl, getCompanyCredentials } from '@/lib/services/company-settings'
import CompanySettingsView from './company-settings-view'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const [settings, logoUrl, credentials] = await Promise.all([
    getCompanySettings(),
    getCompanyLogoUrl(),
    getCompanyCredentials(),
  ])

  return (
    <CompanySettingsView
      settings={settings}
      logoUrl={logoUrl}
      credentials={credentials}
      userRole={profile.role}
    />
  )
}
