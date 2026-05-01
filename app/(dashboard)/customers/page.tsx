import Link from 'next/link'
import { getCustomers } from '@/app/actions/customers'
import { Button } from '@/components/ui/button'
import DeleteCustomerButton from './delete-customer-button'

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">{customers.length} total</p>
        </div>
        <Link href="/customers/new">
          <Button>+ New Customer</Button>
        </Link>
      </div>

      {/* List */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">No customers yet.</p>
          <Link href="/customers/new">
            <Button className="mt-4">Create your first customer</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.city || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.customer_sites?.length ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-6">
                      <Link href={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-800">
                        View
                      </Link>
                      <Link href={`/customers/${customer.id}/edit`} className="text-blue-600 hover:text-blue-800">
                        Edit
                      </Link>
                      <DeleteCustomerButton id={customer.id} name={customer.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
