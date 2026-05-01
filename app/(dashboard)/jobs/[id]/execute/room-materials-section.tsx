'use client'

import { useEffect, useState } from 'react'
import {
  getRoomMaterials,
  addRoomMaterial,
  deleteRoomMaterial,
  type RoomMaterial,
} from '@/lib/services/room-materials'
import { markRoomDone } from '@/lib/services/building-structure'
import { Plus, Trash2, ChevronDown, AlertCircle, CheckCircle2, Loader2, Layers, Package } from 'lucide-react'

interface JobMaterialDefault {
  id: string
  material_id: string | null
  part_id: string | null
  product_id: string | null
  material_name_override: string | null
  seal_id: string | null
  manufacturer: string | null
  system_product: string | null
  material?: { id: string; name: string; unit: string | null }
  part?: { id: string; name: string; unit: string }
  product?: { id: string; name: string }
}

interface Props {
  jobId: string
  roomId: string
  levelId: string
  companyId: string
  userId: string
  materialDefaults: JobMaterialDefault[]
  refreshTrigger: number
  onRoomMarkedDone: () => void
  onMaterialAdded: () => void
}

type SelectionType = 'default' | 'manual'

export default function RoomMaterialsSection({
  jobId,
  roomId,
  levelId,
  companyId,
  userId,
  materialDefaults,
  refreshTrigger,
  onRoomMarkedDone,
  onMaterialAdded,
}: Props) {
  const [materials, setMaterials] = useState<RoomMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDefaultId, setSelectedDefaultId] = useState('')
  const [manualName, setManualName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneError, setDoneError] = useState<string | null>(null)

  const isManual = selectedDefaultId === '__manual__'

  useEffect(() => {
    load()
  }, [roomId, refreshTrigger])

  async function load() {
    setLoading(true)
    try {
      const data = await getRoomMaterials(roomId)
      setMaterials(data)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setSelectedDefaultId('')
    setManualName('')
    setQuantity('1')
    setNotes('')
    setShowAddForm(false)
    setError(null)
  }

  async function handleAdd() {
    if (!selectedDefaultId) { setError('Select a material'); return }
    if (isManual && !manualName.trim()) { setError('Enter a material name'); return }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) { setError('Enter a valid quantity'); return }

    setSaving(true)
    setError(null)
    try {
      // Find the selected default
      const defaultItem = materialDefaults.find(d => d.id === selectedDefaultId)

      let materialId: string | null = null
      let partId: string | null = null
      let productId: string | null = null
      let nameOverride: string | null = null

      if (isManual) {
        nameOverride = manualName.trim()
      } else if (defaultItem) {
        partId = defaultItem.part_id || null
        productId = defaultItem.product_id || null
        materialId = defaultItem.material_id || null
        if (!partId && !productId && !materialId) {
          nameOverride = defaultItem.material_name_override || null
        }
      }

      const created = await addRoomMaterial({
        jobId,
        roomId,
        levelId,
        companyId,
        loggedBy: userId,
        materialId,
        partId,
        productId,
        materialNameOverride: nameOverride,
        quantity: qty,
        notes: notes.trim() || undefined,
      })
      setMaterials(prev => [...prev, created])
      onMaterialAdded()
      resetForm()
    } catch {
      setError('Failed to add material')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRoomMaterial(id)
      setMaterials(prev => prev.filter(m => m.id !== id))
    } catch {
      alert('Failed to remove material')
    }
  }

  async function handleMarkDone() {
    if (materials.length === 0) {
      setDoneError('Please add the materials used in this room before marking it complete.')
      return
    }
    setDoneError(null)
    setMarkingDone(true)
    try {
      await markRoomDone(roomId)
      onRoomMarkedDone()
    } catch {
      setDoneError('Failed to mark room as done. Please try again.')
    } finally {
      setMarkingDone(false)
    }
  }

  function getItemDisplayName(m: RoomMaterial): string {
    if (m.part?.name) return m.part.name
    if (m.product?.name) return m.product.name
    if (m.material?.name) return m.material.name
    if (m.material_name_override) return m.material_name_override
    return 'Unknown'
  }

  function getItemUnit(m: RoomMaterial): string {
    if (m.part?.unit) return m.part.unit
    if (m.material?.unit) return m.material.unit
    return ''
  }

  function getDefaultDisplayName(d: JobMaterialDefault): string {
    if (d.part?.name) return d.part.name
    if (d.product?.name) return `${d.product.name} (product)`
    if (d.material?.name) return d.material.name
    if (d.material_name_override) return d.material_name_override
    return 'Unknown'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">Materials Used</p>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Reminder banner */}
      {materials.length === 0 && !showAddForm && !loading && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Don't forget to log your materials for this room before marking it done.
          </p>
        </div>
      )}

      {/* Materials list */}
      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-400">Loading…</div>
      ) : materials.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {materials.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                {m.product_id
                  ? <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  : <Package className="w-3.5 h-3.5 text-blue-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {getItemDisplayName(m)}
                </p>
                <p className="text-xs text-slate-500">
                  Qty: {m.quantity}{getItemUnit(m) ? ` ${getItemUnit(m)}` : ''}
                  {m.notes ? ` · ${m.notes}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Material <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedDefaultId}
                onChange={e => { setSelectedDefaultId(e.target.value); setManualName('') }}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select material…</option>
                {materialDefaults.map(d => (
                  <option key={d.id} value={d.id}>
                    {getDefaultDisplayName(d)}
                  </option>
                ))}
                <option value="__manual__">+ Type manually</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {isManual && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Material Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                placeholder="e.g. 50mm Rockwool Batt" autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                min="0.1" step="0.1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
              {saving ? 'Adding…' : 'Add Material'}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mark room done */}
      <div className="px-4 py-3 border-t border-slate-100">
        {doneError && (
          <div className="flex items-start gap-2 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{doneError}</p>
          </div>
        )}
        <button
          onClick={handleMarkDone}
          disabled={markingDone}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {markingDone
            ? <><Loader2 className="w-4 h-4 animate-spin" />Marking done…</>
            : <><CheckCircle2 className="w-4 h-4" />Mark Room Done</>
          }
        </button>
      </div>
    </div>
  )
}
