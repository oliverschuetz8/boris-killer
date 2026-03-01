'use client'

import { useEffect, useState } from 'react'
import { getJobPhotos, getPhotoUrl } from '@/lib/services/photos'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface Photo {
  id: string
  storage_path: string
  area_location: string | null
  work_type: string | null
  before_after: string | null
  caption: string | null
  created_at: string
}

export default function PhotoGallery({ jobId, refreshTrigger }: { jobId: string, refreshTrigger: number }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getJobPhotos(jobId)
        setPhotos(data)

        // Get signed URLs for all photos
        const urlMap: Record<string, string> = {}
        await Promise.all(
          data.map(async (photo) => {
            const url = await getPhotoUrl(photo.storage_path)
            if (url) urlMap[photo.id] = url
          })
        )
        setUrls(urlMap)
      } catch (err) {
        console.error('Failed to load photos:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [jobId, refreshTrigger])

  if (loading) return (
    <div className="p-4 text-center text-sm text-slate-500">Loading photos…</div>
  )

  if (photos.length === 0) return (
    <div className="p-6 text-center">
      <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-500">No photos yet</p>
    </div>
  )

  return (
    <div className="p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {photos.length} photo{photos.length !== 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="rounded-lg overflow-hidden border border-slate-200">
            <div className="relative aspect-square bg-slate-100">
              {urls[photo.id] ? (
                <Image
                  src={urls[photo.id]}
                  alt={photo.caption || 'Job photo'}
                  fill
                  className="object-cover"
                />
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
            </div>
            <div className="p-2">
              {photo.area_location && (
                <p className="text-xs font-medium text-slate-700 truncate">{photo.area_location}</p>
              )}
              {photo.work_type && (
                <p className="text-xs text-slate-500 truncate">{photo.work_type}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}