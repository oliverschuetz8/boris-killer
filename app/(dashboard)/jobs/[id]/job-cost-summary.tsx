'use client'

import { useEffect, useState } from 'react'
import { getJobCostSummary } from '@/lib/services/materials'
import { Clock, Package, DollarSign } from 'lucide-react'

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

export default function JobCostSummary({
  jobId,
  labourRate = 85,
}: {
  jobId: string
  labourRate?: number
}) {
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJobCostSummary(jobId).then(data => {
      setSummary(data)
      setLoading(false)
    })
  }, [jobId])

  if (loading) return null
  if (!summary) return null

  // Don't show if no materials and no time recorded
  if (summary.materialTotal === 0 && summary.labourHours === 0) return null

  const labourTotal = summary.labourHours * labourRate
  const grandTotal = summary.materialTotal + labourTotal

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Job Cost Summary
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Materials */}
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-medium text-orange-700 uppercase tracking-wider">Materials</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            A${summary.materialTotal.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.materials.length} item{summary.materials.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Labour */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Labour</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            A${labourTotal.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.labourHours}h × A${labourRate}/hr
          </p>
        </div>

        {/* Total */}
        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Total</p>
          </div>
          <p className="text-2xl font-bold text-green-800">
            A${grandTotal.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">materials + labour</p>
        </div>
      </div>

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

      {summary.labourHours === 0 && (
        <p className="text-xs text-slate-400 italic">
          Labour cost will appear once the job is completed.
        </p>
      )}
    </div>
  )
}