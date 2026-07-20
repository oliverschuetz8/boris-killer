'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getJobCostSummary } from '@/lib/services/materials'
import { getJobLabour, type JobLabourLine } from '@/lib/services/time-tracking'
import { Clock, Package, DollarSign, User } from 'lucide-react'

interface CostSummary {
  materialTotal: number
  labourHours: number
  materials: Array<{
    material_name: string
    quantity: number
    unit: string
    total_cost: number
  }>
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function JobCostSummary({
  jobId,
  compact = false,
}: {
  jobId: string
  compact?: boolean
}) {
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [labour, setLabour] = useState<JobLabourLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      getJobCostSummary(jobId),
      getJobLabour(supabase, jobId),
    ]).then(([costData, labourData]) => {
      setSummary(costData)
      setLabour(labourData)
      setLoading(false)
    })
  }, [jobId])

  if (loading) return null
  if (!summary) return null

  const labourCost = labour.reduce((sum, l) => sum + l.cost, 0)
  const totalMinutes = labour.reduce((sum, l) => sum + l.hours * 60, 0)
  const grandTotal = summary.materialTotal + labourCost
  const hasData = summary.materialTotal > 0 || totalMinutes > 0

  if (!hasData) return null

  // Distinct workers count for subtitle
  const workerCount = new Set(labour.map(l => l.user_id).filter(Boolean)).size

  // ── Compact mode (sidebar) ──
  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cost Summary</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Materials</span>
            <span className="font-medium">A${summary.materialTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Labour {totalMinutes > 0 ? `(${formatMinutes(totalMinutes)})` : ''}
            </span>
            <span className="font-medium">A${labourCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-100">
            <span className="text-slate-700">Total</span>
            <span className="text-green-700">A${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Full mode ──
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Job Cost Summary
      </h2>

      {/* Top 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-medium text-orange-700 uppercase tracking-wider">Materials</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">A${summary.materialTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.materials.length} item{summary.materials.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Labour</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">A${labourCost.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalMinutes > 0 ? formatMinutes(totalMinutes) : 'No time recorded'}
            {workerCount > 1 ? ` · ${workerCount} tradies` : ''}
          </p>
        </div>

        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Total</p>
          </div>
          <p className="text-2xl font-bold text-green-800">A${grandTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-0.5">materials + labour</p>
        </div>
      </div>

      {/* Per-worker labour breakdown */}
      {labour.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Labour Breakdown
          </p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {labour.map(line => {
              const mins = line.hours * 60
              return (
                <div key={line.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-800">{line.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {line.trade && `${line.trade} · `}
                        {formatMinutes(mins)} × A${line.hourly_rate.toFixed(2)}/hr
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    A${line.cost.toFixed(2)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Materials breakdown */}
      {summary.materials.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Materials Breakdown
          </p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {summary.materials.map((mat, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm text-slate-800">{mat.material_name}</p>
                  <p className="text-xs text-slate-500">{mat.quantity} {mat.unit}</p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  A${Number(mat.total_cost).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalMinutes === 0 && (
        <p className="text-xs text-slate-400 italic">
          Labour cost will appear as tradies clock time on this job.
        </p>
      )}
    </div>
  )
}
