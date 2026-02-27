'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createJob, getCustomers } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'

interface Customer {
  id: string
  name: string
  email: string | null
}

export default function NewJobPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCustomers().then(setCustomers).catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      await createJob(formData)
      router.push('/jobs')
      router.refresh()
    } catch (err) {
      setError('Failed to create job. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create New Job</h1>
        <p className="text-slate-500 mt-1">Fill in the details below to create a new job.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              placeholder="e.g. Fire Inspection – 12 Main St"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              name="customer_id"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">
                No customers yet.{' '}
                <Link href="/customers/new" className="text-blue-600 hover:underline">
                  Create one first
                </Link>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Scheduled Start
              </label>
              <input
                name="scheduled_start"
                type="datetime-local"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Scheduled End
              </label>
              <input
                name="scheduled_end"
                type="datetime-local"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                defaultValue="scheduled"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <select
                name="priority"
                defaultValue="normal"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Internal Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Any internal notes for the team…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href="/jobs">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Job'}
          </Button>
        </div>
      </form>
    </div>
  )
}