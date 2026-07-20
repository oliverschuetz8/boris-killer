'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { updateCustomer } from '@/app/actions/customers'
import { Button } from '@/components/ui/button'

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'builder', label: 'Builder' },
  { value: 'strata', label: 'Strata' },
  { value: 'facility_manager', label: 'Facility manager' },
  { value: 'owner', label: 'Owner' },
  { value: 'government', label: 'Government' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'individual', label: 'Individual' },
]

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'inactive', label: 'Inactive' },
]

interface CompanyUser { id: string; full_name?: string | null; email?: string | null }

const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const selectCls = 'w-full appearance-none px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Select({ name, defaultValue, children }: { name: string; defaultValue?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select name={name} defaultValue={defaultValue} className={selectCls}>{children}</select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
    </div>
  )
}

export default function CustomerEditForm({ customer, companyUsers = [] }: { customer: any; companyUsers?: CompanyUser[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      await updateCustomer(customer.id, formData)
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes to this customer. Check your connection and try again.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href={`/customers/${customer.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to {customer.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Account details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Customer name <span className="text-red-500">*</span>
            </label>
            <input name="name" required defaultValue={customer.name} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account type</label>
              <Select name="account_type" defaultValue={customer.account_type || ''}>
                <option value="">Select…</option>
                {ACCOUNT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Account status</label>
              <Select name="account_status" defaultValue={customer.account_status || 'active'}>
                {ACCOUNT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input name="email" type="email" defaultValue={customer.email || ''} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input name="phone" type="tel" defaultValue={customer.phone || ''} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Billing details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Billing details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing address</label>
            <input name="address_line1" defaultValue={customer.billing_address_line1 || ''} placeholder="Street address" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input name="city" defaultValue={customer.billing_city || ''} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
              <Select name="state" defaultValue={customer.billing_state || ''}>
                <option value="">Select…</option>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode</label>
              <input name="postcode" defaultValue={customer.billing_postcode || ''} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ABN</label>
              <input name="abn" defaultValue={customer.abn || ''} placeholder="00 000 000 000" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment terms</label>
              <input name="payment_terms" defaultValue={customer.payment_terms || ''} placeholder="e.g. Net 30" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Accounts phone</label>
              <input name="accounts_phone" type="tel" defaultValue={customer.accounts_phone || ''} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Accounts email</label>
            <input name="accounts_email" type="email" defaultValue={customer.accounts_email || ''} placeholder="accounts@example.com" className={inputCls} />
          </div>
        </div>

        {/* Relationship */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Relationship</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Managed by
                <span className="block text-xs font-normal text-slate-400 mt-0.5">The person on your team responsible for this customer.</span>
              </label>
              <Select name="account_manager_id" defaultValue={customer.account_manager_id || ''}>
                <option value="">Unassigned</option>
                {companyUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Next follow-up</label>
              <input name="next_followup_date" type="date" defaultValue={customer.next_followup_date || ''} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={3} defaultValue={customer.notes || ''} className={`${inputCls} resize-none`} />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href={`/customers/${customer.id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
