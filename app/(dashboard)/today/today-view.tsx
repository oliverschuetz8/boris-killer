'use client'

import Link from 'next/link'
import { MapPin, User, Phone, Clock, ChevronRight, CheckCircle2, PlayCircle } from 'lucide-react'

interface Job {
  id: string
  title: string
  job_number: string
  status: string
  priority: string | null
  job_type: string | null
  evidence_category_id: string | null
  evidence_category: { name: string } | null
  site_manager: string | null
  scheduled_start: string | null
  started_at: string | null
  customer: { name: string; phone: string | null } | null
  site: { site_name: string | null; address_line1: string; city: string | null; postcode: string | null } | null
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Australia/Sydney',
  })
}

export default function TodayView({
  jobs,
  workerName,
  userId,
}: {
  jobs: Job[]
  workerName: string
  userId: string
}) {
  const inProgress = jobs.filter(j => j.status === 'in_progress')
  const scheduled = jobs.filter(j => j.status === 'scheduled')

  return (
    /*
      Mobile-first layout:
      - Full height, slate-50 background
      - All content in a single px-4 column, max-w-lg centered
        (max-w-lg = 512px — comfortably fills a phone screen without stretching on desktop)
      - py-6 top/bottom breathing room
      - gap-4 between all cards for consistent spacing
    */
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/*
          Greeting card
          - bg-white rounded-xl border: matches all other cards exactly
          - p-5: comfortable touch padding
          - Same max-w-lg as everything else → left/right edges align
        */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {formatDate()}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Hey {workerName.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {jobs.length === 0
              ? 'No jobs assigned to you today.'
              : `You have ${jobs.length} job${jobs.length !== 1 ? 's' : ''} today.`}
          </p>
        </div>

        {/* No jobs state */}
        {jobs.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium">All clear for today</p>
            <p className="text-sm text-slate-400 mt-1">Check back later for new jobs.</p>
          </div>
        )}

        {/* In Progress jobs */}
        {inProgress.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              In Progress
            </p>
            {inProgress.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Scheduled jobs */}
        {scheduled.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Scheduled Today
            </p>
            {scheduled.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const isInProgress = job.status === 'in_progress'
  const siteAddress = job.site
    ? [job.site.address_line1, job.site.city, job.site.postcode].filter(Boolean).join(', ')
    : null

  return (
    /*
      Job card — mobile-first touch design:
      - rounded-xl border: matches app card style
      - h-1 accent bar at top: yellow for in-progress, blue for scheduled
      - p-5: generous padding for easy reading on small screens
      - Big action button: py-4 tall target, easy to tap with thumb
      - Text sizes: base (16px) for main info, sm (14px) for details
    */
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Accent bar */}
      <div className={`h-1.5 w-full ${isInProgress ? 'bg-yellow-400' : 'bg-blue-500'}`} />

      <div className="p-5 space-y-4">

        {/* Title + time */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900 text-base leading-tight">{job.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">{job.job_number}</p>
              {job.evidence_category?.name ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                  {job.evidence_category.name}
                </span>
              ) : job.job_type ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize bg-indigo-50 text-indigo-700">
                  {job.job_type}
                </span>
              ) : null}
            </div>
          </div>
          {job.scheduled_start && (
            <div className="flex items-center gap-1 text-sm text-slate-500 flex-shrink-0 bg-slate-50 px-2 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">{formatTime(job.scheduled_start)}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          {job.customer && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-medium">{job.customer.name}</span>
              </div>
              {job.customer.phone && (
                <a
                  href={`tel:${job.customer.phone}`}
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  {job.customer.phone}
                </a>
              )}
            </div>
          )}

          {siteAddress && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{siteAddress}</span>
            </div>
          )}

          {job.site_manager && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500">Site manager:</span>
              <span className="font-medium text-slate-800">{job.site_manager}</span>
            </div>
          )}
        </div>

        {/*
          Action button — big touch target:
          py-4 = 16px top+bottom padding, making button ~52px tall
          Minimum recommended tap target size is 44px — this exceeds it
        */}
        <Link
          href={`/jobs/${job.id}/execute`}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-base font-bold transition-colors ${
            isInProgress
              ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-950'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <PlayCircle className="w-5 h-5" />
          {isInProgress ? 'Continue Job' : 'Start Job'}
        </Link>

        {/* Secondary link */}
        <Link
          href={`/jobs/${job.id}`}
          className="flex items-center justify-center gap-1 w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          View details
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

      </div>
    </div>
  )
}
