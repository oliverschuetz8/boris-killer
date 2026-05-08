'use client'

import { format, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns'
import { ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
  type CalendarItem,
  styleForItem, itemId, itemStart, itemTitle, itemSubtitle, itemTypeLabel, itemIsCompleted,
} from './calendar-types'

interface TodayPanelProps {
  items: CalendarItem[]
  onSelect: (id: string) => void
}

export function TodayPanel({ items, onSelect }: TodayPanelProps) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))
  const tomorrowEnd = endOfDay(addDays(now, 1))
  const sevenDaysEnd = endOfDay(addDays(now, 7))

  const todayItems = items
    .filter(item => isWithinInterval(itemStart(item), { start: todayStart, end: todayEnd }))
    .sort((a, b) => itemStart(a).getTime() - itemStart(b).getTime())

  const tomorrowCount = items.filter(item =>
    isWithinInterval(itemStart(item), { start: tomorrowStart, end: tomorrowEnd }),
  ).length

  const next7DaysCount = items.filter(item =>
    isWithinInterval(itemStart(item), { start: addDays(todayEnd, 1), end: sevenDaysEnd }),
  ).length

  return (
    <aside className="bg-white rounded-lg border border-slate-200 w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-220px)]">
      <header className="px-4 py-3 border-b border-slate-200">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Today</div>
        <div className="text-sm font-semibold text-slate-900">{format(now, 'EEEE d MMM')}</div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {todayItems.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nothing scheduled today.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todayItems.map(item => {
              const style = styleForItem(item)
              const Icon = style.icon
              const completed = itemIsCompleted(item)
              const subtitle = itemSubtitle(item)
              return (
                <li key={itemId(item)}>
                  <button
                    onClick={() => onSelect(itemId(item))}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start"
                  >
                    <div className="flex-shrink-0 w-12 text-right">
                      <div className="text-xs font-semibold text-slate-900">
                        {format(itemStart(item), 'h:mm')}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {format(itemStart(item), 'a')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                          {itemTypeLabel(item)}
                        </span>
                      </div>
                      <div className={`text-sm font-medium truncate ${completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {itemTitle(item)}
                      </div>
                      {subtitle && (
                        <div className="text-xs text-slate-500 truncate">{subtitle}</div>
                      )}
                      <div
                        className="mt-1 h-0.5 rounded-full"
                        style={{ backgroundColor: style.edge, width: 24 }}
                      />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <footer className="px-4 py-3 border-t border-slate-200 bg-slate-50 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Tomorrow</span>
          <span className="font-medium text-slate-900">
            {tomorrowCount === 0 ? 'Nothing scheduled' : `${tomorrowCount} item${tomorrowCount === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Next 7 days</span>
          <span className="font-medium text-slate-900">
            {next7DaysCount === 0 ? 'Nothing scheduled' : `${next7DaysCount} items`}
          </span>
        </div>
      </footer>
    </aside>
  )
}
