import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayRulesManager from './pay-rules-manager'

export default async function PayRulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role || '')) redirect('/dashboard')

  const { data: payRules } = await supabase
    .from('company_pay_rules')
    .select('*')
    .eq('company_id', profile!.company_id)
    .single()

  return (
    <PayRulesManager
      companyId={profile!.company_id}
      initialRules={payRules}
    />
  )
}