'use client'

import { useMemo, useState, useTransition, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar'
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import {
  Search, ChevronDown, X, AlertTriangle, CheckCircle2, XCircle, Sidebar,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { ScheduleEvent, CalendarWorker } from '@/lib/services/schedule'
import type { CalendarEvent } from '@/lib/services/calendar-events'
import { rescheduleJob, reassignJobToWorker } from '@/app/actions/schedule'
import { rescheduleCalendarEvent } from '@/app/actions/calendar-events'
import {
  type CalendarItem,
  styleForItem, itemId, itemStart, itemEnd, itemTitle, itemSubtitle,
} from './calendar-types'
import { EventPanel } from './event-panel'
import { EventComposer } from './event-composer'
import { TodayPanel } from './today-panel'
import { Plus } from 'lucide-react'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './calendar-styles.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: { item: CalendarItem }
  resourceId?: string
}

interface RbcResource {
  resourceId: string
  resourceTitle: string
}

const UNASSIGNED_RESOURCE_ID = '__unassigned__'

const DnDCalendar = withDragAndDrop<RbcEvent>(Calendar)

interface ScheduleViewProps {
  initialJobs: ScheduleEvent[]
  initialCalendarEvents: CalendarEvent[]
  workers: CalendarWorker[]
  customers: { id: string; name: string }[]
  currentUserRole: string
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'job', label: 'Jobs' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'call', label: 'Calls' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'task', label: 'Tasks' },
  { value: 'material_delivery', label: 'Material deliveries' },
  { value: 'interview', label: 'Interviews' },
  { value: 'block', label: 'Focus blocks' },
  { value: 'custom', label: 'Custom' },
]

interface Toast {
  id: number
  kind: 'success' | 'warning' | 'error'
  text: string
}

function findOverlap(
  movedEvent: ScheduleEvent,
  newStart: Date,
  newEnd: Date,
  allJobs: ScheduleEvent[],
): { workerName: string; jobNumber: string } | null {
  if (movedEvent.assignments.length === 0) return null
  const movedWorkerIds = new Set(movedEvent.assignments.map(a => a.user_id))

  for (const other of allJobs) {
    if (other.id === movedEvent.id) continue
    const otherStart = new Date(other.scheduled_start)
    const otherEnd = new Date(other.scheduled_end)
    const overlaps = newStart < otherEnd && newEnd > otherStart
    if (!overlaps) continue
    const conflicting = other.assignments.find(a => movedWorkerIds.has(a.user_id))
    if (conflicting) {
      return {
        workerName: conflicting.full_name ?? 'A worker',
        jobNumber: other.job_number,
      }
    }
  }
  return null
}

export function ScheduleView({
  initialJobs,
  initialCalendarEvents,
  workers,
  customers,
}: ScheduleViewProps) {
  const [jobs, setJobs] = useState<ScheduleEvent[]>(initialJobs)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState<Date>(new Date())
  const [layoutMode, setLayoutMode] = useState<'time' | 'worker'>('time')
  const [showTodayPanel, setShowTodayPanel] = useState(false)
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set())
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [composerState, setComposerState] = useState<
    | { mode: 'closed' }
    | { mode: 'create'; slot?: { start: Date; end: Date } | null }
    | { mode: 'edit'; event: CalendarEvent }
  >({ mode: 'closed' })

  const [toasts, setToasts] = useState<Toast[]>([])
  const pushToast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, kind, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const allItems = useMemo<CalendarItem[]>(() => {
    const j: CalendarItem[] = jobs.map(d => ({ kind: 'job', data: d }))
    const e: CalendarItem[] = calendarEvents.map(d => ({ kind: 'event', data: d }))
    return [...j, ...e]
  }, [jobs, calendarEvents])

  const filteredItems = useMemo<CalendarItem[]>(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter(item => {
      if (q) {
        const title = itemTitle(item).toLowerCase()
        const subtitle = (itemSubtitle(item) ?? '').toLowerCase()
        const jobNumber = item.kind === 'job' ? item.data.job_number.toLowerCase() : ''
        if (!title.includes(q) && !subtitle.includes(q) && !jobNumber.includes(q)) {
          return false
        }
      }
      if (selectedTypes.size > 0) {
        const t = item.kind === 'job' ? 'job' : item.data.event_type
        if (!selectedTypes.has(t)) return false
      }
      if (item.kind === 'job') {
        if (selectedStatuses.size > 0 && !selectedStatuses.has(item.data.status)) return false
        if (selectedCustomerId && item.data.customer_id !== selectedCustomerId) return false
        if (selectedWorkers.size > 0) {
          const hasMatch = item.data.assignments.some(a => selectedWorkers.has(a.user_id))
          if (!hasMatch) return false
        }
      } else {
        // Events: status/worker filters don't apply; customer filter does (loosely)
        if (selectedStatuses.size > 0) return false
        if (selectedCustomerId && item.data.customer_id !== selectedCustomerId) return false
        if (selectedWorkers.size > 0) return false
      }
      return true
    })
  }, [allItems, search, selectedTypes, selectedStatuses, selectedWorkers, selectedCustomerId])

  const selectedItem = useMemo<CalendarItem | null>(() => {
    if (!selectedItemId) return null
    return allItems.find(it => itemId(it) === selectedItemId) ?? null
  }, [selectedItemId, allItems])

  const rbcEvents = useMemo<RbcEvent[]>(() => {
    if (layoutMode === 'time') {
      return filteredItems.map(item => ({
        id: itemId(item),
        title: itemTitle(item),
        start: itemStart(item),
        end: itemEnd(item),
        resource: { item },
      }))
    }
    // worker mode: only jobs (events have no worker assignment)
    const exploded: RbcEvent[] = []
    for (const item of filteredItems) {
      if (item.kind !== 'job') continue
      const ev = item.data
      const start = new Date(ev.scheduled_start)
      const end = new Date(ev.scheduled_end)
      if (ev.assignments.length === 0) {
        exploded.push({
          id: `${ev.id}__${UNASSIGNED_RESOURCE_ID}`,
          title: ev.title,
          start, end,
          resource: { item },
          resourceId: UNASSIGNED_RESOURCE_ID,
        })
      } else {
        for (const a of ev.assignments) {
          exploded.push({
            id: `${ev.id}__${a.user_id}`,
            title: ev.title,
            start, end,
            resource: { item },
            resourceId: a.user_id,
          })
        }
      }
    }
    return exploded
  }, [filteredItems, layoutMode])

  const resources = useMemo<RbcResource[] | undefined>(() => {
    if (layoutMode !== 'worker') return undefined
    const list: RbcResource[] = workers.map(w => ({
      resourceId: w.id,
      resourceTitle: w.full_name || w.email,
    }))
    list.push({ resourceId: UNASSIGNED_RESOURCE_ID, resourceTitle: 'Unassigned' })
    return list
  }, [layoutMode, workers])

  const eventPropGetter = (event: RbcEvent) => {
    const item = event.resource.item
    const style = styleForItem(item)
    const completed = item.kind === 'event' ? item.data.is_completed : item.data.status === 'completed'
    return {
      style: {
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.edge}`,
        borderRadius: '3px',
        color: '#1e293b',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 500,
        boxShadow: 'none',
        opacity: completed ? 0.55 : 1,
        textDecoration: completed ? 'line-through' : 'none',
      },
    }
  }

  const EventContent = ({ event }: { event: RbcEvent }) => {
    const item = event.resource.item
    const style = styleForItem(item)
    const Icon = style.icon
    const startDate = itemStart(item)
    const time = format(startDate, 'h:mm a').replace(' ', '').toLowerCase()
    return (
      <div className="flex items-center gap-1 leading-tight overflow-hidden h-full">
        <Icon className="w-3 h-3 text-slate-700 flex-shrink-0" />
        <span className="font-mono text-[10px] text-slate-600 flex-shrink-0">{time}</span>
        <span className="font-medium text-slate-800 truncate">{itemTitle(item)}</span>
      </div>
    )
  }

  const applyJobMove = useCallback(
    async (jobId: string, newStart: Date, newEnd: Date, action: 'reschedule' | 'resize') => {
      const previous = jobs.find(e => e.id === jobId)
      if (!previous) return

      setJobs(prev =>
        prev.map(ev =>
          ev.id === jobId
            ? { ...ev, scheduled_start: newStart.toISOString(), scheduled_end: newEnd.toISOString() }
            : ev,
        ),
      )

      const conflict = findOverlap(previous, newStart, newEnd, jobs)

      startTransition(async () => {
        try {
          await rescheduleJob(jobId, newStart.toISOString(), newEnd.toISOString())
          if (conflict) {
            pushToast('warning', `${conflict.workerName} now overlaps with ${conflict.jobNumber}.`)
          } else {
            pushToast('success', action === 'resize' ? 'Duration updated.' : 'Job rescheduled.')
          }
        } catch (err: any) {
          setJobs(prev =>
            prev.map(ev =>
              ev.id === jobId
                ? { ...ev, scheduled_start: previous.scheduled_start, scheduled_end: previous.scheduled_end }
                : ev,
            ),
          )
          pushToast('error', err?.message || 'Failed to update job.')
        }
      })
    },
    [jobs, pushToast],
  )

  const applyEventMove = useCallback(
    async (eventId: string, newStart: Date, newEnd: Date) => {
      const previous = calendarEvents.find(e => e.id === eventId)
      if (!previous) return

      setCalendarEvents(prev =>
        prev.map(ev =>
          ev.id === eventId
            ? { ...ev, start_time: newStart.toISOString(), end_time: newEnd.toISOString() }
            : ev,
        ),
      )

      startTransition(async () => {
        try {
          await rescheduleCalendarEvent(eventId, newStart.toISOString(), newEnd.toISOString())
          pushToast('success', 'Event rescheduled.')
        } catch (err: any) {
          setCalendarEvents(prev =>
            prev.map(ev =>
              ev.id === eventId
                ? { ...ev, start_time: previous.start_time, end_time: previous.end_time }
                : ev,
            ),
          )
          pushToast('error', err?.message || 'Failed to update event.')
        }
      })
    },
    [calendarEvents, pushToast],
  )

  const handleEventDrop = useCallback(
    (args: EventInteractionArgs<RbcEvent>) => {
      const { event, start, end } = args
      const newStart = start instanceof Date ? start : new Date(start)
      const newEnd = end instanceof Date ? end : new Date(end)
      const item = event.resource.item

      const startChanged = newStart.getTime() !== event.start.getTime()
      const endChanged = newEnd.getTime() !== event.end.getTime()

      if (item.kind === 'job') {
        if (startChanged || endChanged) {
          applyJobMove(item.data.id, newStart, newEnd, 'reschedule')
        }

        const oldResourceId = event.resourceId
        const newResourceId = (args as unknown as { resourceId?: string }).resourceId
        if (
          layoutMode === 'worker' &&
          oldResourceId &&
          newResourceId &&
          oldResourceId !== newResourceId
        ) {
          const fromUserId = oldResourceId === UNASSIGNED_RESOURCE_ID ? null : oldResourceId
          const toUserId = newResourceId === UNASSIGNED_RESOURCE_ID ? null : newResourceId
          if (toUserId && fromUserId) {
            const realJobId = item.data.id
            startTransition(async () => {
              try {
                await reassignJobToWorker(realJobId, fromUserId, toUserId)
                setJobs(prev =>
                  prev.map(ev => {
                    if (ev.id !== realJobId) return ev
                    const filtered = ev.assignments.filter(a => a.user_id !== fromUserId)
                    const alreadyHasTo = filtered.some(a => a.user_id === toUserId)
                    if (alreadyHasTo) return { ...ev, assignments: filtered }
                    const newWorker = workers.find(w => w.id === toUserId)
                    return {
                      ...ev,
                      assignments: [
                        ...filtered,
                        {
                          user_id: toUserId,
                          full_name: newWorker?.full_name ?? null,
                          role: 'worker',
                          trade: newWorker?.trade ?? null,
                        },
                      ],
                    }
                  }),
                )
                const newName = workers.find(w => w.id === toUserId)?.full_name ?? 'worker'
                pushToast('success', `Reassigned to ${newName}.`)
              } catch (err: any) {
                pushToast('error', err?.message || 'Failed to reassign worker.')
              }
            })
          }
        }
      } else {
        if (startChanged || endChanged) {
          applyEventMove(item.data.id, newStart, newEnd)
        }
      }
    },
    [applyJobMove, applyEventMove, layoutMode, pushToast, workers],
  )

  const handleEventResize = useCallback(
    (args: EventInteractionArgs<RbcEvent>) => {
      const { event, start, end } = args
      const newStart = start instanceof Date ? start : new Date(start)
      const newEnd = end instanceof Date ? end : new Date(end)
      const item = event.resource.item
      if (item.kind === 'job') {
        applyJobMove(item.data.id, newStart, newEnd, 'resize')
      } else {
        applyEventMove(item.data.id, newStart, newEnd)
      }
    },
    [applyJobMove, applyEventMove],
  )

  const toggleSetItem = (current: Set<string>, value: string): Set<string> => {
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const hasActiveFilters =
    !!search || selectedTypes.size > 0 || selectedStatuses.size > 0 ||
    selectedWorkers.size > 0 || !!selectedCustomerId

  const clearFilters = () => {
    setSearch('')
    setSelectedTypes(new Set())
    setSelectedStatuses(new Set())
    setSelectedWorkers(new Set())
    setSelectedCustomerId('')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 relative">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search jobs, events, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Type
                {selectedTypes.size > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {selectedTypes.size}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TYPE_FILTER_OPTIONS.map(opt => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={selectedTypes.has(opt.value)}
                  onCheckedChange={() =>
                    setSelectedTypes(prev => toggleSetItem(prev, opt.value))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Status
                {selectedStatuses.size > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {selectedStatuses.size}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by job status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map(opt => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={selectedStatuses.has(opt.value)}
                  onCheckedChange={() =>
                    setSelectedStatuses(prev => toggleSetItem(prev, opt.value))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Workers
                {selectedWorkers.size > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {selectedWorkers.size}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Filter by worker</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workers.length === 0 && (
                <div className="px-2 py-3 text-xs text-slate-500">No workers yet</div>
              )}
              {workers.map(w => (
                <DropdownMenuCheckboxItem
                  key={w.id}
                  checked={selectedWorkers.has(w.id)}
                  onCheckedChange={() =>
                    setSelectedWorkers(prev => toggleSetItem(prev, w.id))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col">
                    <span>{w.full_name || w.email}</span>
                    {w.trade && <span className="text-[10px] text-slate-500">{w.trade}</span>}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="appearance-none pl-3 pr-10 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}

          <button
            type="button"
            onClick={() => setComposerState({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New event
          </button>

          <div className="ml-auto flex items-center gap-3">
            {view !== Views.DAY && (
              <button
                type="button"
                onClick={() => setShowTodayPanel(s => !s)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border ${
                  showTodayPanel
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                aria-label="Toggle today panel"
              >
                <Sidebar className="w-3.5 h-3.5" />
                Today
              </button>
            )}
            <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden" role="group">
              <button
                type="button"
                onClick={() => setLayoutMode('time')}
                className={`px-3 py-2 text-xs font-medium ${
                  layoutMode === 'time'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Time grid
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('worker')
                  setView(Views.DAY)
                }}
                className={`px-3 py-2 text-xs font-medium border-l border-slate-300 ${
                  layoutMode === 'worker'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                By worker
              </button>
            </div>
            <span className="text-xs text-slate-500">
              {jobs.length + calendarEvents.length} total
            </span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="bg-white rounded-lg border border-slate-200 p-4 flex-1 min-w-0">
            <DnDCalendar
              localizer={localizer}
              events={rbcEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={(v) => setView(v)}
              date={date}
              onNavigate={(d) => setDate(d)}
              views={
                layoutMode === 'worker'
                  ? [Views.DAY]
                  : [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]
              }
              defaultView={Views.MONTH}
              step={30}
              timeslots={2}
              style={{ height: 'calc(100vh - 280px)', minHeight: 600 }}
              eventPropGetter={eventPropGetter}
              components={{ event: EventContent }}
              popup
              resizable
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onSelectEvent={(ev) => setSelectedItemId(itemId(ev.resource.item))}
              onSelectSlot={(slotInfo) => {
                setComposerState({
                  mode: 'create',
                  slot: { start: slotInfo.start as Date, end: slotInfo.end as Date },
                })
              }}
              selectable
              draggableAccessor={() => true}
              resources={resources}
              resourceIdAccessor={layoutMode === 'worker' ? ((r) => (r as RbcResource).resourceId) : undefined}
              resourceTitleAccessor={layoutMode === 'worker' ? ((r) => (r as RbcResource).resourceTitle) : undefined}
            />

            <EventPanel
              item={selectedItem}
              onClose={() => setSelectedItemId(null)}
              onEventUpdated={(updated) => {
                setCalendarEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
              }}
              onEventDeleted={(deletedId) => {
                setCalendarEvents(prev => prev.filter(e => e.id !== deletedId))
                setSelectedItemId(null)
              }}
              onEventEditRequested={(ev) => {
                setSelectedItemId(null)
                setComposerState({ mode: 'edit', event: ev })
              }}
              onError={(msg) => pushToast('error', msg)}
            />

            <EventComposer
              open={composerState.mode !== 'closed'}
              mode={composerState.mode === 'edit' ? 'edit' : 'create'}
              existing={composerState.mode === 'edit' ? composerState.event : null}
              initialSlot={composerState.mode === 'create' ? composerState.slot : null}
              customers={customers}
              onClose={() => setComposerState({ mode: 'closed' })}
              onCreated={(newEvent) => {
                setCalendarEvents(prev => [...prev, newEvent])
                pushToast('success', `${newEvent.title} created.`)
              }}
              onUpdated={(updated) => {
                setCalendarEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
                pushToast('success', `${updated.title} updated.`)
              }}
              onError={(msg) => pushToast('error', msg)}
            />
          </div>

          {(view === Views.DAY || showTodayPanel) && (
            <TodayPanel
              items={allItems}
              onSelect={(id) => setSelectedItemId(id)}
            />
          )}
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
                t.kind === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : t.kind === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {t.kind === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />}
              {t.kind === 'warning' && <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
              {t.kind === 'error' && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </DndProvider>
  )
}
