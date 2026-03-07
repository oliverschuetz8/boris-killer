import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Phone, User, Navigation, PlayCircle, Clock } from 'lucide-react'

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'manager') {
    redirect(`/jobs/${id}`)
  }

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      id, title, job_number, status, priority,
      scheduled_start, started_at,
      site_name, site_address_line1, site_city, site_state, site_postcode,
      site_manager, site_manager_phone,
      description, notes,
      customer:customers(name, phone)
    `)
    .eq('id', id)
    .single()

  if (!job) notFound()

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer

    const siteAddress = job.site_address_line1
      ? [job.site_address_line1, job.site_city, job.site_state, job.site_postcode].filter(Boolean).join(', ')
      : null
  
    const mapsUrl = siteAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(siteAddress)}`
      : null

  const isInProgress = job.status === 'in_progress'
  const isCompleted = job.status === 'completed'

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    /*
      overflow-hidden on the outer wrapper prevents any page scroll.
      h-[calc(100dvh-128px)]: 
        100dvh = full dynamic viewport height (accounts for mobile browser chrome)
        minus 64px top nav
        minus 64px bottom nav
      flex flex-col so children stack and fill the space.
    */
    <div
      className="max-w-lg mx-auto px-4 flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 128px)', paddingTop: '16px', paddingBottom: '12px' }}
    >

      {/* ── Header row: back + title + status badge ── */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <Link
          href="/jobs"
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{job.job_number}</p>
          <h1 className="text-base font-bold text-slate-900 leading-tight truncate">{job.title}</h1>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          isInProgress ? 'bg-yellow-100 text-yellow-800' :
          isCompleted  ? 'bg-green-100 text-green-800'  :
                         'bg-blue-100 text-blue-800'
        }`}>
          {isInProgress ? '● In Progress' : isCompleted ? '✓ Done' : '● Scheduled'}
        </span>
      </div>

      {/*
        ── Site briefing card ──
        flex-1 + min-h-0 lets it grow to fill all space between header and button.
        Inside: flex flex-col justify-between to spread rows evenly.
      */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0 mb-3">

        {/* Dark header — px-4 gives left padding to title */}
        <div className="bg-slate-900 px-4 py-3 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Site Briefing</p>
        </div>

        {/*
          Rows container:
          - px-4 py-4 gives consistent left/right padding (icons won't hug the edge)
          - flex-1 + justify-between spreads rows to fill card height
          - Each row has py-1 so there's vertical breathing room
        */}
        <div className="flex flex-col flex-1 justify-start gap-3 px-4 py-4 min-h-0">

          {/* Client row */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Client</p>
                <p className="text-sm font-bold text-slate-800">{customer?.name ?? 'Not assigned'}</p>
              </div>
            </div>
            
          </div>

          <div className="border-t border-slate-100 mx-1" />

          {/* Site address row */}
          <div className="flex items-start justify-between py-1 gap-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Site Address</p>
                {job.site_name && (
                  <p className="text-sm font-bold text-slate-800">{job.site_name}</p>
                )}
                <p className={`text-xs mt-0.5 ${job.site_name ? 'text-slate-500' : 'font-bold text-slate-800 text-sm'}`}>
                  {siteAddress ?? 'Not specified'}
                </p>
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors flex-shrink-0 mr-1"
              >
                <Navigation className="w-3 h-3" />
                Navigate
              </a>
            )}
          </div>

          <div className="border-t border-slate-100 mx-1" />

          {/* Site manager row */}
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Site Manager</p>
              <p className={`text-sm font-bold ${job.site_manager ? 'text-slate-800' : 'text-slate-400 italic font-normal'}`}>
                {job.site_manager ?? 'Not specified'}
              </p>
            </div>
          </div>
          

          {/* Scheduled row — only if present */}
          {job.scheduled_start && (
            <>
              <div className="border-t border-slate-100 mx-1" />
              <div className="flex items-center gap-3 py-1">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Scheduled</p>
                  <p className="text-sm font-bold text-slate-800">{formatDateTime(job.scheduled_start)}</p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Action button — flex-shrink-0 keeps it pinned at bottom ── */}
      {!isCompleted && (
        <div className="flex-shrink-0">
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
        </div>
      )}

    </div>
  )
}
