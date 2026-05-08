'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterDef {
  key: string
  label: string
  options: FilterOption[]
}

interface SearchFilterProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterDef[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onClearAll?: () => void
  className?: string
}

export default function SearchFilter({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  activeFilters,
  onFilterChange,
  onClearAll,
  className = '',
}: SearchFilterProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeCount = Object.values(activeFilters).filter(v => v && v !== '').length
  const hasAnyActive = activeCount > 0 || search.length > 0

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleClearAll() {
    onSearchChange('')
    filters.forEach(f => onFilterChange(f.key, ''))
    if (onClearAll) onClearAll()
    setOpen(false)
  }

  function getActiveLabel(filter: FilterDef): string | null {
    const value = activeFilters[filter.key]
    if (!value) return null
    const option = filter.options.find(o => o.value === value)
    return option ? option.label : value
  }

  return (
    <div className={`w-full ${className}`}>
      <div ref={containerRef} className="relative flex items-center gap-2">

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter button */}
        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            aria-label="Filter"
            aria-expanded={open}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-semibold rounded-full bg-blue-600 text-white">
                {activeCount}
              </span>
            )}
          </button>
        )}

        {/* Clear all (only shown when something is active) */}
        {hasAnyActive && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 px-2 py-2"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        {/* Filter popover */}
        {open && filters.length > 0 && (
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Filters</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-4 max-h-96 overflow-y-auto">
              {filters.map(filter => (
                <div key={filter.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {filter.label}
                  </label>
                  <div className="relative">
                    <select
                      value={activeFilters[filter.key] || ''}
                      onChange={e => onFilterChange(filter.key, e.target.value)}
                      className="w-full appearance-none pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {filter.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}{opt.count != null ? ` (${opt.count})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
            {activeCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500">
                  {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
                </p>
                <button
                  type="button"
                  onClick={() => {
                    filters.forEach(f => onFilterChange(f.key, ''))
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active filter pills */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {filters.map(filter => {
            const label = getActiveLabel(filter)
            if (!label) return null
            return (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700"
              >
                <span className="text-blue-500">{filter.label}:</span> {label}
                <button
                  type="button"
                  onClick={() => onFilterChange(filter.key, '')}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-700 transition-colors"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
