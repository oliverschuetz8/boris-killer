'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteJob, updateJobStatus } from '@/app/actions/jobs'
import type { JobWithRelations } from '@/lib/types/database'

interface JobsListProps {
  initialJobs: JobWithRelations[]
}

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
}

const PRIORITY_COLORS = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

export function JobsList({ initialJobs }: JobsListProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [filter, setFilter] = useState<string>('all')

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter(job => job.status === filter)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    try {
      await deleteJob(id)
      setJobs(jobs.filter(job => job.id !== id))
    } catch (error) {
      alert('Failed to delete job')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateJobStatus(id, newStatus)
      setJobs(jobs.map(job =>
        job.id === id ? { ...job, status: newStatus } : job
      ))
    } catch (error) {
      alert('Failed to update status')
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg capitalize transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scheduled
              </th>
              <th className="pl-8 pr-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No jobs found. Create your first job to get started.
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-500">{job.job_number}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{job.customer?.name}</div>
                    {job.site && (
                      <div className="text-sm text-gray-500">{job.site.city}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.scheduled_start
                      ? new Date(job.scheduled_start).toLocaleDateString()
                      : 'Not scheduled'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        STATUS_COLORS[job.status as keyof typeof STATUS_COLORS] || 'bg-gray-100'
                      }`}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium capitalize ${
                      PRIORITY_COLORS[job.priority as keyof typeof PRIORITY_COLORS] || 'text-gray-600'
                    }`}>
                      {job.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left text-sm space-x-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </Link>
                    <Link
                      href={`/jobs/${job.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
