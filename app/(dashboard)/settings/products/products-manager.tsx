'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductPart,
  updateProductPartQuantity,
  removeProductPart,
  type Product,
  type ProductPart,
} from '@/lib/services/products'
import { getParts, type Part } from '@/lib/services/parts'
import {
  Layers, Plus, Pencil, Trash2, Check, X, ChevronDown,
  ArrowLeft, Search, Loader2, Package,
} from 'lucide-react'

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add product
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Expanded product (editing parts)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addPartId, setAddPartId] = useState('')
  const [addPartQty, setAddPartQty] = useState('1')
  const [addingPart, setAddingPart] = useState(false)

  // Edit product details
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSellOverride, setEditSellOverride] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [productsData, partsData] = await Promise.all([
        getProducts(),
        getParts(),
      ])
      setProducts(productsData)
      setParts(partsData)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Create product ───────────────────────────────────
  async function handleCreate() {
    if (!addName.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await createProduct({
        name: addName.trim(),
        description: addDesc.trim() || undefined,
      })
      await loadAll()
      setShowAdd(false)
      setAddName('')
      setAddDesc('')
      setExpandedId(created.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete product ───────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Remove this product?')) return
    try {
      await deleteProduct(id)
      setProducts(prev => prev.filter(p => p.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ─── Edit product name/desc ───────────────────────────
  function startEdit(product: Product) {
    setEditingId(product.id)
    setEditName(product.name)
    setEditDesc(product.description || '')
    setEditSellOverride(product.total_sell_price != null ? String(product.total_sell_price) : '')
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await updateProduct(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        total_sell_price: editSellOverride ? Number(editSellOverride) : null,
      })
      await loadAll()
      setEditingId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Add part to product ──────────────────────────────
  async function handleAddPart(productId: string) {
    if (!addPartId) return
    const qty = parseFloat(addPartQty)
    if (isNaN(qty) || qty <= 0) return
    setAddingPart(true)
    try {
      await addProductPart(productId, addPartId, qty)
      await loadAll()
      setAddPartId('')
      setAddPartQty('1')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAddingPart(false)
    }
  }

  // ─── Update part quantity ─────────────────────────────
  async function handleUpdatePartQty(ppId: string, productId: string, newQty: string) {
    const qty = parseFloat(newQty)
    if (isNaN(qty) || qty <= 0) return
    try {
      await updateProductPartQuantity(ppId, productId, qty)
      await loadAll()
    } catch (e: any) {
      alert(e.message)
    }
  }

  // ─── Remove part from product ─────────────────────────
  async function handleRemovePart(ppId: string, productId: string) {
    try {
      await removeProductPart(ppId, productId)
      await loadAll()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function getUsedPartIds(product: Product): Set<string> {
    return new Set((product.product_parts || []).map(pp => pp.part_id))
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
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bundles of parts. Workers can log a product instead of individual parts.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add product form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-sm font-semibold text-blue-800">New Product</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
              <input
                type="text"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder='e.g. "Fire Collar Kit - 110mm"'
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={addDesc}
                onChange={e => setAddDesc(e.target.value)}
                placeholder="Brief description…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
              {saving ? 'Creating…' : 'Create Product'}
            </button>
            <button onClick={() => { setShowAdd(false); setAddName(''); setAddDesc(''); setError(null) }}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-500">After creating, expand the product to add its parts.</p>
        </div>
      )}

      {/* Products list */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {products.length === 0 ? 'No products yet. Create your first product above.' : 'No products match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => {
            const isExpanded = expandedId === product.id
            const isEditing = editingId === product.id
            const productParts = product.product_parts || []
            const usedPartIds = getUsedPartIds(product)
            const availableParts = parts.filter(p => !usedPartIds.has(p.id))

            return (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Product header */}
                <div className="flex items-center gap-3 px-6 py-4">
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                          <input type="text" value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-blue-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                          <input type="text" value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Sell Price Override (A$)</label>
                          <input type="number" min="0" step="0.01" value={editSellOverride}
                            onChange={e => setEditSellOverride(e.target.value)}
                            placeholder="Auto-calculated"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(product.id)} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setEditingId(null); setError(null) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors">
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : product.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                            <p className="text-xs text-slate-500">
                              {product.description && `${product.description} · `}
                              {productParts.length} part{productParts.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Buy</p>
                          <p className="text-sm font-medium text-slate-600">
                            {product.total_buy_cost != null ? `$${Number(product.total_buy_cost).toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Sell</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {product.total_sell_price != null ? `$${Number(product.total_sell_price).toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Margin</p>
                          <p className="text-sm font-medium text-slate-600">
                            {product.margin != null ? `${Number(product.margin).toFixed(1)}%` : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(product)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(product.id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Expanded: parts list + add part */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-slate-100">
                    {/* Parts in this product */}
                    {productParts.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Part</th>
                            <th className="text-right px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                            <th className="text-right px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Buy ea.</th>
                            <th className="text-right px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sell ea.</th>
                            <th className="text-right px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Line Total</th>
                            <th className="w-10 px-6 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {productParts.map(pp => {
                            const part = Array.isArray(pp.part) ? pp.part[0] : pp.part
                            const buyCost = part?.buy_cost != null ? Number(part.buy_cost) : null
                            const sellPrice = part?.sell_price != null ? Number(part.sell_price) : null
                            const lineTotal = sellPrice != null ? sellPrice * Number(pp.quantity) : null

                            return (
                              <tr key={pp.id}>
                                <td className="px-6 py-2.5 text-slate-800">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    {part?.name || 'Unknown part'}
                                  </div>
                                </td>
                                <td className="px-6 py-2.5 text-right">
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    defaultValue={pp.quantity}
                                    onBlur={e => handleUpdatePartQty(pp.id, product.id, e.target.value)}
                                    className="w-20 px-2 py-1 rounded border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-2.5 text-right text-slate-500">
                                  {buyCost != null ? `$${buyCost.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-6 py-2.5 text-right text-slate-600">
                                  {sellPrice != null ? `$${sellPrice.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-6 py-2.5 text-right font-medium text-slate-700">
                                  {lineTotal != null ? `$${lineTotal.toFixed(2)}` : '—'}
                                </td>
                                <td className="px-6 py-2.5">
                                  <button onClick={() => handleRemovePart(pp.id, product.id)}
                                    className="w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}

                    {productParts.length === 0 && (
                      <div className="px-6 py-4 text-center">
                        <p className="text-xs text-slate-500">No parts added yet. Add parts below to build this product.</p>
                      </div>
                    )}

                    {/* Add part to product */}
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Add Part</label>
                          <div className="relative">
                            <select
                              value={addPartId}
                              onChange={e => setAddPartId(e.target.value)}
                              className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select part…</option>
                              {availableParts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name}{p.sell_price != null ? ` — $${Number(p.sell_price).toFixed(2)}/${p.unit}` : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={addPartQty}
                            onChange={e => setAddPartQty(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleAddPart(product.id)}
                          disabled={!addPartId || addingPart}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {addingPart ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                      {availableParts.length === 0 && parts.length > 0 && (
                        <p className="text-xs text-slate-400 mt-2">All parts have been added to this product.</p>
                      )}
                      {parts.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                          No parts in catalogue.{' '}
                          <Link href="/settings/parts" className="text-blue-600 hover:underline">
                            Add parts first.
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
