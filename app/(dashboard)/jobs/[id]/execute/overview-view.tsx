'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRoomsForJob } from '@/lib/services/building-structure'
import { getPenetrationCountsByRoom } from '@/lib/services/penetrations'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, X } from 'lucide-react'

interface Room {
  id: string
  name: string
  is_done: boolean
}

interface Level {
  id: string
  name: string
  order_index: number
  rooms: Room[]
}

interface Building {
  id: string
  name: string
  levels: Level[]
}

interface Props {
  jobId: string
  onClose: () => void
  refreshTrigger: number
}

export default function OverviewView({ jobId, onClose, refreshTrigger }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [structureData, countsData] = await Promise.all([
        getRoomsForJob(jobId),
        getPenetrationCountsByRoom(jobId),
      ])
      const mapped: Building[] = (structureData as any[]).map(b => ({
        id: b.id,
        name: b.name,
        levels: (b.levels || [])
          .slice()
          .sort((a: any, z: any) => a.order_index - z.order_index)
          .map((l: any) => ({
            id: l.id,
            name: l.name,
            order_index: l.order_index,
            rooms: (l.rooms || []),
          })),
      }))
      setBuildings(mapped)
      setCounts(countsData)
      // Auto-expand all levels
      const allLevelIds = new Set(mapped.flatMap(b => b.levels.map(l => l.id)))
      setExpandedLevels(allLevelIds)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load() }, [load, refreshTrigger])

  function toggleLevel(id: string) {
    setExpandedLevels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const LEVEL_COLOURS = [
    '#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee',
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-800">Job Overview</p>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-slate-400">Loading overview…</div>
      ) : buildings.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-400">
          No structure set up for this job.
        </div>
      ) : (
        <div>
          {buildings.map(building => (
            <div key={building.id}>
              {buildings.length > 1 && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {building.name}
                  </p>
                </div>
              )}

              {building.levels.map((level, levelIndex) => {
                const colour = LEVEL_COLOURS[levelIndex % LEVEL_COLOURS.length]
                const isExpanded = expandedLevels.has(level.id)
                const doneRooms = level.rooms.filter(r => r.is_done).length
                const allDone = level.rooms.length > 0 && doneRooms === level.rooms.length

                return (
                  <div key={level.id} className="border-b border-slate-100 last:border-0">
                    {/* Level row */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      style={{ borderLeft: `3px solid ${colour}` }}
                      onClick={() => toggleLevel(level.id)}
                    >
                      <div className="flex-shrink-0">
                        {allDone
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <Circle className="w-4 h-4 text-slate-300" />
                        }
                      </div>
                      <span className="flex-1 text-sm font-semibold text-slate-800">{level.name}</span>
                      <span className="text-xs text-slate-400 mr-1">
                        {doneRooms}/{level.rooms.length} rooms done
                      </span>
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />
                      }
                    </div>

                    {/* Rooms */}
                    {isExpanded && (
                      <div className="bg-slate-50 divide-y divide-slate-100"
                        style={{ borderLeft: `3px solid ${colour}` }}>
                        {level.rooms.length === 0 ? (
                          <p className="px-10 py-2 text-xs text-slate-400">No rooms set up.</p>
                        ) : (
                          level.rooms.map(room => {
                            const penCount = counts[room.id] ?? 0
                            return (
                              <div key={room.id} className="flex items-center gap-3 px-4 py-2.5">
                                <div className="flex-shrink-0 ml-2">
                                  {room.is_done
                                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    : <Circle className="w-4 h-4 text-slate-300" />
                                  }
                                </div>
                                <span className={`flex-1 text-sm ${room.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {room.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {penCount} penetration{penCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}