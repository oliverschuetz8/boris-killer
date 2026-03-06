'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCustomer, createSite, updateSite, deleteSite } from '@/app/actions/customers'
import { Button } from '@/components/ui/button'
import { MapPin, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

interface Site {
  id: string
  site_name: string | null
  address_line1: string
  city: string | null
  state: string | null
  postcode: string | null
}

function SiteForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Site
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    site_name: initial?.site_name || '',
    address_line1: initial?.address_line1 || '',
    city: initial?.city || '',
    state: initial?.state || '',
    postcode: initial?.postcode || '',
  })

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Site Name</label>
        <input
          value={form.site_name}
          onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))}
          placeholder="e.g. Head Office, Warehouse, Site A"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Street Address <span className="text-red-500">*</span></label>
        <input
          value={form.address_line1}
          onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
          placeholder="Street address"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
          <input
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Sydney"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
          <select
            value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select…</option>
            {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Postcode</label>
          <input
            value={form.postcode}
            onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))}
            placeholder="2000"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.address_line1.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save Site'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-slate-600 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function CustomerEditForm({ customer }: { customer: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sites state
  const [sites, setSites] = useState<Site[]>(customer.customer_sites || [])
  const [showAddSite, setShowAddSite] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [siteSaving, setSiteSaving] = useState(false)

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
      setError('Failed to update customer. Please try again.')
      setLoading(false)
    }
  }

  async function handleAddSite(data: any) {
    if (!data.address_line1.trim()) return
    setSiteSaving(true)
    try {
      const newSite = await createSite(customer.id, data)
      setSites(prev => [...prev, newSite])
      setShowAddSite(false)
    } finally {
      setSiteSaving(false)
    }
  }

  async function handleUpdateSite(siteId: string, data: any) {
    setSiteSaving(true)
    try {
      await updateSite(siteId, customer.id, data)
      setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...data } : s))
      setEditingSiteId(null)
    } finally {
      setSiteSaving(false)
    }
  }

  async function handleDeleteSite(siteId: string) {
    if (!confirm('Delete this site? This cannot be undone.')) return
    await deleteSite(siteId, customer.id)
    setSites(prev => prev.filter(s => s.id !== siteId))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/customers/${customer.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to {customer.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              defaultValue={customer.name}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={customer.email || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input
                name="phone"
                type="tel"
                defaultValue={customer.phone || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Address</label>
            <input
              name="address_line1"
              defaultValue={customer.billing_address_line1 || ''}
              placeholder="Street address"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input
                name="city"
                defaultValue={customer.billing_city || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
              <select
                name="state"
                defaultValue={customer.billing_state || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select…</option>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode</label>
              <input
                name="postcode"
                defaultValue={customer.billing_postcode || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={customer.notes || ''}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href={`/customers/${customer.id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* ── Sites Section (outside the main form so submits don't conflict) ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Job Sites</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage site addresses for this customer.
            </p>
          </div>
          {!showAddSite && (
            <button
              onClick={() => setShowAddSite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Site
            </button>
          )}
        </div>

        {/* Add site form */}
        {showAddSite && (
          <SiteForm
            onSave={handleAddSite}
            onCancel={() => setShowAddSite(false)}
            saving={siteSaving}
          />
        )}

        {/* Existing sites */}
        {sites.length === 0 && !showAddSite ? (
          <div className="text-center py-8">
            <MapPin className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No sites yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">Add a site to assign to jobs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map(site => (
              <div key={site.id}>
                {editingSiteId === site.id ? (
                  <SiteForm
                    initial={site}
                    onSave={(data) => handleUpdateSite(site.id, data)}
                    onCancel={() => setEditingSiteId(null)}
                    saving={siteSaving}
                  />
                ) : (
                  <div className="flex items-start justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        {site.site_name && (
                          <p className="text-sm font-semibold text-slate-800">{site.site_name}</p>
                        )}
                        <p className="text-sm text-slate-600">{site.address_line1}</p>
                        {(site.city || site.state || site.postcode) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {[site.city, site.state, site.postcode].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <button
                        onClick={() => setEditingSiteId(site.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
