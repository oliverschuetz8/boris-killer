'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  getParts,
  createPart,
  updatePart,
  deletePart,
  bulkUpdateParts,
  getDistinctSubcategories,
  getDistinctSuppliers,
  getSimilarPartNames,
  migrateOldMaterialsToParts,
  type Part,
} from '@/lib/services/parts'
import {
  Package, Plus, Pencil, Trash2, Check, X, ChevronDown,
  ArrowLeft, Search, Filter, CheckSquare, Square, Loader2,
  ArrowUpDown,
} from 'lucide-react'

const UNITS = ['each', 'box', 'tube', 'metre', 'litre', 'bag', 'roll', 'sheet', 'hour']

const emptyForm = {
  name: '',
  subcategory: '',
  unit: 'each',
  buy_cost: '',
  sell_price: '',
  margin: '',
  supplier: '',
  part_number: '',
}

export default function PartsManager() {
  const [parts, setParts] = useState<Part[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)

  // Bulk edit
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkField, setBulkField] = useState<'margin' | 'sell_price' | 'supplier'>('margin')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  // Migration
  const [migrating, setMigrating] = useState(false)
  const [migrateResult, setMigrateResult] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [partsData, subcats, supps] = await Promise.all([
        getParts(),
        getDistinctSubcategories(),
        getDistinctSuppliers(),
      ])
      setParts(partsData)
      setSubcategories(subcats)
      setSuppliers(supps)
    } finally {
      setLoading(false)
    }
  }

  // Filtered list
  const filtered = useMemo(() => {
    return parts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSubcategory && p.subcategory !== filterSubcategory) return false
      if (filterSupplier && p.supplier !== filterSupplier) return false
      return true
    })
  }, [parts, search, filterSubcategory, filterSupplier])

  // Name suggestion debounce
  useEffect(() => {
    if (!form.name || form.name.length < 2) { setNameSuggestions([]); return }
    const timer = setTimeout(async () => {
      const suggestions = await getSimilarPartNames(form.name)
      setNameSuggestions(suggestions)
    }, 300)
    return () => clearTimeout(timer)
  }, [form.name])

  function calculateMargin(buy: string, sell: string): string {
    const b = parseFloat(buy)
    const s = parseFloat(sell)
    if (!b || !s || b === 0) return ''
    return (((s - b) / b) * 100).toFixed(1)
  }

  function calculateSellFromMargin(buy: string, margin: string): string {
    const b = parseFloat(buy)
    const m = parseFloat(margin)
    if (!b || isNaN(m)) return ''
    return (b * (1 + m / 100)).toFixed(2)
  }

  // ─── Add ──────────────────────────────────────────────
  async function handleAdd() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await createPart({
        name: form.name.trim(),
        subcategory: form.subcategory.trim() || undefined,
        unit: form.unit,
        buy_cost: form.buy_cost ? Number(form.buy_cost) : null,
        sell_price: form.sell_price ? Number(form.sell_price) : null,
        margin: form.margin ? Number(form.margin) : null,
        supplier: form.supplier.trim() || undefined,
        part_number: form.part_number.trim() || undefined,
      })
      await loadAll()
      setForm(emptyForm)
      setShowAdd(false)
      setNameSuggestions([])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Edit ─────────────────────────────────────────────
  function startEdit(part: Part) {
    setEditingId(part.id)
    setEditForm({
      name: part.name,
      subcategory: part.subcategory || '',
      unit: part.unit,
      buy_cost: part.buy_cost != null ? String(part.buy_cost) : '',
      sell_price: part.sell_price != null ? String(part.sell_price) : '',
      margin: part.margin != null ? String(part.margin) : '',
      supplier: part.supplier || '',
      part_number: part.part_number || '',
    })
    setError(null)
  }

  async function handleEdit(id: string) {
    if (!editForm.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await updatePart(id, {
        name: editForm.name.trim(),
        subcategory: editForm.subcategory.trim() || null,
        unit: editForm.unit,
        buy_cost: editForm.buy_cost ? Number(editForm.buy_cost) : null,
        sell_price: editForm.sell_price ? Number(editForm.sell_price) : null,
        margin: editForm.margin ? Number(editForm.margin) : null,
        supplier: editForm.supplier.trim() || null,
        part_number: editForm.part_number.trim() || null,
      })
      await loadAll()
      setEditingId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete ───────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Remove this part from the catalogue?')) return
    try {
      await deletePart(id)
      setParts(prev => prev.filter(p => p.id !== id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ─── Bulk ─────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function selectAllFiltered() {
    if (filtered.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    }
  }

  async function handleBulkUpdate() {
    if (selectedIds.size === 0) return
    if (!bulkValue.trim()) { setError('Enter a value'); return }
    setBulkSaving(true)
    setError(null)
    try {
      const ids = Array.from(selectedIds)
      const updates: any = {}
      if (bulkField === 'margin') updates.margin = Number(bulkValue)
      else if (bulkField === 'sell_price') updates.sell_price = Number(bulkValue)
      else if (bulkField === 'supplier') updates.supplier = bulkValue.trim()
      await bulkUpdateParts(ids, updates)
      await loadAll()
      setSelectedIds(new Set())
      setShowBulkEdit(false)
      setBulkValue('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBulkSaving(false)
    }
  }

  // ─── Migrate ──────────────────────────────────────────
  async function handleMigrate() {
    if (!confirm('This will copy all active materials from the old catalogue into Parts. Continue?')) return
    setMigrating(true)
    setMigrateResult(null)
    try {
      const count = await migrateOldMaterialsToParts()
      setMigrateResult(`Migrated ${count} material${count !== 1 ? 's' : ''} to parts.`)
      await loadAll()
    } catch (e: any) {
      setMigrateResult(`Error: ${e.message}`)
    } finally {
      setMigrating(false)
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))

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
          <h1 className="text-xl font-bold text-slate-900">Parts Catalogue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Individual purchasable items. Workers select from these when logging materials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {parts.length === 0 && !loading && (
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {migrating ? 'Migrating…' : 'Import from Legacy'}
            </button>
          )}
          <button
            onClick={() => { setShowAdd(true); setError(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>
        </div>
      </div>

      {migrateResult && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
          {migrateResult}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts…"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={filterSubcategory}
            onChange={e => setFilterSubcategory(e.target.value)}
            className="pl-3 pr-10 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All subcategories</option>
            {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterSupplier}
            onChange={e => setFilterSupplier(e.target.value)}
            className="pl-3 pr-10 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All suppliers</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkEdit(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Bulk Edit ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Bulk edit panel */}
      {showBulkEdit && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-purple-800">
            Bulk Edit — {selectedIds.size} part{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Field</label>
              <div className="relative">
                <select
                  value={bulkField}
                  onChange={e => setBulkField(e.target.value as any)}
                  className="pl-3 pr-10 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="margin">Margin (%)</option>
                  <option value="sell_price">Sell Price (A$)</option>
                  <option value="supplier">Supplier</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">New Value</label>
              <input
                type={bulkField === 'supplier' ? 'text' : 'number'}
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                step={bulkField === 'supplier' ? undefined : '0.01'}
                placeholder={bulkField === 'margin' ? 'e.g. 30' : bulkField === 'sell_price' ? 'e.g. 15.00' : 'e.g. Hilti'}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-40"
              />
            </div>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkSaving}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-slate-300 transition-colors"
            >
              {bulkSaving ? 'Updating…' : 'Apply'}
            </button>
            <button
              onClick={() => { setShowBulkEdit(false); setBulkValue('') }}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-blue-800">New Part</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder='e.g. "Intumescent Collar - 50mm"'
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {nameSuggestions.length > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  Similar: {nameSuggestions.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, name: s }))}
                        className="text-blue-600 hover:underline"
                      >{s}</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subcategory</label>
              <input
                type="text"
                value={form.subcategory}
                onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                placeholder='e.g. "Fire Collars"'
                list="subcategory-list"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="subcategory-list">
                {subcategories.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <div className="relative">
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Buy Cost (A$)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.buy_cost}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({
                    ...f,
                    buy_cost: val,
                    margin: calculateMargin(val, f.sell_price),
                  }))
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sell Price (A$)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.sell_price}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({
                    ...f,
                    sell_price: val,
                    margin: calculateMargin(f.buy_cost, val),
                  }))
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Margin (%)</label>
              <input
                type="number" step="0.1"
                value={form.margin}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({
                    ...f,
                    margin: val,
                    sell_price: calculateSellFromMargin(f.buy_cost, val),
                  }))
                }}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Supplier</label>
              <input
                type="text"
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                placeholder="e.g. Hilti"
                list="supplier-list"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="supplier-list">
                {suppliers.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Part Number / SKU</label>
              <input
                type="text"
                value={form.part_number}
                onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))}
                placeholder="e.g. HIT-RE-500-V4"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && !showBulkEdit && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Part'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm(emptyForm); setError(null); setNameSuggestions([]) }}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Parts table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <button onClick={selectAllFiltered} className="text-slate-400 hover:text-slate-600 transition-colors">
              {allFilteredSelected
                ? <CheckSquare className="w-4 h-4 text-blue-600" />
                : <Square className="w-4 h-4" />
              }
            </button>
            <Package className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {filtered.length} part{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== parts.length && ` (of ${parts.length})`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {parts.length === 0 ? 'No parts yet. Add your first part above.' : 'No parts match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subcategory</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Buy Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sell Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Margin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="w-20 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(part => (
                  <tr key={part.id} className={selectedIds.has(part.id) ? 'bg-blue-50/50' : ''}>
                    {editingId === part.id ? (
                      <>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Part name"
                            className="w-full px-2 py-1.5 rounded border border-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.subcategory}
                            onChange={e => setEditForm(f => ({ ...f, subcategory: e.target.value }))}
                            placeholder="Subcategory"
                            list="subcategory-edit-list"
                            className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <datalist id="subcategory-edit-list">
                            {subcategories.map(s => <option key={s} value={s} />)}
                          </datalist>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <select value={editForm.unit}
                              onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                              className="min-w-[6.5rem] w-full px-2 py-1.5 pr-8 rounded border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">A$</span>
                            <input type="number" min="0" step="0.01" value={editForm.buy_cost}
                              onChange={e => {
                                const val = e.target.value
                                setEditForm(f => ({ ...f, buy_cost: val, margin: calculateMargin(val, f.sell_price) }))
                              }}
                              placeholder="0.00"
                              className="w-full pl-7 pr-2 py-1.5 rounded border border-slate-300 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">A$</span>
                            <input type="number" min="0" step="0.01" value={editForm.sell_price}
                              onChange={e => {
                                const val = e.target.value
                                setEditForm(f => ({ ...f, sell_price: val, margin: calculateMargin(f.buy_cost, val) }))
                              }}
                              placeholder="0.00"
                              className="w-full pl-7 pr-2 py-1.5 rounded border border-slate-300 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="relative">
                            <input type="number" step="0.1" value={editForm.margin}
                              onChange={e => {
                                const val = e.target.value
                                setEditForm(f => ({ ...f, margin: val, sell_price: calculateSellFromMargin(f.buy_cost, val) }))
                              }}
                              placeholder="0.0"
                              className="w-full pl-2 pr-7 py-1.5 rounded border border-slate-300 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.supplier}
                            onChange={e => setEditForm(f => ({ ...f, supplier: e.target.value }))}
                            placeholder="Supplier"
                            className="w-full px-2 py-1.5 rounded border border-slate-300 text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(part.id)} disabled={saving}
                              className="w-7 h-7 rounded-lg hover:bg-green-50 flex items-center justify-center text-green-600 hover:text-green-700 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditingId(null); setError(null) }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelect(part.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            {selectedIds.has(part.id)
                              ? <CheckSquare className="w-4 h-4 text-blue-600" />
                              : <Square className="w-4 h-4" />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{part.name}</p>
                          {part.part_number && <p className="text-xs text-slate-400">{part.part_number}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {part.subcategory && (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                              {part.subcategory}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{part.unit}</td>
                        <td className="px-4 py-3 text-left text-slate-600">
                          {part.buy_cost != null ? `$${Number(part.buy_cost).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-left font-medium text-slate-800">
                          {part.sell_price != null ? `$${Number(part.sell_price).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-left text-slate-600">
                          {part.margin != null ? `${Number(part.margin).toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-left text-slate-600">{part.supplier || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(part)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(part.id)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
