import { createClient } from '@/lib/supabase/server'

export async function getDashboardStats(companyId: string) {
  const supabase = await createClient()

  const [
    { count: activeJobs },
    { count: scheduledToday },
    { count: pendingInvoices },
    { count: totalCustomers },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['scheduled', 'in_progress']),

    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('scheduled_start', new Date().toISOString().split('T')[0])
      .lt('scheduled_start', new Date(Date.now() + 86400000).toISOString().split('T')[0]),

    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'sent'),

    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ])

  return {
    activeJobs: activeJobs ?? 0,
    scheduledToday: scheduledToday ?? 0,
    pendingInvoices: pendingInvoices ?? 0,
    totalCustomers: totalCustomers ?? 0,
  }
}