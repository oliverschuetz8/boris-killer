'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '@/lib/services/materials'
import { Package, Plus, Pencil, Trash2, Check, X, ChevronDown, ArrowLeft } from 'lucide-react'

interface Material {
  id: string
  name: string
  unit: string
  unit_price: number
  is_active: boolean
}

const UNITS = ['each', 'box', 'tube', 'metre', 'litre', 'bag', 'roll', 'sheet']

const emptyForm = { name: '', unit: 'each', unit_price: '' }

export default function MaterialsManager() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMaterials().then(data => {
      setMaterials(data)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    if (!form.name.trim() || !form.unit_price) {
      setError('Name and price are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createMaterial({
        name: form.name.trim(),
        unit: form.unit,
        unit_price: Number(form.unit_price),
      })
      const updated = await getMaterials()
      setMaterials(updated)
      setForm(emptyForm)
      setShowAdd(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(id: string) {
    if (!editForm.name.trim() || !editForm.unit_price) {
      setError('Name and price are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateMaterial(id, {
        name: editForm.name.trim(),
        unit: editForm.unit,
        unit_price: Number(editForm.unit_price),
      })
      const updated = await getMaterials()
      setMaterials(updated)
      setEditingId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this material from the catalogue? Workers will no longer see it in the dropdown.')) return
    try {
      await deleteMaterial(id)
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  function startEdit(mat: Material) {
    setEditingId(mat.id)
    setEditForm({ name: mat.name, unit: mat.unit, unit_price: String(mat.unit_price) })
    setError(null)
  }

  return (
    <div className="w-full px-6 py-8">

      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Materials Catalogue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage materials and prices. Workers select from this list when logging job materials.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-blue-800">New Material</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Intumescent Collar 50mm"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <div className="relative">
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price (A$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Material'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm(emptyForm); setError(null) }}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <Package className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {materials.length} material{materials.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No materials yet. Add your first material above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {materials.map(mat => (
              <div key={mat.id} className="px-4 py-3">
                {editingId === mat.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <select
                            value={editForm.unit}
                            onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Unit Price (A$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.unit_price}
                          onChange={e => setEditForm(f => ({ ...f, unit_price: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(mat.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setError(null) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{mat.name}</p>
                      <p className="text-xs text-slate-500">{mat.unit}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      A${Number(mat.unit_price).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(mat)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}