'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Briefcase, MapPin, User as UserIcon, Calendar as CalendarIcon,
  RotateCw, ExternalLink, Edit3, Trash2, Check, Phone, Video, Tag,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import type { CalendarEvent } from '@/lib/services/calendar-events'
import {
  toggleCalendarEventComplete, deleteCalendarEvent,
} from '@/app/actions/calendar-events'
import { type CalendarItem, styleForItem, itemTypeLabel } from './calendar-types'

const STATUS_BG: Record<string, string> = {
  draft: '#94a3b8',
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  on_hold: '#64748b',
  completed: '#10b981',
  cancelled: '#ef4444',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

const JOB_TYPE_LABEL: Record<string, string> = {
  installation: 'Installation',
  maintenance: 'Maintenance',
  inspection: 'Inspection',
}

interface EventPanelProps {
  item: CalendarItem | null
  onClose: () => void
  onEventUpdated: (event: CalendarEvent) => void
  onEventDeleted: (id: string) => void
  onEventEditRequested: (event: CalendarEvent) => void
  onError: (msg: string) => void
}

export function EventPanel({
  item, onClose, onEventUpdated, onEventDeleted, onEventEditRequested, onError,
}: EventPanelProps) {
  return (
    <Sheet open={!!item} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {item?.kind === 'job' && <JobBody event={item.data} />}
        {item?.kind === 'event' && (
          <EventBody
            event={item.data}
            onClose={onClose}
            onEventUpdated={onEventUpdated}
            onEventDeleted={onEventDeleted}
            onEditRequested={onEventEditRequested}
            onError={onError}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function JobBody({ event }: { event: import('@/lib/services/schedule').ScheduleEvent }) {
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
        <SheetDescription className="sr-only">Job details</SheetDescription>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Briefcase className="w-3 h-3" />
              <span>{event.job_number}</span>
            </div>
            <SheetTitle className="text-lg font-semibold text-slate-900 leading-tight">
              {event.title}
            </SheetTitle>
          </div>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: STATUS_BG[event.status] ?? STATUS_BG.scheduled }}
          >
            {STATUS_LABEL[event.status] ?? event.status}
          </span>
        </div>
      </SheetHeader>

      <div className="px-6 py-5 space-y-5">
        {event.customer_name && (
          <DetailRow icon={Briefcase} label="Customer" value={event.customer_name} />
        )}

        {(event.site_address || event.site_city) && (
          <DetailRow
            icon={MapPin}
            label="Site"
            value={[event.site_address, event.site_city].filter(Boolean).join(', ')}
          />
        )}

        <div className="flex items-start gap-3">
          <CalendarIcon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">Scheduled</div>
            <div className="text-sm text-slate-900">
              {format(new Date(event.scheduled_start), 'EEE d MMM, h:mm a')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              until {format(new Date(event.scheduled_end), 'EEE d MMM, h:mm a')}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserIcon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500 mb-1">Assigned workers</div>
            {event.assignments.length === 0 ? (
              <div className="text-sm text-slate-500 italic">No workers assigned</div>
            ) : (
              <ul className="space-y-1">
                {event.assignments.map((a) => (
                  <li key={a.user_id} className="text-sm text-slate-900">
                    {a.full_name || 'Unnamed worker'}
                    {a.trade && <span className="text-xs text-slate-500 ml-1">· {a.trade}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {event.job_type && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
              {JOB_TYPE_LABEL[event.job_type] ?? event.job_type}
            </span>
          )}
          {event.priority && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
              {PRIORITY_LABEL[event.priority] ?? event.priority} priority
            </span>
          )}
        </div>

        {event.recurrence_months && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <RotateCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              Repeats every {event.recurrence_months} month{event.recurrence_months !== 1 && 's'}.
              A draft for the next service will be auto-created when this job is completed.
            </div>
          </div>
        )}

        {event.parent_job_id && (
          <div className="text-xs text-slate-500">
            Created from a recurring job:{' '}
            <Link href={`/jobs/${event.parent_job_id}`} className="text-blue-600 hover:underline">
              view original
            </Link>
          </div>
        )}

        {event.description && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
        <Link
          href={`/jobs/${event.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Open job
        </Link>
        <Link
          href={`/jobs/${event.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
        >
          <Edit3 className="h-4 w-4" />
          Edit schedule
        </Link>
      </div>
    </div>
  )
}

function EventBody({
  event, onEventUpdated, onEventDeleted, onEditRequested, onError,
}: {
  event: CalendarEvent
  onClose: () => void
  onEventUpdated: (event: CalendarEvent) => void
  onEventDeleted: (id: string) => void
  onEditRequested: (event: CalendarEvent) => void
  onError: (msg: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [completed, setCompleted] = useState(event.is_completed)
  const style = styleForItem({ kind: 'event', data: event })
  const Icon = style.icon

  const handleToggleComplete = () => {
    const next = !completed
    setCompleted(next)
    startTransition(async () => {
      try {
        await toggleCalendarEventComplete(event.id, next)
        onEventUpdated({ ...event, is_completed: next })
      } catch (err: any) {
        setCompleted(!next)
        onError(err?.message || 'Failed to update event')
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${event.title}"?`)) return
    startTransition(async () => {
      try {
        await deleteCalendarEvent(event.id)
        onEventDeleted(event.id)
      } catch (err: any) {
        onError(err?.message || 'Failed to delete event')
      }
    })
  }

  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
        <SheetDescription className="sr-only">Event details</SheetDescription>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Icon className="w-3 h-3" />
              <span>{itemTypeLabel({ kind: 'event', data: event })}</span>
            </div>
            <SheetTitle
              className={`text-lg font-semibold leading-tight ${
                completed ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {event.title}
            </SheetTitle>
          </div>
          <span
            className="inline-flex items-center w-2 h-2 rounded-full flex-shrink-0 mt-2"
            style={{ backgroundColor: style.edge }}
            aria-hidden
          />
        </div>
      </SheetHeader>

      <div className="px-6 py-5 space-y-5">
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">When</div>
            <div className="text-sm text-slate-900">
              {event.is_all_day
                ? format(new Date(event.start_time), 'EEE d MMM (all day)')
                : format(new Date(event.start_time), 'EEE d MMM, h:mm a')}
            </div>
            {event.end_time && !event.is_all_day && (
              <div className="text-xs text-slate-500 mt-0.5">
                until {format(new Date(event.end_time), 'h:mm a')}
              </div>
            )}
          </div>
        </div>

        {event.location && (
          <DetailRow icon={MapPin} label="Location" value={event.location} />
        )}

        {event.video_link && (
          <div className="flex items-start gap-3">
            <Video className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-slate-500 mb-0.5">Video link</div>
              <a
                href={event.video_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {event.video_link}
              </a>
            </div>
          </div>
        )}

        {event.customer_name && (
          <DetailRow icon={Briefcase} label="Customer" value={event.customer_name}
            href={event.customer_id ? `/customers/${event.customer_id}` : undefined} />
        )}

        {event.lead_name && (
          <DetailRow icon={Phone} label="Lead" value={event.lead_name}
            href={`/leads`} />
        )}

        {event.job_number && (
          <DetailRow icon={Briefcase} label="Linked job" value={event.job_number}
            href={event.job_id ? `/jobs/${event.job_id}` : undefined} />
        )}

        {event.creator_name && (
          <DetailRow icon={UserIcon} label="Created by" value={event.creator_name} />
        )}

        <div className="flex items-start gap-3">
          <Tag className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">Visibility</div>
            <div className="text-sm text-slate-900 capitalize">{event.visibility}</div>
          </div>
        </div>

        {event.reminder_minutes_before !== null && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <RotateCw className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              Reminder set: {event.reminder_minutes_before} minutes before.
              {event.reminder_sent_at && ' Sent.'}
            </div>
          </div>
        )}

        {event.description && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
        <button
          onClick={handleToggleComplete}
          disabled={isPending}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${
            completed
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Check className="h-4 w-4" />
          {completed ? 'Mark as not done' : 'Mark as done'}
        </button>
        <button
          onClick={() => onEditRequested(event)}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 disabled:opacity-50"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon, label, value, href,
}: {
  icon: typeof Briefcase
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        {href ? (
          <Link href={href} className="text-sm font-medium text-blue-600 hover:underline">
            {value}
          </Link>
        ) : (
          <div className="text-sm font-medium text-slate-900">{value}</div>
        )}
      </div>
    </div>
  )
}
