'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { deleteJob, updateJobStatus } from '@/app/actions/jobs'
import SearchFilter, { type FilterDef } from '@/components/ui/search-filter'
import type { JobWithRelations } from '@/lib/types/database'

interface JobsListProps {
  initialJobs: JobWithRelations[]
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

function formatDateLocal(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function startOfWeek(d: Date): Date {
  const out = startOfDay(d)
  const day = out.getDay() // 0 = Sunday
  const diff = (day === 0 ? -6 : 1 - day) // ISO week starts Monday
  out.setDate(out.getDate() + diff)
  return out
}

export function JobsList({ initialJobs }: JobsListProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: '',
    priority: '',
    customer: '',
    scheduled: '',
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Build dynamic customer options from jobs
  const customerOptions = useMemo(() => {
    const map = new Map<string, string>()
    jobs.forEach(j => {
      if (j.customer?.name) {
        map.set(j.customer.name.toLowerCase(), j.customer.name)
      }
    })
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    return [
      { value: '', label: 'All customers' },
      ...sorted.map(([value, label]) => ({ value, label })),
    ]
  }, [jobs])

  const filters: FilterDef[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: '', label: 'All statuses' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: '', label: 'Any priority' },
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'normal', label: 'Normal' },
        { value: 'low', label: 'Low' },
      ],
    },
    {
      key: 'customer',
      label: 'Customer',
      options: customerOptions,
    },
    {
      key: 'scheduled',
      label: 'Scheduled',
      options: [
        { value: '', label: 'Any time' },
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This week' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'past', label: 'Past' },
        { value: 'unscheduled', label: 'Unscheduled' },
      ],
    },
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = startOfDay(new Date())
    const weekStart = startOfWeek(new Date())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return jobs.filter(job => {
      // Status
      if (activeFilters.status && job.status !== activeFilters.status) return false
      // Priority
      if (activeFilters.priority && job.priority !== activeFilters.priority) return false
      // Customer
      if (activeFilters.customer) {
        const name = job.customer?.name?.toLowerCase() || ''
        if (name !== activeFilters.customer) return false
      }
      // Scheduled bucket
      if (activeFilters.scheduled) {
        const ss = job.scheduled_start ? new Date(job.scheduled_start) : null
        switch (activeFilters.scheduled) {
          case 'unscheduled':
            if (ss) return false
            break
          case 'today': {
            if (!ss) return false
            const d = startOfDay(ss)
            if (d.getTime() !== today.getTime()) return false
            break
          }
          case 'this_week': {
            if (!ss) return false
            if (ss < weekStart || ss >= weekEnd) return false
            break
          }
          case 'upcoming': {
            if (!ss || ss < today) return false
            break
          }
          case 'past': {
            if (!ss || ss >= today) return false
            break
          }
        }
      }

      // Text search
      if (q) {
        const haystack = [
          job.title,
          job.job_number,
          job.customer?.name,
          job.site?.city,
          job.site?.address_line1,
          job.site_manager,
          job.site_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [jobs, search, activeFilters])

  function handleFilterChange(key: string, value: string) {
    setActiveFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return
    try {
      await deleteJob(id)
      setJobs(jobs.filter(job => job.id !== id))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't delete this job. Refresh the page and try again, or contact support if it keeps happening."
      alert(message)
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
      {/* Search + filters */}
      <div className="mb-4">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search jobs by title, number, customer, city…"
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Result count */}
      <p className="text-xs text-slate-500 mb-3">
        {filtered.length === jobs.length
          ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''}`
          : `${filtered.length} of ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
      </p>

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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {jobs.length === 0
                    ? 'No jobs found. Create your first job to get started.'
                    : 'No jobs match your search or filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((job) => (
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
                      ? mounted ? formatDateLocal(job.scheduled_start) : ' '
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
                  <td className="px-6 py-4 text-left text-sm space-x-4">
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
