'use client'

import { useEffect, useState, useCallback } from 'react'
import { getJobPhotos, getPhotoUrl, deleteJobPhoto } from '@/lib/services/photos'
import { ImageIcon, ChevronDown, ChevronRight, Trash2, X, ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import PhotoAssignModal from './photo-assign-modal'

interface Photo {
  id: string
  storage_path: string
  level: string | null
  space_type: string | null
  space_identifier: string | null
  space_key: string | null
  work_type: string | null
  before_after: string | null
  caption: string | null
  uploaded_at: string
  edit_deadline: string | null
  uploader?: { full_name: string | null } | null
}

interface SpaceGroup {
  spaceType: string
  spaceIdentifier: string
  displayLabel: string
  photos: Photo[]
  lastActivity: string
}

interface LevelGroup {
  level: string
  spaces: SpaceGroup[]
  total: number
}

function buildGroups(photos: Photo[]): { levels: LevelGroup[]; unassigned: Photo[] } {
  const levelMap: Record<string, Record<string, Photo[]>> = {}
  const unassigned: Photo[] = []

  for (const photo of photos) {
    if (!photo.level && !photo.space_type) {
      unassigned.push(photo)
      continue
    }
    const levelKey = photo.level || 'Unknown Level'
    const spaceKey = photo.space_key || `other::${(photo.space_identifier || 'unknown').toLowerCase()}`
    if (!levelMap[levelKey]) levelMap[levelKey] = {}
    if (!levelMap[levelKey][spaceKey]) levelMap[levelKey][spaceKey] = []
    levelMap[levelKey][spaceKey].push(photo)
  }

  const levelOrder: Record<string, number> = { 'Basement': -2, 'Ground Floor': -1, 'Roof': 999 }

  const levels: LevelGroup[] = Object.entries(levelMap)
    .sort(([a], [b]) => {
      const aO = levelOrder[a] ?? parseInt(a.replace(/\D/g, '') || '50')
      const bO = levelOrder[b] ?? parseInt(b.replace(/\D/g, '') || '50')
      return aO - bO
    })
    .map(([level, spaceMap]) => {
      const spaces: SpaceGroup[] = Object.entries(spaceMap)
        .map(([, photos]) => {
          const first = photos[0]
          const label = [first.space_type, first.space_identifier].filter(Boolean).join(' ')
          return {
            spaceType: first.space_type || '',
            spaceIdentifier: first.space_identifier || '',
            displayLabel: label || 'Unknown Space',
            photos: [...photos].sort((a, b) =>
              new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
            ),
            lastActivity: photos.reduce((latest, p) =>
              p.uploaded_at > latest ? p.uploaded_at : latest, photos[0].uploaded_at
            ),
          }
        })
        .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
      return { level, spaces, total: spaces.reduce((n, s) => n + s.photos.length, 0) }
    })

  return { levels, unassigned }
}

export default function PhotoGallery({
  jobId,
  refreshTrigger,
  userRole = 'worker',
}: {
  jobId: string
  refreshTrigger: number
  userRole?: string
}) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({})
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({})
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: Photo; siblings: Photo[] } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [assigningPhoto, setAssigningPhoto] = useState<Photo | null>(null)

  const loadPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getJobPhotos(jobId)
      setPhotos(data)
      const urlMap: Record<string, string> = {}
      await Promise.all(data.map(async p => {
        const url = await getPhotoUrl(p.storage_path)
        if (url) urlMap[p.id] = url
      }))
      setUrls(urlMap)
    } catch (err) {
      console.error('Failed to load photos:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { loadPhotos() }, [loadPhotos, refreshTrigger])

  async function handleDelete(photoId: string) {
    if (!confirm('Delete this photo? This action is logged.')) return
    setDeleting(photoId)
    try {
      await deleteJobPhoto(photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      if (selectedPhoto?.photo.id === photoId) setSelectedPhoto(null)
    } catch (e: any) {
      alert(e.message || 'Could not delete photo')
    } finally {
      setDeleting(null)
    }
  }

  function canModify(photo: Photo) {
    if (userRole === 'admin' || userRole === 'manager') return true
    if (!photo.edit_deadline) return false
    return new Date() < new Date(photo.edit_deadline)
  }

  function openPhoto(photo: Photo, siblings: Photo[]) {
    setSelectedPhoto({ photo, siblings })
  }

  function navigatePhoto(direction: 'prev' | 'next') {
    if (!selectedPhoto) return
    const idx = selectedPhoto.siblings.findIndex(p => p.id === selectedPhoto.photo.id)
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1
    if (nextIdx >= 0 && nextIdx < selectedPhoto.siblings.length) {
      setSelectedPhoto({ ...selectedPhoto, photo: selectedPhoto.siblings[nextIdx] })
    }
  }

  if (loading) return <div className="p-4 text-center text-sm text-slate-500">Loading photos…</div>

  if (photos.length === 0) return (
    <div className="p-6 text-center">
      <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-500">No photos yet</p>
    </div>
  )

  const { levels, unassigned } = buildGroups(photos)
  const totalCount = photos.length

  return (
    <>
      <div className="divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50">
          <p className="text-xs text-slate-500">
            {totalCount} photo{totalCount !== 1 ? 's' : ''} across {levels.length} level{levels.length !== 1 ? 's' : ''}
          </p>
        </div>

        {levels.map(({ level, spaces, total }) => (
          <div key={level}>
            <button
              onClick={() => setExpandedLevels(e => ({ ...e, [level]: !e[level] }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedLevels[level]
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="text-sm font-semibold text-slate-800">{level}</span>
              </div>
              <span className="text-xs text-slate-400">
                {total} photo{total !== 1 ? 's' : ''} · {spaces.length} space{spaces.length !== 1 ? 's' : ''}
              </span>
            </button>

            {expandedLevels[level] && spaces.map(space => {
              const spaceKey = `${level}::${space.spaceType}::${space.spaceIdentifier}`
              const isExpanded = expandedSpaces[spaceKey] !== false
              return (
                <div key={spaceKey} className="border-t border-slate-100">
                  <button
                    onClick={() => setExpandedSpaces(e => ({ ...e, [spaceKey]: !isExpanded }))}
                    className="w-full flex items-center justify-between pl-8 pr-4 py-2.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="text-sm text-slate-700">{space.displayLabel}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {space.photos.length} photo{space.photos.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pl-8 pr-4 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {space.photos.map(photo => (
                          <PhotoThumb
                            key={photo.id}
                            photo={photo}
                            url={urls[photo.id]}
                            canModify={canModify(photo)}
                            deleting={deleting === photo.id}
                            onOpen={() => openPhoto(photo, space.photos)}
                            onDelete={() => handleDelete(photo.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Unassigned · {unassigned.length}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {unassigned.map(photo => (
                <div key={photo.id} className="rounded-lg overflow-hidden border border-slate-200 relative group">
                  <div className="relative aspect-square bg-slate-100 cursor-pointer" onClick={() => openPhoto(photo, unassigned)}>
                    {urls[photo.id] ? (
                      <Image src={urls[photo.id]} alt="Job photo" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                    {photo.before_after && (
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-semibold capitalize ${
                        photo.before_after === 'before' ? 'bg-orange-500 text-white' :
                        photo.before_after === 'after' ? 'bg-green-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {photo.before_after}
                      </span>
                    )}
                    {canModify(photo) && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(photo.id) }}
                        disabled={deleting === photo.id}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                  <div className="p-2">
                    {photo.work_type && (
                      <p className="text-xs font-medium text-slate-700 truncate">{photo.work_type}</p>
                    )}
                    <button
                      onClick={() => setAssigningPhoto(photo)}
                      className="mt-1 text-xs text-blue-600 hover:underline"
                    >
                      + Assign location
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto.photo}
          url={urls[selectedPhoto.photo.id]}
          siblings={selectedPhoto.siblings}
          canModify={canModify(selectedPhoto.photo)}
          deleting={deleting === selectedPhoto.photo.id}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={navigatePhoto}
          onDelete={() => handleDelete(selectedPhoto.photo.id)}
        />
      )}

      {assigningPhoto && (
        <PhotoAssignModal
          jobId={jobId}
          photoId={assigningPhoto.id}
          currentLevel={assigningPhoto.level}
          currentSpaceType={assigningPhoto.space_type}
          currentSpaceIdentifier={assigningPhoto.space_identifier}
          currentWorkType={assigningPhoto.work_type}
          workTypes={[]}
          onSaved={loadPhotos}
          onClose={() => setAssigningPhoto(null)}
        />
      )}
    </>
  )
}

function PhotoThumb({ photo, url, canModify, deleting, onOpen, onDelete }: {
  photo: Photo
  url?: string
  canModify: boolean
  deleting: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 relative group">
      <div className="relative aspect-square bg-slate-100 cursor-pointer" onClick={onOpen}>
        {url ? (
          <Image src={url} alt={photo.caption || 'Job photo'} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-300" />
          </div>
        )}
        {photo.before_after && (
          <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-semibold capitalize ${
            photo.before_after === 'before' ? 'bg-orange-500 text-white' :
            photo.before_after === 'after' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {photo.before_after}
          </span>
        )}
        {canModify && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            disabled={deleting}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        )}
      </div>
      <div className="p-2">
        {photo.work_type && <p className="text-xs font-medium text-slate-700 truncate">{photo.work_type}</p>}
        {photo.caption && <p className="text-xs text-slate-500 truncate">{photo.caption}</p>}
      </div>
    </div>
  )
}

function PhotoModal({ photo, url, siblings, canModify, deleting, onClose, onNavigate, onDelete }: {
  photo: Photo
  url?: string
  siblings: Photo[]
  canModify: boolean
  deleting: boolean
  onClose: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onDelete: () => void
}) {
  const idx = siblings.findIndex(p => p.id === photo.id)
  const hasPrev = idx > 0
  const hasNext = idx < siblings.length - 1

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') onNavigate('prev')
      if (e.key === 'ArrowRight') onNavigate('next')
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNavigate, onClose])

  const location = [photo.level, photo.space_type, photo.space_identifier].filter(Boolean).join(' · ')
  const uploadedAt = new Date(photo.uploaded_at).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">{location || 'Photo Detail'}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="relative aspect-video bg-slate-100">
          {url ? (
            <Image src={url} alt={photo.caption || 'Photo'} fill className="object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-300" />
            </div>
          )}
          {hasPrev && (
            <button onClick={() => onNavigate('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
          )}
          {hasNext && (
            <button onClick={() => onNavigate('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70">
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {photo.before_after && <MetaRow label="Stage" value={photo.before_after} />}
            {photo.work_type && <MetaRow label="Work Type" value={photo.work_type} />}
            {photo.level && <MetaRow label="Level" value={photo.level} />}
            {photo.space_type && photo.space_identifier && (
              <MetaRow label="Space" value={`${photo.space_type} ${photo.space_identifier}`} />
            )}
          </div>

          {photo.caption && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700">{photo.caption}</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Uploaded by</p>
              <p className="text-sm text-slate-700">
                {(photo.uploader as any)?.full_name || 'Unknown'}
              </p>
              <p className="text-xs text-slate-400">{uploadedAt}</p>
            </div>
            <p className="text-xs text-slate-500">{idx + 1} of {siblings.length}</p>
          </div>

          {canModify && (
            <button onClick={onDelete} disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete Photo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 capitalize">{label}</p>
      <p className="text-sm font-medium text-slate-800 capitalize">{value}</p>
    </div>
  )
}
