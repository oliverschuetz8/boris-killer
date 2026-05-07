import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateDrawingsHtml,
  type DrawingsExportData,
  type DrawingsExportPenetration,
} from '@/lib/html/drawings-export'

async function fetchAsDataUri(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): Promise<string | null> {
  const { data: signed } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 300)
  if (!signed?.signedUrl) return null
  try {
    const res = await fetch(signed.signedUrl)
    if (!res.ok) return null
    const mime = res.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Job + company + customer
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

  // Buildings → levels → rooms
  const { data: buildings } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels:levels(
        id, name, order_index,
        rooms:rooms(id, name)
      )
    `)
    .eq('site_id', id)
    .order('created_at')

  // Lookup maps
  const roomNameMap: Record<string, string> = {}
  const levelInfoMap: Record<string, { levelName: string; buildingName: string }> = {}
  for (const b of (buildings || []) as any[]) {
    for (const l of b.levels || []) {
      levelInfoMap[l.id] = { levelName: l.name, buildingName: b.name }
      for (const r of l.rooms || []) {
        roomNameMap[r.id] = r.name
      }
    }
  }

  // Penetrations with photos — only those pinned on a drawing
  const { data: penetrations } = await supabase
    .from('penetrations')
    .select(`
      id, level_id, room_id, floorplan_x, floorplan_y, floorplan_label,
      field_values, evidence_subcategory_id, created_at,
      penetration_photos(id, storage_path, caption)
    `)
    .eq('job_id', id)
    .not('floorplan_x', 'is', null)
    .not('floorplan_y', 'is', null)
    .order('created_at')

  // Field label resolution — job_evidence_fields + evidence_template_fields
  const { data: jobFields } = await supabase
    .from('job_evidence_fields')
    .select('id, label')
    .eq('job_id', id)

  const fieldLabelMap: Record<string, string> = {}
  for (const f of jobFields || []) fieldLabelMap[f.id] = f.label

  const subcategoryIds = [
    ...new Set(
      ((penetrations || []) as any[])
        .map(p => p.evidence_subcategory_id)
        .filter(Boolean) as string[],
    ),
  ]

  const subcategoryNameMap: Record<string, string> = {}
  if (subcategoryIds.length > 0) {
    const { data: subcats } = await supabase
      .from('evidence_subcategories')
      .select('id, name')
      .in('id', subcategoryIds)
    for (const s of subcats || []) subcategoryNameMap[s.id] = s.name

    const { data: templateFields } = await supabase
      .from('evidence_template_fields')
      .select('id, label')
      .in('subcategory_id', subcategoryIds)
    for (const t of templateFields || []) fieldLabelMap[t.id] = t.label
  }

  // Level drawings — keep one drawing per level (most recent)
  const allLevelIds = Object.keys(levelInfoMap)
  const drawingByLevel: Record<string, { storage_path: string }> = {}
  if (allLevelIds.length > 0) {
    const { data: drawings } = await supabase
      .from('level_drawings')
      .select('level_id, file_url, created_at')
      .in('level_id', allLevelIds)
      .order('created_at', { ascending: false })
    for (const d of drawings || []) {
      if (!drawingByLevel[d.level_id]) {
        drawingByLevel[d.level_id] = { storage_path: d.file_url }
      }
    }
  }

  // Company credentials
  const { data: credentials } = await supabase
    .from('company_credentials')
    .select('label, value')
    .eq('company_id', profile.company_id)
    .order('display_order')

  // ─── Convert binary assets to data URIs ───

  let companyLogoDataUri: string | null = null
  if (job.company?.logo_url) {
    companyLogoDataUri = await fetchAsDataUri(supabase, job.company.logo_url)
  }

  const drawingDataUriMap: Record<string, string> = {}
  await Promise.all(
    Object.entries(drawingByLevel).map(async ([levelId, d]) => {
      const uri = await fetchAsDataUri(supabase, d.storage_path)
      if (uri) drawingDataUriMap[levelId] = uri
    }),
  )

  // Photos — only fetch for penetrations that will appear (have x/y)
  const photoDataUriByPen: Record<string, string[]> = {}
  await Promise.all(
    ((penetrations || []) as any[]).map(async pen => {
      const photos = (pen.penetration_photos || []) as { storage_path: string }[]
      const uris = await Promise.all(
        photos.map(p => fetchAsDataUri(supabase, p.storage_path)),
      )
      photoDataUriByPen[pen.id] = uris.filter((u): u is string => !!u)
    }),
  )

  // ─── Shape the export data ───

  const exportPenetrations: DrawingsExportPenetration[] = ((penetrations || []) as any[]).map(p => {
    const fields: { label: string; value: string }[] = []
    const fv = (p.field_values || {}) as Record<string, unknown>
    for (const [fieldId, value] of Object.entries(fv)) {
      if (value == null || String(value).trim() === '') continue
      fields.push({
        label: fieldLabelMap[fieldId] || 'Field',
        value: String(value),
      })
    }

    const levelInfo = p.level_id ? levelInfoMap[p.level_id] : null
    const createdAt = new Date(p.created_at).toLocaleString('en-AU', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Australia/Sydney',
    })

    return {
      id: p.id,
      floorplan_label: p.floorplan_label,
      subcategory_name: p.evidence_subcategory_id
        ? subcategoryNameMap[p.evidence_subcategory_id] || null
        : null,
      room_name: p.room_id ? roomNameMap[p.room_id] || null : null,
      building_name: levelInfo?.buildingName || null,
      level_name: levelInfo?.levelName || null,
      created_at: createdAt,
      fields,
      photo_data_uris: photoDataUriByPen[p.id] || [],
    }
  })

  const pinsByLevel: Record<string, { id: string; x: number; y: number; label: string }[]> = {}
  for (const p of (penetrations || []) as any[]) {
    if (!p.level_id || p.floorplan_x == null || p.floorplan_y == null) continue
    if (!pinsByLevel[p.level_id]) pinsByLevel[p.level_id] = []
    pinsByLevel[p.level_id].push({
      id: p.id,
      x: p.floorplan_x,
      y: p.floorplan_y,
      label: p.floorplan_label || '',
    })
  }

  const exportBuildings = ((buildings || []) as any[]).map(b => ({
    id: b.id,
    name: b.name,
    levels: ((b.levels || []) as any[])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(l => ({
        id: l.id,
        name: l.name,
        drawing_data_uri: drawingDataUriMap[l.id] || null,
        pins: pinsByLevel[l.id] || [],
      })),
  }))

  const generatedAt = new Date().toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })

  const siteAddress = [
    job.site_address_line1,
    job.site_city,
    job.site_state,
    job.site_postcode,
  ].filter(Boolean).join(', ') || null

  const data: DrawingsExportData = {
    job: {
      job_number: job.job_number,
      title: job.title,
      site_name: job.site_name,
      site_address: siteAddress,
    },
    customer: job.customer ? { name: job.customer.name } : null,
    company: {
      name: job.company?.name || 'Company',
      abn: job.company?.abn || null,
      email: job.company?.email || null,
      phone: job.company?.phone || null,
      website: job.company?.website || null,
      primary_color: job.company?.primary_color || null,
      logo_data_uri: companyLogoDataUri,
    },
    buildings: exportBuildings,
    penetrations: exportPenetrations,
    credentials: credentials || [],
    generated_at: generatedAt,
  }

  const html = generateDrawingsHtml(data)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${job.job_number}-drawings.html"`,
      'Cache-Control': 'no-store',
    },
  })
}
