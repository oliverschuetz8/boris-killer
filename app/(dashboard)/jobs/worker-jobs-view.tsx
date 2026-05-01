import Link from 'next/link'
import { MapPin, User, Clock, ChevronRight } from 'lucide-react'

interface Job {
  id: string
  title: string
  job_number: string
  status: string
  priority: string | null
  scheduled_start: string | null
  started_at: string | null
  site_manager: string | null
  customer: { name: string; phone: string | null } | null
  site: {
    site_name: string | null
    address_line1: string
    city: string | null
    state: string | null
    postcode: string | null
  } | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Australia/Sydney',
  })
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function WorkerJobCard({ job }: { job: Job }) {
  const isInProgress = job.status === 'in_progress'
  const siteAddress = job.site
    ? [job.site.address_line1, job.site.city, job.site.state]
        .filter(Boolean).join(', ')
    : null

  return (
    <Link
      href={`/jobs/${job.id}/worker-detail`}
      className="block bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      {/* Coloured top bar */}
      <div className={`h-1.5 w-full ${isInProgress ? 'bg-yellow-400' : 'bg-blue-500'}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">

            {/* Status badge + job number */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                isInProgress
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isInProgress ? '● In Progress' : '● Scheduled'}
              </span>
              <span className="text-xs text-slate-400">{job.job_number}</span>
            </div>

            {/* Title */}
            <p className="font-bold text-slate-900 text-base leading-tight mb-2">{job.title}</p>

            {/* Customer */}
            {job.customer && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{job.customer.name}</span>
              </div>
            )}

            {/* Site address */}
            {siteAddress && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{siteAddress}</span>
              </div>
            )}

            {/* Scheduled time */}
            {job.scheduled_start && !isInProgress && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{formatDate(job.scheduled_start)} · {formatTime(job.scheduled_start)}</span>
              </div>
            )}

          </div>

          {/* Chevron */}
          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  )
}

export default function WorkerJobsView({ jobs }: { jobs: Job[] }) {
  const inProgress = jobs.filter(j => j.status === 'in_progress')
  const scheduled = jobs.filter(j => j.status === 'scheduled')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

      <h1 className="text-xl font-bold text-slate-900">My Jobs</h1>

      {jobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 font-medium">No active jobs</p>
          <p className="text-sm text-slate-400 mt-1">No scheduled or in-progress jobs right now.</p>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            In Progress
          </p>
          {inProgress.map(job => <WorkerJobCard key={job.id} job={job} />)}
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Scheduled
          </p>
          {scheduled.map(job => <WorkerJobCard key={job.id} job={job} />)}
        </div>
      )}

    </div>
  )
}
