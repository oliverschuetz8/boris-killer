'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import {
  getEvidenceCategories,
  type EvidenceCategory,
} from '@/lib/services/evidence-categories'

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

interface Props {
  job: any
  customers: any[]
}

export default function JobEditForm({ job, customers }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<EvidenceCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(job.evidence_category_id || '')

  useEffect(() => {
    getEvidenceCategories().then(setCategories).catch(console.error)
  }, [])

  function toDatetimeLocal(dateStr: string | null) {
    if (!dateStr) return ''
    return new Date(dateStr).toISOString().slice(0, 16)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('evidence_category_id', selectedCategoryId || '')
      await updateJob(job.id, formData)
      router.push(`/jobs/${job.id}`)
      router.refresh()
    } catch {
      setError('Failed to update job. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="mb-2">
        <Link href={`/jobs/${job.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to {job.title}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Job</h1>
        <p className="text-slate-500 mt-1">{job.job_number}</p>
      </div>

      <form id="job-edit-form" onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={job.title}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={job.description || ''}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled Start</label>
              <input
                name="scheduled_start"
                type="datetime-local"
                defaultValue={toDatetimeLocal(job.scheduled_start)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled End</label>
              <input
                name="scheduled_end"
                type="datetime-local"
                defaultValue={toDatetimeLocal(job.scheduled_end)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <div className="relative">
                <select name="status" defaultValue={job.status}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-10">
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <div className="relative">
                <select name="priority" defaultValue={job.priority}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-10">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-10"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Hidden job_type for backwards compat */}
          <input type="hidden" name="job_type" value={
            categories.find(c => c.id === selectedCategoryId)?.name.toLowerCase().includes('inspection')
              ? 'inspection'
              : 'installation'
          } />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Internal Notes</label>
            <textarea name="notes" rows={2} defaultValue={job.notes || ''}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Site Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 border-t border-slate-100 pt-4">Site Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Name</label>
              <input name="site_name" defaultValue={job.site_name ?? ''} placeholder="e.g. Head Office, Warehouse"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
              <input name="site_address_line1" defaultValue={job.site_address_line1 ?? ''} placeholder="Street address"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input name="site_city" defaultValue={job.site_city ?? ''} placeholder="Sydney"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <div className="relative">
                  <select name="site_state" defaultValue={job.site_state ?? ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-10">
                  <option value="">Select...</option>
                  {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode</label>
                <input name="site_postcode" defaultValue={job.site_postcode ?? ''} placeholder="2000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Manager</label>
                <input name="site_manager" defaultValue={job.site_manager ?? ''} placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Manager Phone</label>
                <input name="site_manager_phone" defaultValue={job.site_manager_phone ?? ''} placeholder="e.g. 0412 345 678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>
      </form>

      {/* Cancel / Save */}
      <div className="flex items-center justify-end gap-3">
        <Link href={`/jobs/${job.id}`}>
          <Button variant="outline" type="button">Cancel</Button>
        </Link>
        <Button type="submit" form="job-edit-form" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
