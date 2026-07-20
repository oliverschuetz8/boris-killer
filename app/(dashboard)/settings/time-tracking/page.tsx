import { createClient } from '@/lib/supabase/server'
import { requireAdminOrManager } from '@/lib/auth/require-role'
import TimeTrackingSettingsView from './time-tracking-settings-view'

export default async function TimeTrackingSettingsPage() {
  const { companyId, role } = await requireAdminOrManager()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('day_hours_source, job_attribution_source, worker_self_edit_enabled')
    .eq('id', companyId)
    .single()

  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle()

  return (
    <TimeTrackingSettingsView
      initialSettings={{
        day_hours_source: company?.day_hours_source ?? 'in_app',
        job_attribution_source: company?.job_attribution_source ?? 'in_app',
        worker_self_edit_enabled: company?.worker_self_edit_enabled ?? true,
      }}
      xeroConnected={!!xeroConn}
      canEdit={role === 'admin'}
    />
  )
}
