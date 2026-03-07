import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCustomer } from '@/app/actions/customers'
import { Button } from '@/components/ui/button'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
            ← Back to Customers
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
          {customer.customer_type && (
            <span className="text-sm text-slate-500 capitalize">{customer.customer_type}</span>
          )}
        </div>
        <Link href={`/customers/${id}/edit`}>
          <Button>Edit Customer</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Contact Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Contact Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Email</p>
              <p className="text-sm text-slate-900">{customer.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Phone</p>
              <p className="text-sm text-slate-900">{customer.phone || '—'}</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Billing Address</h2>
          {customer.billing_address_line1 ? (
            <p className="text-sm text-slate-900">
              {customer.billing_address_line1}<br />
              {[customer.billing_city, customer.billing_state, customer.billing_postcode]
                .filter(Boolean).join(', ')}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No address on file</p>
          )}
        </div>

       
        {/* Notes */}
        {customer.notes && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Notes</h2>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}