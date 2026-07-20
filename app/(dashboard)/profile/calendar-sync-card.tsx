'use client'

import { useState, useTransition } from 'react'
import { Calendar as CalendarIcon, Copy, RefreshCw, Check, ExternalLink } from 'lucide-react'
import {
  enableCalendarSync,
  regenerateCalendarToken,
  disableCalendarSync,
} from '@/app/actions/schedule'
import { friendlyError } from '@/lib/errors'

interface CalendarSyncCardProps {
  initialToken: string | null
}

export function CalendarSyncCard({ initialToken }: CalendarSyncCardProps) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const feedUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/api/calendar/${token}`
      : ''

  const handleEnable = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await enableCalendarSync()
        setToken(result.token)
      } catch (err) {
        setError(friendlyError(err, "We couldn't turn on calendar sync. Try again — if it keeps happening, contact support."))
      }
    })
  }

  const handleRegenerate = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await regenerateCalendarToken()
        setToken(result.token)
        setCopied(false)
      } catch (err) {
        setError(friendlyError(err, "We couldn't create a new calendar link. Your existing one still works — try again in a moment."))
      }
    })
  }

  const handleDisable = () => {
    if (!confirm('Disable calendar sync? Your existing subscribers will stop receiving updates.')) return
    setError(null)
    startTransition(async () => {
      try {
        await disableCalendarSync()
        setToken(null)
      } catch (err) {
        setError(friendlyError(err, "We couldn't turn off calendar sync. Try again — if it keeps happening, contact support."))
      }
    })
  }

  const handleCopy = async () => {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-900">Calendar sync</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Subscribe to your jobs in Apple Calendar, Google Calendar or Outlook.
          </p>
        </div>
      </div>

      {!token ? (
        <button
          onClick={handleEnable}
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Generating…' : 'Enable calendar sync'}
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Subscription URL
            </label>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={feedUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">How to subscribe:</p>
            <ul className="space-y-0.5 pl-1">
              <li>
                <a
                  href="https://support.apple.com/en-au/guide/calendar/icl1022/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Apple Calendar <ExternalLink className="w-3 h-3" />
                </a>
                <span className="ml-1">— File → New Calendar Subscription</span>
              </li>
              <li>
                <a
                  href="https://support.google.com/calendar/answer/37100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Google Calendar <ExternalLink className="w-3 h-3" />
                </a>
                <span className="ml-1">— Other calendars → From URL</span>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Outlook <ExternalLink className="w-3 h-3" />
                </a>
                <span className="ml-1">— Add calendar → Subscribe from web</span>
              </li>
            </ul>
            <p className="pt-1">
              Updates appear in your calendar app within 15 minutes to a few hours, depending on the platform.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleRegenerate}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate URL
            </button>
            <button
              onClick={handleDisable}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
            >
              Disable sync
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
          {error}
        </div>
      )}
    </div>
  )
}
