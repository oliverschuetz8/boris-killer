import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { JobReportDocument } from '@/lib/pdf/job-report'
import React from 'react'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins/managers can download reports
  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch job with customer + company
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(name, email, phone),
      company:companies(name, logo_url, primary_color, abn, email, phone, website)
    `)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Generate signed URL for company logo if it exists
  let companyLogoSignedUrl: string | null = null
  if (job.company?.logo_url) {
    const { data: logoData } = await supabase.storage
      .from('job-photos')
      .createSignedUrl(job.company.logo_url, 300)
    companyLogoSignedUrl = logoData?.signedUrl ?? null
  }

  // Fetch buildings → levels → rooms
  const { data: buildings } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels:levels(
        id, name,
        rooms:rooms(id, name, is_done)
      )
    `)
    .eq('site_id', id)
    .order('created_at')

  // Fetch penetrations with photos (storage_path, not url)
  const { data: penetrations } = await supabase
    .from('penetrations')
    .select(`
      *,
      penetration_photos(id, storage_path, caption)
    `)
    .eq('job_id', id)
    .order('created_at')

  // Fetch room materials with material info
  const { data: roomMaterials } = await supabase
    .from('room_materials')
    .select(`
      *,
      material:materials(name, unit)
    `)
    .eq('job_id', id)
    .order('created_at')

  // Fetch evidence field definitions for this job
  const { data: evidenceFields } = await supabase
    .from('job_evidence_fields')
    .select('id, label')
    .eq('job_id', id)

  // Fetch company credentials/licences
  const { data: companyCredentials } = await supabase
    .from('company_credentials')
    .select('label, value')
    .eq('company_id', profile.company_id)
    .order('display_order')

  // Fetch level drawings for all levels in this job
  const allLevelIds: string[] = []
  for (const b of buildings || []) {
    for (const l of (b as any).levels || []) {
      allLevelIds.push(l.id)
    }
  }

  let levelDrawingsMap: Record<string, string> = {}
  if (allLevelIds.length > 0) {
    const { data: drawings } = await supabase
      .from('level_drawings')
      .select('level_id, file_url')
      .in('level_id', allLevelIds)

    // Generate signed URLs for all drawings
    if (drawings && drawings.length > 0) {
      const drawingSignPromises = drawings.map(async (d) => {
        const { data: signedData } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(d.file_url, 300)
        return { levelId: d.level_id, url: signedData?.signedUrl ?? null }
      })
      const drawingResults = await Promise.all(drawingSignPromises)
      for (const r of drawingResults) {
        if (r.url) levelDrawingsMap[r.levelId] = r.url
      }
    }
  }

  // Generate signed URLs for all penetration photos
  const pensWithSignedPhotos = await Promise.all(
    (penetrations || []).map(async (pen) => {
      const photos = pen.penetration_photos || []
      const signedPhotos = await Promise.all(
        photos.map(async (photo: any) => {
          const { data: signedData } = await supabase.storage
            .from('job-photos')
            .createSignedUrl(photo.storage_path, 300)
          return {
            id: photo.id,
            url: signedData?.signedUrl ?? null,
            caption: photo.caption,
          }
        })
      )
      return {
        ...pen,
        penetration_photos: signedPhotos.filter((p: any) => p.url),
      }
    })
  )

  // Render PDF to buffer
  const element = React.createElement(JobReportDocument, {
    job,
    buildings: buildings || [],
    penetrations: pensWithSignedPhotos,
    roomMaterials: roomMaterials || [],
    evidenceFields: evidenceFields || [],
    companyLogoUrl: companyLogoSignedUrl,
    companyCredentials: companyCredentials || [],
    levelDrawingsMap,
  })

  const nodeBuffer = await renderToBuffer(element as any)
  const arrayBuffer = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  ) as ArrayBuffer

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${job.job_number}-report.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
