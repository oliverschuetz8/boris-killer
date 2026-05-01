'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Trash2, ChevronDown, CheckCircle2, Layers } from 'lucide-react'

interface LoggedMaterial {
  id: string
  quantity: number
  material_name_override: string | null
  notes: string | null
  created_at: string
  material?: any
  part?: any
  product?: any
  logger?: any
}

interface CataloguePart {
  id: string
  name: string
  unit: string
  sell_price: number | null
}

function currency(amount: number) {
  return `A$${Number(amount).toFixed(2)}`
}

export default function MaterialLog({
  jobId,
  userRole = 'worker',
}: {
  jobId: string
  userRole?: string
}) {
  const [logged, setLogged] = useState<LoggedMaterial[]>([])
  const [parts, setParts] = useState<CataloguePart[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedPartId, setSelectedPartId] = useState('')
  const [manualName, setManualName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'manager'
  const isManual = selectedPartId === '__manual__'

  useEffect(() => {
    loadData()
  }, [jobId])

  async function loadData() {
    const supabase = createClient()
    const [{ data: mats }, { data: partsData }] = await Promise.all([
      supabase
        .from('room_materials')
        .select(`
          id, quantity, material_name_override, notes, created_at,
          material:materials(id, name, unit, unit_price),
          part:parts(id, name, unit, sell_price, buy_cost),
          product:products(id, name, total_sell_price),
          logger:users!room_materials_logged_by_fkey(full_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false }),
      supabase
        .from('parts')
        .select('id, name, unit, sell_price')
        .eq('is_active', true)
        .order('name'),
    ])
    setLogged(mats || [])
    setParts(partsData || [])
  }

  function getItemName(m: LoggedMaterial): string {
    const part = Array.isArray(m.part) ? m.part[0] : m.part
    const product = Array.isArray(m.product) ? m.product[0] : m.product
    const material = Array.isArray(m.material) ? m.material[0] : m.material
    if (part?.name) return part.name
    if (product?.name) return product.name
    if (material?.name) return material.name
    return m.material_name_override || 'Unknown'
  }

  function getItemUnit(m: LoggedMaterial): string {
    const part = Array.isArray(m.part) ? m.part[0] : m.part
    const material = Array.isArray(m.material) ? m.material[0] : m.material
    if (part?.unit) return part.unit
    if (material?.unit) return material.unit
    return 'ea'
  }

  function getItemSellPrice(m: LoggedMaterial): number {
    const part = Array.isArray(m.part) ? m.part[0] : m.part
    const product = Array.isArray(m.product) ? m.product[0] : m.product
    const material = Array.isArray(m.material) ? m.material[0] : m.material
    if (part?.sell_price != null) return Number(part.sell_price)
    if (product?.total_sell_price != null) return Number(product.total_sell_price)
    if (material?.unit_price != null) return Number(material.unit_price)
    return 0
  }

  function isProduct(m: LoggedMaterial): boolean {
    const product = Array.isArray(m.product) ? m.product[0] : m.product
    return !!product?.name
  }

  async function handleSave() {
    if (!selectedPartId && !isManual) { setError('Select a part'); return }
    if (isManual && !manualName.trim()) { setError('Enter a name'); return }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) { setError('Enter a valid quantity'); return }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) throw new Error('Company not found')

      // For admin material log, we insert directly into room_materials without room/level
      // This is a simplified path — admin logs go without room context
      const { error: insertError } = await supabase.from('room_materials').insert({
        job_id: jobId,
        room_id: null,
        level_id: null,
        company_id: profile.company_id,
        logged_by: user.id,
        part_id: isManual ? null : selectedPartId,
        material_name_override: isManual ? manualName.trim() : null,
        quantity: qty,
        notes: notes.trim() || null,
      })

      if (insertError) throw new Error(insertError.message)

      await loadData()
      setSelectedPartId('')
      setManualName('')
      setQuantity('1')
      setNotes('')
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
    const supabase = createClient()
    const { error } = await supabase.from('room_materials').delete().eq('id', id)
    if (error) { alert('Failed to delete'); return }
    setLogged(prev => prev.filter(m => m.id !== id))
  }

  const totalCost = logged.reduce((sum, m) => sum + Number(m.quantity) * getItemSellPrice(m), 0)

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
                ? `${logged.length} item${logged.length !== 1 ? 's' : ''} · ${currency(totalCost)}`
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
          {logged.map(mat => {
            const sellPrice = getItemSellPrice(mat)
            const lineTotal = Number(mat.quantity) * sellPrice
            return (
              <div key={mat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {isProduct(mat)
                    ? <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    : <Package className="w-3.5 h-3.5 text-blue-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{getItemName(mat)}</p>
                  <p className="text-xs text-slate-500">
                    {mat.quantity} {getItemUnit(mat)}
                    {isAdmin && sellPrice > 0 && ` × ${currency(sellPrice)}`}
                    {mat.notes && ` · ${mat.notes}`}
                  </p>
                </div>
                {isAdmin && sellPrice > 0 && (
                  <p className="text-sm font-semibold text-slate-700">
                    {currency(lineTotal)}
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
            )
          })}

          {/* Total — admin only */}
          {isAdmin && totalCost > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">Total Materials</p>
              <p className="text-sm font-bold text-slate-900">{currency(totalCost)}</p>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-4 space-y-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Part <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedPartId}
                onChange={e => { setSelectedPartId(e.target.value); setManualName('') }}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select from parts catalogue…</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAdmin && p.sell_price != null
                      ? `${p.name} — $${Number(p.sell_price).toFixed(2)}/${p.unit}`
                      : p.name}
                  </option>
                ))}
                <option value="__manual__">Other (type manually)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {isManual && (
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Material name…"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Qty *</label>
              <input
                type="number" min="0.1" step="0.1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setError(null); setSelectedPartId(''); setManualName('') }}
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
                {saving ? 'Saving…' : 'Save Material'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
