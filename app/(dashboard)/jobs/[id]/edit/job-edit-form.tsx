'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'

export default function JobEditForm({ job, customers }: { job: any, customers: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await updateJob(job.id, formData)
      router.push(`/jobs/${job.id}`)
      router.refresh()
    } catch (err) {
      setError('Failed to update job. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/jobs/${job.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to {job.title}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Job</h1>
        <p className="text-slate-500 mt-1">{job.job_number}</p>
      </div>

      <form onSubmit={handleSubmit}>
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
              <select
                name="status"
                defaultValue={job.status}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select
                name="priority"
                defaultValue={job.priority}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Internal Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={job.notes || ''}
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
          <Link href={`/jobs/${job.id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}