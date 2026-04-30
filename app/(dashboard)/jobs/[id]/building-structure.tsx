'use client'

import { useEffect, useState } from 'react'
import {
  Building2, ChevronDown, Plus, Trash2,
  CheckCircle2, Circle, Layers,
} from 'lucide-react'
import {
  getBuildings, createBuilding, deleteBuilding,
  createLevel, deleteLevel,
  createRoom, markRoomDone, markRoomUndone, deleteRoom,
} from '@/lib/services/building-structure'

interface Room {
  id: string
  name: string
  planned_count: number
  done_count: number
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

const LEVEL_COLOURS = [
  '#60a5fa',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#22d3ee',
]

export default function BuildingStructure({
  siteId,
  companyId,
  userRole,
  userId,
}: {
  siteId: string
  companyId: string
  userRole: string
  userId?: string
}) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())
  const [newBuildingName, setNewBuildingName] = useState('')
  const [showNewBuilding, setShowNewBuilding] = useState(false)
  const [newLevelName, setNewLevelName] = useState<Record<string, string>>({})
  const [showNewLevel, setShowNewLevel] = useState<Record<string, boolean>>({})
  const [newRoomName, setNewRoomName] = useState<Record<string, string>>({})
  const [showNewRoom, setShowNewRoom] = useState<Record<string, boolean>>({})

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  useEffect(() => { load() }, [siteId])

  async function load() {
    const data = await getBuildings(siteId)
    setBuildings(data as Building[])
    setExpandedBuildings(new Set())
    setExpandedLevels(new Set())
    setLoading(false)
  }

  function toggleBuilding(id: string) {
    setExpandedBuildings(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleLevel(id: string) {
    setExpandedLevels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAddBuilding() {
    if (!newBuildingName.trim()) return
    const b = await createBuilding(siteId, companyId, newBuildingName.trim())
    setBuildings(prev => [...prev, { ...b, levels: [] }])
    setExpandedBuildings(prev => new Set([...prev, b.id]))
    setNewBuildingName('')
    setShowNewBuilding(false)
  }

  async function handleDeleteBuilding(id: string) {
    if (!confirm('Delete this building and all its levels and rooms?')) return
    await deleteBuilding(id)
    setBuildings(prev => prev.filter(b => b.id !== id))
  }

  async function handleAddLevel(buildingId: string) {
    const name = newLevelName[buildingId]?.trim()
    if (!name) return
    const building = buildings.find(b => b.id === buildingId)
    const orderIndex = building?.levels.length ?? 0
    const level = await createLevel(buildingId, companyId, name, orderIndex)
    setBuildings(prev => prev.map(b =>
      b.id === buildingId
        ? { ...b, levels: [...b.levels, { ...level, rooms: [] }] }
        : b
    ))
    setExpandedLevels(prev => new Set([...prev, level.id]))
    setNewLevelName(prev => ({ ...prev, [buildingId]: '' }))
    setShowNewLevel(prev => ({ ...prev, [buildingId]: false }))
  }

  async function handleDeleteLevel(buildingId: string, levelId: string) {
    if (!confirm('Delete this level and all its rooms?')) return
    await deleteLevel(levelId)
    setBuildings(prev => prev.map(b =>
      b.id === buildingId
        ? { ...b, levels: b.levels.filter(l => l.id !== levelId) }
        : b
    ))
  }

  async function handleAddRoom(levelId: string) {
    const name = newRoomName[levelId]?.trim()
    if (!name) return
    const room = await createRoom(levelId, companyId, name, 0)
    setBuildings(prev => prev.map(b => ({
      ...b,
      levels: b.levels.map(l =>
        l.id === levelId
          ? { ...l, rooms: [...l.rooms, { ...room, done_count: 0, is_done: false }] }
          : l
      ),
    })))
    setNewRoomName(prev => ({ ...prev, [levelId]: '' }))
    setShowNewRoom(prev => ({ ...prev, [levelId]: false }))
  }

  async function handleDeleteRoom(levelId: string, roomId: string) {
    if (!confirm('Delete this room?')) return
    await deleteRoom(roomId)
    setBuildings(prev => prev.map(b => ({
      ...b,
      levels: b.levels.map(l =>
        l.id === levelId
          ? { ...l, rooms: l.rooms.filter(r => r.id !== roomId) }
          : l
      ),
    })))
  }

  async function handleToggleRoom(levelId: string, room: Room) {
    if (room.is_done) {
      await markRoomUndone(room.id)
      setBuildings(prev => prev.map(b => ({
        ...b,
        levels: b.levels.map(l =>
          l.id === levelId
            ? { ...l, rooms: l.rooms.map(r => r.id === room.id ? { ...r, is_done: false } : r) }
            : l
        ),
      })))
    } else {
      await markRoomDone(room.id)
      setBuildings(prev => prev.map(b => ({
        ...b,
        levels: b.levels.map(l =>
          l.id === levelId
            ? { ...l, rooms: l.rooms.map(r => r.id === room.id ? { ...r, is_done: true } : r) }
            : l
        ),
      })))
    }
  }

  if (loading) return (
    <div className="p-6 text-center text-sm text-slate-400">Loading structure…</div>
  )

  return (
    <div className="space-y-4">
      {buildings.length === 0 && (
        <div className="text-center py-10">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No buildings added yet.</p>
          {isAdmin && (
            <p className="text-xs text-slate-400 mt-1">
              Add a building to start organising by level and room.
            </p>
          )}
        </div>
      )}

      {buildings.map(building => (
        <div key={building.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => toggleBuilding(building.id)}
          >
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="flex-1 font-semibold text-slate-800 text-sm">{building.name}</span>
            <span className="text-xs text-slate-400 mr-1">
              {building.levels.length} level{building.levels.length !== 1 ? 's' : ''}
            </span>
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); handleDeleteBuilding(building.id) }}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              expandedBuildings.has(building.id) ? 'rotate-0' : '-rotate-90'
              }`} />
          </div>

          {expandedBuildings.has(building.id) && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {building.levels.map((level, levelIndex) => {
                const colour = LEVEL_COLOURS[levelIndex % LEVEL_COLOURS.length]
                const doneCount = level.rooms.filter(r => r.is_done).length
                const isExpanded = expandedLevels.has(level.id)

                return (
                  <div key={level.id}>
                    <div
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                      style={{ borderLeft: `3px solid ${colour}` }}
                      onClick={() => toggleLevel(level.id)}
                    >
                      <span className="flex-1 text-sm font-medium text-slate-700">{level.name}</span>
                      <span className="text-xs text-slate-400 mr-1">
                        {doneCount}/{level.rooms.length} rooms done
                      </span>
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteLevel(building.id, level.id) }}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'
                        }`} />
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-50 px-4 pb-3 pt-2 space-y-3"
                        style={{ borderLeft: `3px solid ${colour}` }}>

                        {/* Rooms Section */}
                        <div>
                          {level.rooms.length === 0 && (
                            <p className="text-xs text-slate-400 py-1 pl-1">No rooms added yet.</p>
                          )}
                          {level.rooms.map(room => (
                            <div key={room.id} className="flex items-center gap-2.5 group py-0.5">
                              <button
                                onClick={() => handleToggleRoom(level.id, room)}
                                className="flex-shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                              >
                                {room.is_done
                                  ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  : <Circle className="w-4 h-4" />
                                }
                              </button>
                              <span className={`flex-1 text-sm ${room.is_done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {room.name}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteRoom(level.id, room.id)}
                                  className="p-1 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}

                          {isAdmin && (
                            showNewRoom[level.id] ? (
                              <div className="flex items-center gap-2 mt-2 ml-6">
                                <input
                                  type="text"
                                  value={newRoomName[level.id] || ''}
                                  onChange={e => setNewRoomName(prev => ({ ...prev, [level.id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && handleAddRoom(level.id)}
                                  placeholder="Room name, e.g. Room 101"
                                  autoFocus
                                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                                <button onClick={() => handleAddRoom(level.id)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                  Add
                                </button>
                                <button onClick={() => setShowNewRoom(prev => ({ ...prev, [level.id]: false }))}
                                  className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-600 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowNewRoom(prev => ({ ...prev, [level.id]: true }))}
                                className="flex items-center gap-1.5 ml-6 mt-1 px-2 py-1 text-xs text-slate-400 hover:text-blue-600 transition-colors rounded-md hover:bg-white"
                              >
                                <Plus className="w-3 h-3" />
                                Add room
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {isAdmin && (
                <div className="px-4 py-2">
                  {showNewLevel[building.id] ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newLevelName[building.id] || ''}
                        onChange={e => setNewLevelName(prev => ({ ...prev, [building.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddLevel(building.id)}
                        placeholder="Level name, e.g. Level 3"
                        autoFocus
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button onClick={() => handleAddLevel(building.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Add
                      </button>
                      <button onClick={() => setShowNewLevel(prev => ({ ...prev, [building.id]: false }))}
                        className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewLevel(prev => ({ ...prev, [building.id]: true }))}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add level
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {isAdmin && (
        <div>
          {showNewBuilding ? (
            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3">
              <input
                type="text"
                value={newBuildingName}
                onChange={e => setNewBuildingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBuilding()}
                placeholder="Building name, e.g. Tower A"
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleAddBuilding}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                Add
              </button>
              <button onClick={() => { setShowNewBuilding(false); setNewBuildingName('') }}
                className="px-2 py-1.5 text-slate-400 text-xs hover:text-slate-600 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBuilding(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Building
            </button>
          )}
        </div>
      )}
    </div>
  )
}
