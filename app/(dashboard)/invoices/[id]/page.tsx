import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInvoice } from '@/lib/services/invoices'
import InvoiceDetailView from './invoice-detail-view'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'worker') redirect('/jobs')

  const invoice = await getInvoice(id)
  if (!invoice) notFound()

  return <InvoiceDetailView invoice={invoice} />
}