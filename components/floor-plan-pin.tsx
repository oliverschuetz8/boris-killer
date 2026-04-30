'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MapPin, X, Eye, EyeOff, Plus, Minus, Move, Pencil, Trash2, Check } from 'lucide-react'

// ─── Shared types ───

export interface PinData {
  id: string
  x: number // 0–100 percentage
  y: number // 0–100 percentage
  label: string
}

// ─── Zoom/Pan hook (shared by Picker and Viewer) ───

function useZoomPan(containerRef: React.RefObject<HTMLDivElement | null>, imageRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastTouch = useRef<{ x: number; y: number } | null>(null)
  const lastPinchDist = useRef<number | null>(null)

  const MIN_SCALE = 1
  const MAX_SCALE = 5

  // Clamp translation so at least 20% of the drawing stays visible on each edge
  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return { x: tx, y: ty }

    const cw = container.clientWidth
    const ch = container.clientHeight
    const iw = image.scrollWidth * s
    const ih = image.scrollHeight * s

    // How much of the drawing must remain visible (in pixels)
    const margin = 0.2
    const minVisibleX = cw * margin
    const minVisibleY = ch * margin

    // Clamp: drawing can't be dragged so far that less than margin% is visible
    const minX = Math.min(0, cw - iw + (cw * margin) - cw * margin) // simplify: -(iw - minVisibleX)
    const maxX = cw - minVisibleX

    const minY = -(ih - minVisibleY)
    const maxY = ch - minVisibleY

    return {
      x: Math.max(minX, Math.min(maxX, tx)),
      y: Math.max(minY, Math.min(maxY, ty)),
    }
  }, [containerRef, imageRef])

  // Use a ref to always have the latest clampTranslate without re-attaching the listener
  const clampRef = useRef(clampTranslate)
  clampRef.current = clampTranslate

  // Attach native wheel listener with { passive: false } so preventDefault() actually works
  // This stops the page from scrolling when the cursor is over the drawing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()

      const rect = el!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const delta = e.deltaY > 0 ? -0.15 : 0.15

      setScale(prevScale => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale + delta))
        setTranslate(prev => {
          const imgX = (mx - prev.x) / prevScale
          const imgY = (my - prev.y) / prevScale
          return clampRef.current(mx - imgX * newScale, my - imgY * newScale, newScale)
        })
        return newScale
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isPanning.current = true
    lastTouch.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !lastTouch.current) return
    const dx = e.clientX - lastTouch.current.x
    const dy = e.clientY - lastTouch.current.y
    setTranslate(prev => clampTranslate(prev.x + dx, prev.y + dy, scale))
    lastTouch.current = { x: e.clientX, y: e.clientY }
  }, [clampTranslate, scale])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
    lastTouch.current = null
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1) {
      isPanning.current = true
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const delta = (dist - lastPinchDist.current) * 0.01
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta))
      setScale(newScale)
      setTranslate(prev => clampTranslate(prev.x, prev.y, newScale))
      lastPinchDist.current = dist
    } else if (e.touches.length === 1 && isPanning.current && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x
      const dy = e.touches[0].clientY - lastTouch.current.y
      setTranslate(prev => clampTranslate(prev.x + dx, prev.y + dy, scale))
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [clampTranslate, scale])

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false
    lastTouch.current = null
    lastPinchDist.current = null
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  // Wrap setScale to enforce limits
  const setScaleClamped = useCallback((updater: number | ((prev: number) => number)) => {
    setScale(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next))
      // Re-clamp translate for the new scale
      setTranslate(t => clampTranslate(t.x, t.y, clamped))
      return clamped
    })
  }, [clampTranslate])

  return {
    scale, translate, setScale: setScaleClamped,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    resetView,
  }
}

// ─── Pin label badge component ───

function PinBadge({
  label,
  size,
  isActive,
  isGrey,
  onClick,
}: {
  label: string
  size: number
  isActive?: boolean
  isGrey?: boolean
  onClick?: (e: React.MouseEvent) => void
}) {
  const iconSize = size
  const fontSize = Math.max(8, size * 0.45)
  const badgeMinW = Math.max(14, size * 0.7)

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-full ${onClick ? 'cursor-pointer' : 'pointer-events-none'}`}
      onClick={onClick}
      style={{ zIndex: isActive ? 30 : 10 }}
    >
      <MapPin
        className={`drop-shadow-md transition-transform ${
          isGrey
            ? 'text-slate-300'
            : isActive
              ? 'text-blue-600 scale-110'
              : 'text-red-600'
        }`}
        style={{ width: iconSize, height: iconSize }}
        fill="currentColor"
        strokeWidth={1.5}
      />
      {label && (
        <span
          className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded-full font-bold flex items-center justify-center shadow-sm whitespace-nowrap px-1 ${
            isGrey
              ? 'bg-slate-200 text-slate-400 border border-slate-300'
              : isActive
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300'
          }`}
          style={{ fontSize, minWidth: badgeMinW, height: badgeMinW, lineHeight: `${badgeMinW}px` }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

// ─── Picker: worker places ONE pin, sees all existing pins ───

interface FloorPlanPickerProps {
  imageUrl: string
  pin: { x: number; y: number } | null
  pinLabel: string
  onPinChange: (pin: { x: number; y: number } | null) => void
  onPinLabelChange: (label: string) => void
  existingPins: PinData[]
  onPinTap?: (pin: PinData) => void
  onPinMove?: (pinId: string, x: number, y: number) => void
  onPinDelete?: (pinId: string) => void
}

export function FloorPlanPicker({
  imageUrl,
  pin,
  pinLabel,
  onPinChange,
  onPinLabelChange,
  existingPins,
  onPinTap,
  onPinMove,
  onPinDelete,
}: FloorPlanPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const { scale, translate, setScale, handlers, resetView } = useZoomPan(containerRef, imageRef)
  const [hidePins, setHidePins] = useState(false)
  const [pinSize, setPinSize] = useState(24)
  const [actionMenu, setActionMenu] = useState<{ pin: PinData; x: number; y: number } | null>(null)
  const [moveMode, setMoveMode] = useState<string | null>(null) // penetration ID being moved
  const clickStart = useRef<{ x: number; y: number; time: number } | null>(null)

  function getImageCoords(clientX: number, clientY: number) {
    const el = imageRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return null
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
    if (clientX !== undefined && clientY !== undefined) {
      clickStart.current = { x: clientX, y: clientY, time: Date.now() }
    }
  }

  function handleImageClick(e: React.MouseEvent) {
    // Only place pin if it was a click, not a drag
    if (clickStart.current) {
      const dx = Math.abs(e.clientX - clickStart.current.x)
      const dy = Math.abs(e.clientY - clickStart.current.y)
      const dt = Date.now() - clickStart.current.time
      if (dx > 5 || dy > 5 || dt > 300) return // was a drag/pan
    }

    setActionMenu(null)

    if (moveMode) {
      const coords = getImageCoords(e.clientX, e.clientY)
      if (coords) {
        onPinMove?.(moveMode, coords.x, coords.y)
        setMoveMode(null)
      }
      return
    }

    const coords = getImageCoords(e.clientX, e.clientY)
    if (coords) onPinChange(coords)
  }

  function handleExistingPinClick(e: React.MouseEvent, p: PinData) {
    e.stopPropagation()
    if (moveMode) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setActionMenu({
      pin: p,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  function handleMoveAction(pinId: string) {
    setMoveMode(pinId)
    setActionMenu(null)
  }

  function handleDeleteAction(pinId: string) {
    if (confirm('Delete this penetration and all its photos?')) {
      onPinDelete?.(pinId)
    }
    setActionMenu(null)
  }

  return (
    <div className="space-y-2">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-medium text-slate-600">
          {moveMode ? 'Tap the map to move the pin' : 'Tap on the plan to mark location'}
        </p>
        <div className="flex items-center gap-1">
          {pin && (
            <button
              type="button"
              onClick={() => onPinChange(null)}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
          {moveMode && (
            <button
              type="button"
              onClick={() => setMoveMode(null)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel Move
            </button>
          )}
        </div>
      </div>

      {/* Label input */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Pin Label <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={pinLabel}
          onChange={e => onPinLabelChange(e.target.value)}
          placeholder="e.g. 1, 1.1, A1, B-2"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Toolbar: hide/show, zoom, pin size */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setHidePins(!hidePins)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            hidePins
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {hidePins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {hidePins ? 'Show Pins' : 'Hide Pins'}
        </button>

        <div className="flex items-center gap-0.5 ml-auto">
          <span className="text-xs text-slate-400 mr-1">Zoom</span>
          <button type="button" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={resetView}
            className="px-2 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={() => setScale(s => Math.min(5, s + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <span className="text-xs text-slate-400 mr-1">Pins</span>
          <button type="button" onClick={() => setPinSize(s => Math.max(14, s - 4))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setPinSize(s => Math.min(48, s + 4))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floor plan canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border border-slate-200 overflow-hidden bg-white"
        style={{ touchAction: 'none', cursor: moveMode ? 'crosshair' : 'crosshair' }}
        {...handlers}
        onMouseDown={e => { handlePointerDown(e); handlers.onMouseDown(e) }}
        onClick={handleImageClick}
      >
        <div
          ref={imageRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Floor plan"
            className="w-full object-contain select-none pointer-events-none"
            draggable={false}
          />

          {/* Existing pins */}
          {!hidePins && existingPins.map(p => (
            <div
              key={p.id}
              className="absolute"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <PinBadge
                label={p.label}
                size={pinSize}
                isGrey={!!moveMode && moveMode !== p.id}
                isActive={actionMenu?.pin.id === p.id}
                onClick={e => handleExistingPinClick(e, p)}
              />
            </div>
          ))}

          {/* New pin being placed */}
          {pin && (
            <div
              className="absolute"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <PinBadge
                label={pinLabel || '?'}
                size={pinSize + 4}
                isActive
              />
            </div>
          )}
        </div>
      </div>

      {/* Action menu popup */}
      {actionMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
          <div
            className="absolute z-50 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
            style={{
              left: Math.min(actionMenu.x, (containerRef.current?.offsetWidth ?? 200) - 160),
              top: actionMenu.y,
            }}
          >
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 truncate">
                Pin: {actionMenu.pin.label}
              </p>
            </div>
            {onPinTap && (
              <button
                type="button"
                onClick={() => { onPinTap(actionMenu.pin); setActionMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {onPinMove && (
              <button
                type="button"
                onClick={() => handleMoveAction(actionMenu.pin.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                <Move className="w-3.5 h-3.5" /> Move
              </button>
            )}
            {onPinDelete && (
              <button
                type="button"
                onClick={() => handleDeleteAction(actionMenu.pin.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Viewer: shows many pins (read-only, for Evidence tab and Drawings view) ───

interface FloorPlanViewerProps {
  imageUrl: string
  pins: PinData[]
  activePinId?: string | null
  onPinClick?: (id: string) => void
  onPinTap?: (pin: PinData) => void
  onPinMove?: (pinId: string, x: number, y: number) => void
  onPinDelete?: (pinId: string) => void
  interactive?: boolean
}

export function FloorPlanViewer({
  imageUrl,
  pins,
  activePinId,
  onPinClick,
  onPinTap,
  onPinMove,
  onPinDelete,
  interactive = false,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const { scale, translate, setScale, handlers, resetView } = useZoomPan(containerRef, imageRef)
  const [pinSize, setPinSize] = useState(24)
  const [actionMenu, setActionMenu] = useState<{ pin: PinData; x: number; y: number } | null>(null)
  const [moveMode, setMoveMode] = useState<string | null>(null)
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)
  const clickStart = useRef<{ x: number; y: number; time: number } | null>(null)

  function getImageCoords(clientX: number, clientY: number) {
    const el = imageRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return null
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  }

  function handlePointerDown(e: React.MouseEvent | React.TouchEvent) {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
    if (clientX !== undefined && clientY !== undefined) {
      clickStart.current = { x: clientX, y: clientY, time: Date.now() }
    }
  }

  function handleImageClick(e: React.MouseEvent) {
    if (clickStart.current) {
      const dx = Math.abs(e.clientX - clickStart.current.x)
      const dy = Math.abs(e.clientY - clickStart.current.y)
      const dt = Date.now() - clickStart.current.time
      if (dx > 5 || dy > 5 || dt > 300) return
    }

    setActionMenu(null)

    if (moveMode) {
      const coords = getImageCoords(e.clientX, e.clientY)
      if (coords) {
        onPinMove?.(moveMode, coords.x, coords.y)
        setMoveMode(null)
      }
      return
    }
  }

  function handlePinClick(e: React.MouseEvent, p: PinData) {
    e.stopPropagation()

    if (moveMode) return

    if (interactive && (onPinTap || onPinMove || onPinDelete)) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setActionMenu({
        pin: p,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    } else if (onPinClick) {
      onPinClick(p.id)
    }
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-slate-400 mr-1">Zoom</span>
          <button type="button" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={resetView}
            className="px-2 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={() => setScale(s => Math.min(5, s + 0.25))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          <span className="text-xs text-slate-400 mr-1">Pins</span>
          <button type="button" onClick={() => setPinSize(s => Math.max(14, s - 4))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setPinSize(s => Math.min(48, s + 4))}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {moveMode && (
          <button
            type="button"
            onClick={() => setMoveMode(null)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel Move
          </button>
        )}
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border border-slate-200 overflow-hidden bg-white"
        style={{ touchAction: 'none', cursor: moveMode ? 'crosshair' : 'grab' }}
        {...handlers}
        onMouseDown={e => { handlePointerDown(e); handlers.onMouseDown(e) }}
        onClick={handleImageClick}
      >
        <div
          ref={imageRef}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Floor plan"
            className="w-full object-contain select-none pointer-events-none"
            draggable={false}
          />

          {pins.map(p => (
            <div
              key={p.id}
              className="absolute"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onMouseEnter={() => setHoveredPin(p.id)}
              onMouseLeave={() => setHoveredPin(null)}
            >
              <PinBadge
                label={p.label}
                size={pinSize}
                isActive={activePinId === p.id || hoveredPin === p.id}
                isGrey={!!moveMode && moveMode !== p.id}
                onClick={e => handlePinClick(e, p)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action menu popup */}
      {actionMenu && interactive && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
          <div
            className="absolute z-50 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
            style={{
              left: Math.min(actionMenu.x, (containerRef.current?.offsetWidth ?? 200) - 160),
              top: actionMenu.y,
            }}
          >
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 truncate">
                Pin: {actionMenu.pin.label}
              </p>
            </div>
            {onPinTap && (
              <button
                type="button"
                onClick={() => { onPinTap(actionMenu.pin); setActionMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {onPinMove && (
              <button
                type="button"
                onClick={() => { setMoveMode(actionMenu.pin.id); setActionMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                <Move className="w-3.5 h-3.5" /> Move
              </button>
            )}
            {onPinDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this penetration and all its photos?')) {
                    onPinDelete(actionMenu.pin.id)
                  }
                  setActionMenu(null)
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
