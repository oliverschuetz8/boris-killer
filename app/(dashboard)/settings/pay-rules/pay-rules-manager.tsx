'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, AlertTriangle, ChevronDown } from 'lucide-react'
import {
  getPreviewRates,
  type PackageCode,
  type EmploymentType,
} from '@/lib/services/pay-calculator'

const PACKAGES: { code: PackageCode; label: string; award: string; description: string }[] = [
  {
    code: 'PKG-BCGO',
    label: 'Building & Construction General On-site',
    award: 'MA000020',
    description: 'On-site general building, civil construction, labourers, concrete workers, scaffolders, traffic controllers and most site trades.',
  },
  {
    code: 'PKG-ELEC',
    label: 'Electrical, Electronic & Communications',
    award: 'MA000025',
    description: 'Electrical, electronic or communications contractors. Casual rates are significantly higher than other packages.',
  },
  {
    code: 'PKG-JOIN',
    label: 'Joinery and Building Trades',
    award: 'MA000029',
    description: 'Joinery, shopfitting, prefabricated building, stonemasonry, glass and glazing, carpenters, painters, plasterers.',
  },
  {
    code: 'PKG-PLUMB-MECH',
    label: 'Plumbing & Mechanical Services',
    award: 'MA000036',
    description: 'Plumbing, gas fitting, roof plumbing, HVAC, irrigation, pipe-fitting. Saturday: first 2hrs 1.5×, then 2×.',
  },
  {
    code: 'PKG-PLUMB-SPRINKLER',
    label: 'Fire Sprinkler Fitting',
    award: 'MA000036',
    description: 'Fire sprinkler fitters only. Saturday rate is 2× all time (no 1.5× first 2hrs) — different from general plumbing.',
  },
  {
    code: 'PKG-CRANE',
    label: 'Mobile Crane Hiring',
    award: 'MA000032',
    description: 'Mobile crane hire businesses supplying a crane and operator. Not for general construction sites that happen to have a crane.',
  },
  {
    code: 'PKG-PREMIX',
    label: 'Premixed Concrete',
    award: 'MA000057',
    description: 'Making and delivering premixed concrete, batching plants, front-end loaders, dispatch and plant operations.',
  },
]

interface Props {
  companyId: string
  initialRules: {
    package_code: string
    employment_type: string
    standard_weekly_hours: number
    standard_daily_hours: number
    enterprise_agreement_override: boolean
  } | null
}

export default function PayRulesManager({ companyId, initialRules }: Props) {
  const [packageCode, setPackageCode] = useState<PackageCode>(
    (initialRules?.package_code as PackageCode) || 'PKG-BCGO'
  )
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    (initialRules?.employment_type as EmploymentType) || 'full_time'
  )
  const [weeklyHours, setWeeklyHours] = useState(
    String(initialRules?.standard_weekly_hours ?? 38)
  )
  const [dailyHours, setDailyHours] = useState(
    String(initialRules?.standard_daily_hours ?? 8)
  )
  const [eaOverride, setEaOverride] = useState(
    initialRules?.enterprise_agreement_override ?? false
  )
  const [previewRate, setPreviewRate] = useState('40')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRateNum = parseFloat(previewRate) || 0
  const previewRows = previewRateNum > 0
    ? getPreviewRates(packageCode, employmentType, previewRateNum)
    : []

  async function handleSave() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload = {
      company_id: companyId,
      package_code: packageCode,
      employment_type: employmentType,
      standard_weekly_hours: parseFloat(weeklyHours) || 38,
      standard_daily_hours: parseFloat(dailyHours) || 8,
      enterprise_agreement_override: eaOverride,
      updated_at: new Date().toISOString(),
    }
    const { error: upsertError } = await supabase
      .from('company_pay_rules')
      .upsert(payload, { onConflict: 'company_id' })

    if (upsertError) {
      setError(upsertError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="w-full px-6 py-8">

      {/* Back */}
      <Link href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pay Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure your award package and overtime calculation rules.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || saved}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}>
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Rules'}
        </button>
      </div>

      <div className="space-y-6">

        {/* Enterprise agreement warning */}
              <div className={`p-4 rounded-xl border ${eaOverride ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${eaOverride ? 'text-amber-500' : 'text-slate-400'}`} />
                          <p className="text-sm font-medium text-slate-800">Enterprise Agreement</p>
                      </div>
            <p className="text-xs text-slate-500 mt-0.5">
              If your workers are covered by an enterprise agreement, the award rates below may not apply.
              Consult your agreement before relying on these calculations.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={eaOverride}
                onChange={e => setEaOverride(e.target.checked)}
                className="w-4 h-4 accent-amber-500" />
              <span className="text-xs font-medium text-slate-700">
                Enterprise agreement applies to our workers
              </span>
            </label>
          </div>
        </div>

        {/* Part A — Award package */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Part A — Award Package</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select the award that covers your workers.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {PACKAGES.map(pkg => (
              <label key={pkg.code}
                className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                  packageCode === pkg.code ? 'bg-blue-50' : ''
                }`}>
                <input type="radio" name="package" value={pkg.code}
                  checked={packageCode === pkg.code}
                  onChange={() => setPackageCode(pkg.code)}
                  className="mt-1 accent-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${packageCode === pkg.code ? 'text-blue-800' : 'text-slate-800'}`}>
                      {pkg.label}
                    </p>
                    <span className="text-xs text-slate-400 font-mono">{pkg.award}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Employment settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Employment Settings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Default Employment Type</label>
              <div className="relative">
                <select value={employmentType} onChange={e => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="casual">Casual</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Standard Weekly Hours</label>
              <input type="number" value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)}
                min={1} max={60} step={0.5}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Standard Daily Hours</label>
              <input type="number" value={dailyHours} onChange={e => setDailyHours(e.target.value)}
                min={1} max={24} step={0.5}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Part B — Rate preview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Part B — Rate Preview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter a sample base rate to see what the system will calculate automatically.
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-100">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Sample Base Hourly Rate (A$)
            </label>
            <div className="flex items-center gap-3">
              <input type="number" value={previewRate} onChange={e => setPreviewRate(e.target.value)}
                min={0} step={0.5} placeholder="40.00"
                className="w-40 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-slate-400">
                Updates live · {PACKAGES.find(p => p.code === packageCode)?.label} · {employmentType.replace('_', '-')}
              </span>
            </div>
          </div>

          {previewRows.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Situation</th>
                  <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Multiplier</th>
                  <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate/hr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, i) => (
                  <tr key={i} className={i === 0 ? 'bg-green-50' : ''}>
                    <td className="px-6 py-2.5 text-slate-700">{row.situation}</td>
                    <td className="px-6 py-2.5 text-right font-mono text-slate-600">{row.multiplier}</td>
                    <td className="px-6 py-2.5 text-right font-semibold text-slate-800">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-6 text-center text-sm text-slate-400">
              Enter a base rate above to see the preview.
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

      </div>
    </div>
  )
}