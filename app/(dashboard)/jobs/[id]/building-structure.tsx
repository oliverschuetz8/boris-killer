'use client'

import { useEffect, useState } from 'react'
import {
  Building2, ChevronDown, ChevronRight, Plus, Trash2,
  CheckCircle2, Circle, Layers, DoorOpen
} from 'lucide-react'
import {
  getBuildings, createBuilding, deleteBuilding,
  createLevel, deleteLevel,
  createRoom, markRoomDone, markRoomUndone, deleteRoom
} from '@/lib/services/building-structure'

interface Room {
  id: string
  name: string
  planned_count: number
  done_count: number
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

export default function BuildingStructure({
  siteId,
  companyId,
  userRole,
}: {
  siteId: string
  companyId: string
  userRole: string
}) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())

  // Add forms state
  const [newBuildingName, setNewBuildingName] = useState('')
  const [showNewBuilding, setShowNewBuilding] = useState(false)
  const [newLevelName, setNewLevelName] = useState<Record<string, string>>({})
  const [showNewLevel, setShowNewLevel] = useState<Record<string, boolean>>({})
  const [newRoomName, setNewRoomName] = useState<Record<string, string>>({})
  const [newRoomCount, setNewRoomCount] = useState<Record<string, string>>({})
  const [showNewRoom, setShowNewRoom] = useState<Record<string, boolean>>({})

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    load()
  }, [siteId])

  async function load() {
    const data = await getBuildings(siteId)
    setBuildings(data as Building[])
    // Auto-expand all buildings and levels
    const bIds = new Set(data.map((b: any) => b.id))
    const lIds = new Set(data.flatMap((b: any) => b.levels.map((l: any) => l.id)))
    setExpandedBuildings(bIds as Set<string>)
    setExpandedLevels(lIds as Set<string>)
    setLoading(false)
  }

  async function handleAddBuilding() {
    if (!newBuildingName.trim()) return
    await createBuilding(siteId, companyId, newBuildingName.trim())
    setNewBuildingName('')
    setShowNewBuilding(false)
    load()
  }

  async function handleAddLevel(buildingId: string) {
    const name = newLevelName[buildingId]?.trim()
    if (!name) return
    const building = buildings.find(b => b.id === buildingId)
    const orderIndex = (building?.levels.length || 0)
    await createLevel(buildingId, companyId, name, orderIndex)
    setNewLevelName(prev => ({ ...prev, [buildingId]: '' }))
    setShowNewLevel(prev => ({ ...prev, [buildingId]: false }))
    load()
  }

  async function handleAddRoom(levelId: string) {
    const name = newRoomName[levelId]?.trim()
    const count = parseInt(newRoomCount[levelId] || '0')
    if (!name) return
    await createRoom(levelId, companyId, name, count)
    setNewRoomName(prev => ({ ...prev, [levelId]: '' }))
    setNewRoomCount(prev => ({ ...prev, [levelId]: '' }))
    setShowNewRoom(prev => ({ ...prev, [levelId]: false }))
    load()
  }

  async function handleToggleRoom(room: Room) {
    if (room.done_count >= room.planned_count && room.planned_count > 0) {
      await markRoomUndone(room.id)
    } else {
      await markRoomDone(room.id, room.planned_count)
    }
    load()
  }

  if (loading) return (
    <div className="p-6 text-center text-sm text-slate-400">Loading structure…</div>
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Building Structure</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Set up buildings, levels and rooms. Workers mark rooms complete on site.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNewBuilding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Building
          </button>
        )}
      </div>

      {/* New building form */}
      {showNewBuilding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2">
          <input
            type="text"
            placeholder="e.g. Tower A, Main Building"
            value={newBuildingName}
            onChange={e => setNewBuildingName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBuilding()}
            autoFocus
            className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddBuilding} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            Add
          </button>
          <button onClick={() => setShowNewBuilding(false)} className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-700">
            Cancel
          </button>
        </div>
      )}

      {/* Empty state */}
      {buildings.length === 0 && !showNewBuilding && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No buildings yet</p>
          <p className="text-xs text-slate-400 mt-1">Add a building to start setting up the structure.</p>
        </div>
      )}

      {/* Buildings */}
      {buildings.map(building => {
        const totalRooms = building.levels.flatMap(l => l.rooms).length
        const doneRooms = building.levels.flatMap(l => l.rooms).filter(r => r.done_count >= r.planned_count && r.planned_count > 0).length
        const isBuildingExpanded = expandedBuildings.has(building.id)

        return (
          <div key={building.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            {/* Building header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedBuildings(prev => {
                const next = new Set(prev)
                next.has(building.id) ? next.delete(building.id) : next.add(building.id)
                return next
              })}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">{building.name}</span>
                <span className="text-xs text-slate-400">
                  {totalRooms} room{totalRooms !== 1 ? 's' : ''} · {doneRooms}/{totalRooms} done
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteBuilding(building.id).then(load) }}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isBuildingExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />
                }
              </div>
            </div>

            {/* Levels */}
            {isBuildingExpanded && (
              <div className="border-t border-slate-100">
                {building.levels
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(level => {
                    const isLevelExpanded = expandedLevels.has(level.id)
                    const levelDone = level.rooms.filter(r => r.done_count >= r.planned_count && r.planned_count > 0).length

                    return (
                      <div key={level.id} className="border-b border-slate-50 last:border-0">

                        {/* Level header */}
                        <div
                          className="flex items-center justify-between px-4 py-2.5 pl-8 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedLevels(prev => {
                            const next = new Set(prev)
                            next.has(level.id) ? next.delete(level.id) : next.add(level.id)
                            return next
                          })}
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{level.name}</span>
                            <span className="text-xs text-slate-400">
                              {levelDone}/{level.rooms.length} rooms done
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                onClick={e => { e.stopPropagation(); deleteLevel(level.id).then(load) }}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isLevelExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            }
                          </div>
                        </div>

                        {/* Rooms */}
                        {isLevelExpanded && (
                          <div className="pl-12 pr-4 pb-3 space-y-1.5">
                            {level.rooms.map(room => {
                              const isDone = room.done_count >= room.planned_count && room.planned_count > 0
                              return (
                                <div
                                  key={room.id}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                                    isDone
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                          <button
                                              onClick={() => handleToggleRoom(room)}
                                              className="flex-shrink-0"
                                          >
                                              {isDone
                                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                                  : <Circle className="w-3.5 h-3.5 text-slate-300 hover:text-slate-400" />
                                              }
                                          </button>
                                    <div>
                                      <p className={`text-sm font-medium ${isDone ? 'text-green-800' : 'text-slate-700'}`}>
                                        {room.name}
                                      </p>
                                      {room.planned_count > 0 && (
                                        <p className="text-xs text-slate-400">
                                          {room.done_count}/{room.planned_count} penetrations
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => deleteRoom(room.id).then(load)}
                                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}

                            {/* Add room form */}
                            {isAdmin && showNewRoom[level.id] ? (
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  placeholder="Room name"
                                  value={newRoomName[level.id] || ''}
                                  onChange={e => setNewRoomName(prev => ({ ...prev, [level.id]: e.target.value }))}
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                  type="number"
                                  placeholder="Count"
                                  min={0}
                                  value={newRoomCount[level.id] || ''}
                                  onChange={e => setNewRoomCount(prev => ({ ...prev, [level.id]: e.target.value }))}
                                  className="w-20 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => handleAddRoom(level.id)}
                                  className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => setShowNewRoom(prev => ({ ...prev, [level.id]: false }))}
                                  className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : isAdmin ? (
                              <button
                                onClick={() => setShowNewRoom(prev => ({ ...prev, [level.id]: true }))}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors mt-1 px-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add room
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )
                  })}

                {/* Add level form */}
                {isAdmin && (
                  <div className="px-4 py-2 pl-8 border-t border-slate-50">
                    {showNewLevel[building.id] ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Level 1, Basement, Rooftop"
                          value={newLevelName[building.id] || ''}
                          onChange={e => setNewLevelName(prev => ({ ...prev, [building.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddLevel(building.id)}
                          autoFocus
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAddLevel(building.id)}
                          className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setShowNewLevel(prev => ({ ...prev, [building.id]: false }))}
                          className="px-2 text-slate-400 text-xs hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewLevel(prev => ({ ...prev, [building.id]: true }))}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add level
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}