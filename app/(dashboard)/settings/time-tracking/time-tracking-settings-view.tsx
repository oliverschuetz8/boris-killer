'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react'
import { setTimeTrackingSettingsAction } from '@/app/actions/time-tracking'

type DaySource = 'in_app' | 'xero' | 'none'
type JobSource = 'in_app' | 'xero'

interface Settings {
  day_hours_source: DaySource
  job_attribution_source: JobSource
  worker_self_edit_enabled: boolean
}

export default function TimeTrackingSettingsView({
  initialSettings,
  xeroConnected,
  canEdit,
}: {
  initialSettings: Settings
  xeroConnected: boolean
  canEdit: boolean
}) {
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    settings.day_hours_source !== initialSettings.day_hours_source ||
    settings.job_attribution_source !== initialSettings.job_attribution_source ||
    settings.worker_self_edit_enabled !== initialSettings.worker_self_edit_enabled

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      try {
        await setTimeTrackingSettingsAction(settings)
        setSavedAt(Date.now())
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Couldn't save settings. Refresh and try again.",
        )
      }
    })
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Header — sub-page pattern */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Time tracking</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose how your company captures hours for payroll and job cost reporting.
        </p>
      </div>

      <div className="space-y-4">
        {/* Day hours source */}
        <SettingCard
          title="Payroll (day) hours"
          description="How does your company track the total hours each tradie works per day?"
        >
          <RadioGroup
            value={settings.day_hours_source}
            disabled={!canEdit}
            options={[
              {
                value: 'in_app',
                label: 'In-app worker clock',
                hint: 'Tradies clock in/out in the app. We use this as the source for payroll-style totals.',
              },
              {
                value: 'xero',
                label: 'Xero timesheets',
                hint: xeroConnected
                  ? 'Tradies enter hours in Xero. We pull them via the existing sync.'
                  : 'Requires a connected Xero account — connect under Settings → Integrations first.',
                disabled: !xeroConnected,
              },
              {
                value: 'none',
                label: "We don't track payroll here",
                hint: "Skip the day clock entirely. The clock bar won't show in the worker app.",
              },
            ]}
            onChange={(v: any) =>
              setSettings(s => ({ ...s, day_hours_source: v as DaySource }))
            }
          />
        </SettingCard>

        {/* Job attribution source */}
        <SettingCard
          title="Job cost (per-job) hours"
          description="Which source does the Job Cost Summary and invoicing pull labour from?"
        >
          <RadioGroup
            value={settings.job_attribution_source}
            disabled={!canEdit}
            options={[
              {
                value: 'in_app',
                label: 'In-app per-job timer',
                hint: 'Tradies clock on/off jobs in the app. Cleaner attribution than Xero tracking categories.',
              },
              {
                value: 'xero',
                label: 'Xero tracking categories',
                hint: xeroConnected
                  ? 'Use existing Xero timesheets mapped to jobs (manual assignment supported).'
                  : 'Requires a connected Xero account — connect under Settings → Integrations first.',
                disabled: !xeroConnected,
              },
            ]}
            onChange={(v: any) =>
              setSettings(s => ({ ...s, job_attribution_source: v as JobSource }))
            }
          />
        </SettingCard>

        {/* Self-edit toggle */}
        <SettingCard
          title="Tradie self-edit"
          description="Let tradies fix their own forgotten clock-ins / clock-outs within the last 48 hours. Every edit is logged in an audit trail."
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.worker_self_edit_enabled}
              onChange={e =>
                setSettings(s => ({ ...s, worker_self_edit_enabled: e.target.checked }))
              }
              disabled={!canEdit}
              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">
                Allow tradies to edit their own time entries
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Recommended ON. Tradies forget clocks; without this they'd have to ask you every
                time. Audit trail keeps you in control.
              </p>
            </div>
          </label>
        </SettingCard>

        {/* Save row */}
        {canEdit && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs">
              {savedAt && !dirty && (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
              {error && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={!dirty || pending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            Only company admins can change these settings. Managers can view but not save.
          </div>
        )}
      </div>
    </div>
  )
}

function SettingCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">{description}</p>
      {children}
    </div>
  )
}

function RadioGroup({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: Array<{ value: string; label: string; hint: string; disabled?: boolean }>
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => {
        const isChecked = value === opt.value
        const isDisabled = disabled || opt.disabled
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isChecked
                ? 'bg-blue-50 border-blue-300'
                : 'border-slate-200 hover:border-slate-300'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              checked={isChecked}
              onChange={() => !isDisabled && onChange(opt.value)}
              disabled={isDisabled}
              className="mt-0.5 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{opt.hint}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
