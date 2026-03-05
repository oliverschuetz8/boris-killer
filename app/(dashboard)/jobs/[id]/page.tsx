import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob } from '@/app/actions/jobs'
import JobCostSummary from './job-cost-summary'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const job = await getJob(id)

  if (!job) {
    notFound()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-gray-500">{job.job_number}</p>
        </div>
        <div className="flex items-center gap-2">
          {(job.status === 'scheduled' || job.status === 'in_progress') && (
            <Link
              href={`/jobs/${id}/execute`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              {job.status === 'in_progress' ? '▶ Continue Job' : '▶ Start Job'}
            </Link>
          )}
          <Link 
            href={`/jobs/${id}/edit`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Edit Job
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 pl-2">Status</label>
            <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize`}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 pl-2">Priority</label>
            <span className="inline-block px-2 py-1 rounded-full text-sm font-medium capitalize bg-slate-100 text-slate-700">
              {job.priority}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <p className="text-gray-900">{job.customer?.name}</p>
          {job.customer?.email && (
            <p className="text-sm text-gray-500">{job.customer.email}</p>
          )}
        </div>

        {/* Site */}
        {job.site && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
            <p className="text-gray-900">{job.site.site_name || 'Main Site'}</p>
            <p className="text-sm text-gray-500">
              {job.site.address_line1}, {job.site.city} {job.site.postcode}
            </p>
          </div>
        )}

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start</label>
            <p className="text-gray-900">
              {job.scheduled_start 
                ? new Date(job.scheduled_start).toLocaleString()
                : 'Not scheduled'
              }
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled End</label>
            <p className="text-gray-900">
              {job.scheduled_end 
                ? new Date(job.scheduled_end).toLocaleString()
                : 'Not scheduled'
              }
            </p>
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p className="text-gray-900 whitespace-pre-wrap">{job.description}</p>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <p className="text-gray-900 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {/* Assigned Workers */}
        {job.assignments && job.assignments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Workers</label>
            <div className="space-y-2">
              {job.assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-2">
                  <span className="text-gray-900">{assignment.user.full_name}</span>
                  {assignment.role && (
                    <span className="text-xs text-gray-500 capitalize">({assignment.role})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cost Summary */}
      <div className="mt-6">
        <JobCostSummary jobId={id} />
      </div>

      {/* Back button */}
      <div className="mt-6"></div>

      {/* Back button */}
      <div className="mt-6">
        <Link href="/jobs" className="text-blue-600 hover:underline">
          ← Back to Jobs
        </Link>
      </div>
    </div>
  )
}