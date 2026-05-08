import type { ComponentType } from 'react'
import {
  Briefcase, Users as UsersIcon, Phone, Bell, CheckSquare,
  Package, UserCheck, Coffee, Star, type LucideProps,
} from 'lucide-react'
import type { ScheduleEvent } from '@/lib/services/schedule'
import type { CalendarEvent, CalendarEventType } from '@/lib/services/calendar-events'

export const EVENT_TYPE_OPTIONS: Array<{
  value: CalendarEventType
  label: string
  defaultDurationMinutes?: number
  defaultReminderMinutes?: number | null
}> = [
  { value: 'meeting', label: 'Meeting', defaultDurationMinutes: 60, defaultReminderMinutes: 30 },
  { value: 'call', label: 'Call', defaultDurationMinutes: 30, defaultReminderMinutes: 15 },
  { value: 'reminder', label: 'Reminder', defaultDurationMinutes: 0, defaultReminderMinutes: 0 },
  { value: 'task', label: 'Task', defaultDurationMinutes: 0, defaultReminderMinutes: null },
  { value: 'material_delivery', label: 'Material delivery', defaultDurationMinutes: 30, defaultReminderMinutes: 60 },
  { value: 'interview', label: 'Interview', defaultDurationMinutes: 60, defaultReminderMinutes: 30 },
  { value: 'block', label: 'Focus block', defaultDurationMinutes: 60, defaultReminderMinutes: null },
  { value: 'custom', label: 'Custom', defaultDurationMinutes: 60, defaultReminderMinutes: null },
]

export type CalendarItem =
  | { kind: 'job'; data: ScheduleEvent }
  | { kind: 'event'; data: CalendarEvent }

export interface TypeStyle {
  bg: string
  edge: string
  icon: ComponentType<LucideProps>
  label: string
}

export const TYPE_STYLES: Record<string, TypeStyle> = {
  job:               { bg: '#e0e7ff', edge: '#6366f1', icon: Briefcase,  label: 'Job' },
  meeting:           { bg: '#d1fae5', edge: '#10b981', icon: UsersIcon,  label: 'Meeting' },
  call:              { bg: '#fed7aa', edge: '#f97316', icon: Phone,      label: 'Call' },
  reminder:          { bg: '#fef3c7', edge: '#f59e0b', icon: Bell,       label: 'Reminder' },
  task:              { bg: '#fef9c3', edge: '#eab308', icon: CheckSquare, label: 'Task' },
  material_delivery: { bg: '#ddd6fe', edge: '#8b5cf6', icon: Package,    label: 'Material delivery' },
  interview:         { bg: '#fce7f3', edge: '#ec4899', icon: UserCheck,  label: 'Interview' },
  block:             { bg: '#e2e8f0', edge: '#64748b', icon: Coffee,     label: 'Focus block' },
  custom:            { bg: '#e0e7ff', edge: '#6366f1', icon: Star,       label: 'Event' },
}

const STATUS_EDGE: Record<string, string> = {
  draft: '#94a3b8',
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  on_hold: '#64748b',
  completed: '#10b981',
  cancelled: '#ef4444',
}

export function styleForItem(item: CalendarItem): TypeStyle {
  if (item.kind === 'job') {
    return {
      ...TYPE_STYLES.job,
      edge: STATUS_EDGE[item.data.status] ?? STATUS_EDGE.scheduled,
    }
  }
  const t: CalendarEventType = item.data.event_type
  return TYPE_STYLES[t] ?? TYPE_STYLES.custom
}

export function itemId(item: CalendarItem): string {
  return item.kind === 'job' ? item.data.id : `evt:${item.data.id}`
}

export function itemRealId(item: CalendarItem): string {
  return item.data.id
}

export function itemStart(item: CalendarItem): Date {
  return new Date(item.kind === 'job' ? item.data.scheduled_start : item.data.start_time)
}

export function itemEnd(item: CalendarItem): Date {
  if (item.kind === 'job') return new Date(item.data.scheduled_end)
  if (item.data.end_time) return new Date(item.data.end_time)
  // Reminders/tasks with no end_time get a 30-min visual block
  return new Date(new Date(item.data.start_time).getTime() + 30 * 60 * 1000)
}

export function itemTitle(item: CalendarItem): string {
  return item.data.title
}

export function itemSubtitle(item: CalendarItem): string | null {
  if (item.kind === 'job') {
    return item.data.customer_name
  }
  return item.data.customer_name || item.data.lead_name || item.data.location || null
}

export function itemTypeLabel(item: CalendarItem): string {
  if (item.kind === 'job') return 'Job'
  return TYPE_STYLES[item.data.event_type]?.label ?? 'Event'
}

export function itemIsAllDay(item: CalendarItem): boolean {
  return item.kind === 'event' && item.data.is_all_day
}

export function itemIsCompleted(item: CalendarItem): boolean {
  if (item.kind === 'job') return item.data.status === 'completed'
  return item.data.is_completed
}
