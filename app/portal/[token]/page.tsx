import { getPortalJobData, getPortalPhotoUrl, getPortalDrawingUrl } from '@/lib/services/portal'
import PortalView from './portal-view'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch all portal data via the SECURITY DEFINER function
  const data = await getPortalJobData(token)

  if (!data || !data.job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link Invalid or Expired</h1>
          <p className="text-sm text-slate-500">
            This portal link is no longer valid. It may have expired or been revoked.
            Please contact the company that sent you this link to request a new one.
          </p>
        </div>
      </div>
    )
  }

  // Generate signed URL for company logo
  let companyLogoUrl: string | null = null
  if (data.company.logo_url) {
    companyLogoUrl = await getPortalPhotoUrl(data.company.logo_url)
  }

  // Generate signed URLs for all photos and drawings server-side
  const allPhotos = data.penetrations.flatMap(p => p.photos)
  const photoUrlEntries = await Promise.all(
    allPhotos.map(async (photo) => {
      const url = await getPortalPhotoUrl(photo.storage_path)
      return [photo.id, url || ''] as const
    })
  )
  const photoUrls: Record<string, string> = Object.fromEntries(
    photoUrlEntries.filter(([, url]) => url !== '')
  )

  // Generate signed URLs for level drawings
  const drawingUrlEntries = await Promise.all(
    data.level_drawings.map(async (drawing) => {
      const url = await getPortalDrawingUrl(drawing.file_url)
      return [drawing.level_id, url || ''] as const
    })
  )
  const drawingUrls: Record<string, string> = Object.fromEntries(
    drawingUrlEntries.filter(([, url]) => url !== '')
  )

  return (
    <PortalView
      data={data}
      photoUrls={photoUrls}
      drawingUrls={drawingUrls}
      companyLogoUrl={companyLogoUrl}
    />
  )
}
