'use client'

import { useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ChevronDown, X } from 'lucide-react'
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventVisibility,
} from '@/lib/services/calendar-events'
import {
  createCalendarEvent, updateCalendarEvent,
} from '@/app/actions/calendar-events'
import { TYPE_STYLES, EVENT_TYPE_OPTIONS } from './calendar-types'

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At event time' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
]

const VISIBILITY_OPTIONS: { value: CalendarEventVisibility; label: string; hint: string }[] = [
  { value: 'private', label: 'Private', hint: 'Only you can see this' },
  { value: 'team', label: 'Team', hint: 'Visible to your team' },
  { value: 'company', label: 'Company', hint: 'Visible to everyone' },
]

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultsForType(type: CalendarEventType, slotStart?: Date, slotEnd?: Date) {
  const opt = EVENT_TYPE_OPTIONS.find(o => o.value === type)!
  const start = slotStart ?? new Date()
  const end = slotEnd ?? new Date(start.getTime() + (opt.defaultDurationMinutes ?? 60) * 60 * 1000)
  return {
    start,
    end,
    reminder: opt.defaultReminderMinutes ?? null,
  }
}

interface EventComposerProps {
  open: boolean
  mode: 'create' | 'edit'
  existing?: CalendarEvent | null
  initialType?: CalendarEventType
  initialSlot?: { start: Date; end: Date } | null
  customers: { id: string; name: string }[]
  onClose: () => void
  onCreated?: (event: CalendarEvent) => void
  onUpdated?: (event: CalendarEvent) => void
  onError: (message: string) => void
}

export function EventComposer({
  open, mode, existing, initialType, initialSlot,
  customers, onClose, onCreated, onUpdated, onError,
}: EventComposerProps) {
  const [type, setType] = useState<CalendarEventType>(initialType ?? 'meeting')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [reminder, setReminder] = useState<number | null>(30)
  const [visibility, setVisibility] = useState<CalendarEventVisibility>('private')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && existing) {
      setType(existing.event_type)
      setTitle(existing.title)
      setDescription(existing.description ?? '')
      setStart(toDatetimeLocalValue(new Date(existing.start_time)))
      setEnd(existing.end_time ? toDatetimeLocalValue(new Date(existing.end_time)) : '')
      setIsAllDay(existing.is_all_day)
      setLocation(existing.location ?? '')
      setVideoLink(existing.video_link ?? '')
      setCustomerId(existing.customer_id ?? '')
      setReminder(existing.reminder_minutes_before ?? null)
      setVisibility(existing.visibility)
    } else {
      const t = initialType ?? 'meeting'
      setType(t)
      setTitle('')
      setDescription('')
      const d = defaultsForType(t, initialSlot?.start, initialSlot?.end)
      setStart(toDatetimeLocalValue(d.start))
      setEnd(toDatetimeLocalValue(d.end))
      setIsAllDay(false)
      setLocation('')
      setVideoLink('')
      setCustomerId('')
      setReminder(d.reminder)
      setVisibility('private')
    }
  }, [open, mode, existing, initialType, initialSlot])

  // When type changes (in create mode), update default end + reminder.
  const handleTypeChange = (newType: CalendarEventType) => {
    setType(newType)
    if (mode === 'edit') return
    const startDate = start ? new Date(start) : new Date()
    const d = defaultsForType(newType, startDate, undefined)
    setEnd(toDatetimeLocalValue(d.end))
    setReminder(d.reminder)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      try {
        const startDate = new Date(start)
        if (isNaN(startDate.getTime())) throw new Error('Invalid start time')
        let endIso: string | null = null
        if (!isAllDay && end) {
          const endDate = new Date(end)
          if (isNaN(endDate.getTime())) throw new Error('Invalid end time')
          if (endDate < startDate) throw new Error('End must be after start')
          endIso = endDate.toISOString()
        }

        const payload = {
          event_type: type,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startDate.toISOString(),
          end_time: endIso,
          is_all_day: isAllDay,
          location: location.trim() || null,
          video_link: videoLink.trim() || null,
          customer_id: customerId || null,
          reminder_minutes_before: reminder,
          visibility,
        }

        if (mode === 'create') {
          const created = await createCalendarEvent(payload)
          onCreated?.(created)
        } else if (existing) {
          const updated = await updateCalendarEvent(existing.id, payload)
          onUpdated?.(updated)
        }
        onClose()
      } catch (err: any) {
        onError(err?.message || `Failed to ${mode} event`)
      }
    })
  }

  const typeStyle = TYPE_STYLES[type] ?? TYPE_STYLES.custom
  const TypeIcon = typeStyle.icon

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between px-6 pt-6 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: typeStyle.bg, border: `2px solid ${typeStyle.edge}` }}
                >
                  <TypeIcon className="w-4 h-4 text-slate-700" />
                </div>
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900">
                  {mode === 'create' ? 'New event' : 'Edit event'}
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close
                className="text-slate-400 hover:text-slate-600 p-1 -m-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="px-6 py-4 space-y-4">
              {mode === 'create' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EVENT_TYPE_OPTIONS.map(opt => {
                      const s = TYPE_STYLES[opt.value] ?? TYPE_STYLES.custom
                      const Icon = s.icon
                      const active = type === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleTypeChange(opt.value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border text-[10px] font-medium ${
                            active
                              ? 'border-slate-900 bg-slate-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" style={{ color: active ? s.edge : undefined }} />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                  placeholder="What's this about?"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    disabled={isAllDay}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-slate-300"
                />
                All-day event
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Address or place"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Video link</label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Linked customer</label>
                <div className="relative">
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full appearance-none px-3 pr-10 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reminder</label>
                  <div className="relative">
                    <select
                      value={reminder === null ? 'null' : String(reminder)}
                      onChange={(e) => setReminder(e.target.value === 'null' ? null : parseInt(e.target.value))}
                      className="w-full appearance-none px-3 pr-10 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {REMINDER_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.value === null ? 'null' : String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Visibility</label>
                  <div className="relative">
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as CalendarEventVisibility)}
                      className="w-full appearance-none px-3 pr-10 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {VISIBILITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? (mode === 'create' ? 'Creating…' : 'Saving…')
                  : (mode === 'create' ? 'Create' : 'Save changes')}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
