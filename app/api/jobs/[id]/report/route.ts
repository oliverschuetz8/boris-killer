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
      company:companies(name)
    `)
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

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

  // Fetch penetrations with photos
  const { data: penetrations } = await supabase
    .from('penetrations')
    .select(`
      *,
      penetration_photos(id, url, caption)
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

  // Render PDF to buffer
  const element = React.createElement(JobReportDocument, {
    job,
    buildings: buildings || [],
    penetrations: penetrations || [],
    roomMaterials: roomMaterials || [],
    evidenceFields: evidenceFields || [],
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
