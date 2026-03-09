'use client'

import { useState, useEffect } from 'react'
import { getMaterials, logJobMaterial, getJobMaterials, deleteJobMaterial } from '@/lib/services/materials'
import { Package, Plus, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react'

interface Material {
  id: string
  name: string
  unit: string
  unit_price: number
}

interface JobMaterial {
  id: string
  material_name: string
  unit: string
  unit_price: number
  quantity: number
  total_cost: number
  notes: string | null
  logged_at: string
  logger?: { full_name: string | null } | null
}

interface MaterialEntry {
  material_id: string | null
  material_name: string
  unit: string
  unit_price: number
  quantity: string
  notes: string
  isCustom: boolean
}

const UNITS = ['each', 'box', 'tube', 'metre', 'litre', 'bag', 'roll', 'sheet']

const emptyEntry = (): MaterialEntry => ({
  material_id: null,
  material_name: '',
  unit: 'each',
  unit_price: 0,
  quantity: '1',
  notes: '',
  isCustom: false,
})

export default function MaterialLog({
  jobId,
  userRole = 'worker',
}: {
  jobId: string
  userRole?: string
}) {
  const [catalogue, setCatalogue] = useState<Material[]>([])
  const [logged, setLogged] = useState<JobMaterial[]>([])
  const [entries, setEntries] = useState<MaterialEntry[]>([emptyEntry()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    getMaterials().then(setCatalogue)
    getJobMaterials(jobId).then(setLogged)
  }, [jobId])

  function updateEntry(index: number, updates: Partial<MaterialEntry>) {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e))
  }

  function selectMaterial(index: number, materialId: string) {
    const mat = catalogue.find(m => m.id === materialId)
    if (!mat) return
    updateEntry(index, {
      material_id: mat.id,
      material_name: mat.name,
      unit: mat.unit,
      unit_price: mat.unit_price,
    })
  }

  function addEntry() {
    setEntries(prev => [...prev, emptyEntry()])
  }

  function removeEntry(index: number) {
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    const valid = entries.filter(e => e.material_name.trim() && Number(e.quantity) > 0)
    if (valid.length === 0) {
      setError('Add at least one material with a quantity.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await logJobMaterial(jobId, valid.map(e => ({
        material_id: e.material_id,
        material_name: e.material_name.trim(),
        unit: e.unit,
        unit_price: Number(e.unit_price),
        quantity: Number(e.quantity),
        notes: e.notes.trim() || undefined,
      })))

      const updated = await getJobMaterials(jobId)
      setLogged(updated)
      setEntries([emptyEntry()])
      setShowForm(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this material entry?')) return
    try {
      await deleteJobMaterial(id, jobId)
      setLogged(prev => prev.filter(m => m.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const totalCost = logged.reduce((sum, m) => sum + Number(m.total_cost || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
          <Package className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Materials Used</p>
          <p className="text-xs text-slate-500">
            {logged.length > 0
              ? isAdmin
                ? `${logged.length} item${logged.length !== 1 ? 's' : ''} · $${totalCost.toFixed(2)}`
                : `${logged.length} item${logged.length !== 1 ? 's' : ''} logged`
              : 'Log materials used on this job'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Logged materials list */}
      {logged.length > 0 && (
        <div className="divide-y divide-slate-100">
          {logged.map(mat => (
            <div key={mat.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{mat.material_name}</p>
                <p className="text-xs text-slate-500">
                  {mat.quantity} {mat.unit}
                  {isAdmin && ` × $${Number(mat.unit_price).toFixed(2)}`}
                  {mat.notes && ` · ${mat.notes}`}
                </p>
              </div>
              {isAdmin && (
                <p className="text-sm font-semibold text-slate-700">
                  ${Number(mat.total_cost).toFixed(2)}
                </p>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleDelete(mat.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Total — admin only */}
          {isAdmin && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Total Materials</p>
              <p className="text-sm font-bold text-slate-900">${totalCost.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {/* Add materials form */}
      {showForm && (
        <div className="p-4 space-y-4 border-t border-slate-100">
          {entries.map((entry, index) => (
            <div key={index} className="space-y-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">Item {index + 1}</p>
                {entries.length > 1 && (
                  <button onClick={() => removeEntry(index)}
                    className="text-xs text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
              </div>

              {/* Material selector */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Material <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={entry.material_id || ''}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        updateEntry(index, { material_id: null, material_name: '', unit: 'each', unit_price: 0, isCustom: true })
                      } else {
                        selectMaterial(index, e.target.value)
                        updateEntry(index, { isCustom: false })
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select from catalogue…</option>
                    {catalogue.map(m => (
                      <option key={m.id} value={m.id}>
                        {isAdmin
                          ? `${m.name} — $${m.unit_price.toFixed(2)}/${m.unit}`
                          : m.name}
                      </option>
                    ))}
                    <option value="__custom__">Other (type manually)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {entry.isCustom && (
                  <input
                    type="text"
                    value={entry.material_name}
                    onChange={e => updateEntry(index, { material_name: e.target.value })}
                    placeholder="Material name…"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>

              {/* Quantity + Unit (+ Price for admin only) */}
              <div className={`grid gap-2 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Qty *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={entry.quantity}
                    onChange={e => updateEntry(index, { quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Unit</label>
                  <div className="relative">
                    <select
                      value={entry.unit}
                      onChange={e => updateEntry(index, { unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Unit $</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.unit_price}
                      onChange={e => updateEntry(index, { unit_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              {/* Line total — admin only */}
              {isAdmin && Number(entry.quantity) > 0 && Number(entry.unit_price) > 0 && (
                <p className="text-xs text-slate-500 text-right">
                  Line total: <span className="font-semibold text-slate-700">
                    ${(Number(entry.quantity) * Number(entry.unit_price)).toFixed(2)}
                  </span>
                </p>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={entry.notes}
                  onChange={e => updateEntry(index, { notes: e.target.value })}
                  placeholder="e.g. used on Level 1 Corridor"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ))}

          {/* Add another item */}
          <button
            onClick={addEntry}
            className="w-full py-2 border border-dashed border-slate-300 text-sm text-slate-500 rounded-lg hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another item
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setEntries([emptyEntry()]); setError(null) }}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            {saved ? (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Saved!</span>
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save Materials'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
