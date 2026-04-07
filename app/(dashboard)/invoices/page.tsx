import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInvoices } from '@/lib/services/invoices'
import InvoicesList from './invoices-list'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'worker') redirect('/today')

  const invoices = await getInvoices()

  return <InvoicesList invoices={invoices} />
}
