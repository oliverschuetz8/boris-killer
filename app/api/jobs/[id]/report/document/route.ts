import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
  ShadingType,
} from 'docx'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  // Build lookup maps
  const roomLookup: Record<string, { roomName: string; levelName: string; buildingName: string }> = {}
  const levelLookup: Record<string, { levelName: string; buildingName: string }> = {}

  for (const b of buildings || []) {
    for (const l of (b as any).levels || []) {
      levelLookup[l.id] = { levelName: l.name, buildingName: b.name }
      for (const r of (l as any).rooms || []) {
        roomLookup[r.id] = { roomName: r.name, levelName: l.name, buildingName: b.name }
      }
    }
  }

  // Fetch penetrations with photos
  const { data: penetrations } = await supabase
    .from('penetrations')
    .select(`
      *,
      penetration_photos(id, storage_path, caption)
    `)
    .eq('job_id', id)
    .order('created_at')

  // Fetch evidence field definitions
  const { data: evidenceFields } = await supabase
    .from('job_evidence_fields')
    .select('id, label')
    .eq('job_id', id)

  const fieldLabels: Record<string, string> = {}
  for (const f of evidenceFields || []) {
    fieldLabels[f.id] = f.label
  }

  // Fetch room materials
  const { data: roomMaterials } = await supabase
    .from('room_materials')
    .select(`
      *,
      material:materials(name, unit)
    `)
    .eq('job_id', id)
    .order('created_at')

  // Fetch company credentials
  const { data: companyCredentials } = await supabase
    .from('company_credentials')
    .select('label, value')
    .eq('company_id', profile.company_id)
    .order('display_order')

  // Generate signed URLs for penetration photos and fetch image buffers
  const photoBuffers: Map<string, { buffer: Buffer; width: number; height: number }> = new Map()

  for (const pen of penetrations || []) {
    const photos = pen.penetration_photos || []
    if (photos.length > 0) {
      const firstPhoto = photos[0]
      try {
        const { data: signedData } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(firstPhoto.storage_path, 300)
        if (signedData?.signedUrl) {
          const response = await fetch(signedData.signedUrl)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            photoBuffers.set(pen.id, {
              buffer: Buffer.from(arrayBuffer),
              width: 300,
              height: 225,
            })
          }
        }
      } catch {
        // Skip photos that fail to load
      }
    }
  }

  // Fetch and buffer company logo
  let logoBuffer: Buffer | null = null
  if (job.company?.logo_url) {
    try {
      const { data: logoData } = await supabase.storage
        .from('job-photos')
        .createSignedUrl(job.company.logo_url, 300)
      if (logoData?.signedUrl) {
        const response = await fetch(logoData.signedUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          logoBuffer = Buffer.from(arrayBuffer)
        }
      }
    } catch {
      // Skip logo if it fails
    }
  }

  const generatedAt = new Date().toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })

  // ── Build document sections ──
  const sections: Paragraph[] = []

  // Header with company logo
  const headerChildren: TextRun[] = []
  if (logoBuffer) {
    sections.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 80, height: 80 },
            type: 'png',
          }),
        ],
      })
    )
  }

  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: job.company?.name || 'AUTONYX', bold: true, size: 32, font: 'Helvetica' }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Job Completion Report', size: 20, color: '64748b' }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${job.job_number}`, bold: true, size: 24, color: '2563eb' }),
        new TextRun({ text: `  •  Generated ${generatedAt}`, size: 16, color: '94a3b8' }),
      ],
      spacing: { after: 300 },
    }),
  )

  // Job details
  sections.push(
    new Paragraph({ text: 'Job Details', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
  )

  const detailRows = [
    ['Job Title', job.title],
    ['Status', job.status.replace('_', ' ')],
    ['Customer', job.customer?.name || '—'],
    ['Customer Email', job.customer?.email || '—'],
    ['Customer Phone', job.customer?.phone || '—'],
    ['Site', job.site_name || '—'],
    ['Site Address', [job.site_address_line1, job.site_city, job.site_state, job.site_postcode].filter(Boolean).join(', ') || '—'],
  ]

  if (job.scheduled_start) {
    detailRows.push(['Scheduled Start', new Date(job.scheduled_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })])
  }
  if (job.completed_at) {
    detailRows.push(['Completed', new Date(job.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })])
  }

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  } as const

  const detailTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: detailRows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(label), bold: true, size: 18, color: '64748b' })] })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorder,
            shading: { type: ShadingType.SOLID, color: 'F8FAFC', fill: 'F8FAFC' },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(value), size: 18 })] })],
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: noBorder,
          }),
        ],
      })
    ),
  })

  sections.push(new Paragraph({ children: [] })) // spacer
  // We'll add the table separately

  // Penetrations
  sections.push(
    new Paragraph({
      text: `Penetrations (${(penetrations || []).length} logged)`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
  )

  let lastGroupKey = ''
  for (const pen of penetrations || []) {
    let buildingName = ''
    let levelName = ''
    let roomName = ''

    if (pen.room_id && roomLookup[pen.room_id]) {
      const info = roomLookup[pen.room_id]
      buildingName = info.buildingName
      levelName = info.levelName
      roomName = info.roomName
    } else if (pen.level_id && levelLookup[pen.level_id]) {
      const info = levelLookup[pen.level_id]
      buildingName = info.buildingName
      levelName = info.levelName
      roomName = pen.location_room || ''
    } else {
      levelName = pen.location_level || ''
      roomName = pen.location_room || ''
    }

    const groupKey = `${buildingName}|${levelName}|${roomName}`
    if (groupKey !== lastGroupKey) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [buildingName, levelName, roomName].filter(Boolean).join(' › ') || 'Unassigned',
              bold: true,
              size: 20,
              color: '475569',
            }),
          ],
          spacing: { before: 200, after: 100 },
          shading: { type: ShadingType.SOLID, color: 'F1F5F9', fill: 'F1F5F9' },
        }),
      )
      lastGroupKey = groupKey
    }

    // Pin label
    if (pen.floorplan_label) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: pen.floorplan_label, bold: true, size: 20 })],
          spacing: { before: 100, after: 50 },
        }),
      )
    }

    // Photo
    const photoData = photoBuffers.get(pen.id)
    if (photoData) {
      sections.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: photoData.buffer,
              transformation: { width: photoData.width, height: photoData.height },
              type: 'jpg',
            }),
          ],
          spacing: { after: 100 },
        }),
      )
    }

    // Evidence fields
    const fieldValues = pen.field_values || {}
    for (const [key, val] of Object.entries(fieldValues)) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${fieldLabels[key] || key}: `, bold: true, size: 16, color: '64748b' }),
            new TextRun({ text: String(val) || '—', size: 16 }),
          ],
          spacing: { after: 30 },
        }),
      )
    }

    // Separator
    sections.push(new Paragraph({ children: [], spacing: { after: 100 } }))
  }

  // Materials table
  if ((roomMaterials || []).length > 0) {
    sections.push(
      new Paragraph({
        text: `Materials Used (${roomMaterials!.length} items)`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
    )

    const matHeaderRow = new TableRow({
      children: ['Material', 'Location', 'Qty'].map(text =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })] })],
          shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
        })
      ),
    })

    const matDataRows = (roomMaterials || []).map((m: any) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: m.material?.name || m.material_name_override || '—', size: 16 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: m.room_name || '—', size: 16 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${m.quantity} ${m.material?.unit || ''}`, size: 16 })] })],
          }),
        ],
      })
    )

    const matTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [matHeaderRow, ...matDataRows],
    })

    // The table will be added as part of the section children
    sections.push(new Paragraph({ children: [] }))
  }

  // Footer: credentials
  if ((companyCredentials || []).length > 0) {
    sections.push(
      new Paragraph({ children: [], spacing: { before: 400 } }),
    )
    for (const cred of companyCredentials || []) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cred.label}: `, bold: true, size: 14, color: '64748b' }),
            new TextRun({ text: cred.value, size: 14, color: '64748b' }),
          ],
        }),
      )
    }
  }

  // Build the document — sections array contains Paragraphs; we need to also insert Tables
  // Rebuild children array including tables
  const docChildren: (Paragraph | Table)[] = []

  // Add header paragraphs
  for (const s of sections.slice(0, sections.indexOf(sections.find(s => s instanceof Paragraph && (s as any).root?.[0]?.text === '') || sections[0]))) {
    docChildren.push(s)
  }

  // Simpler approach: put everything in order
  const allChildren: (Paragraph | Table)[] = []

  // Header section
  if (logoBuffer) {
    allChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 80, height: 80 },
            type: 'png',
          }),
        ],
      })
    )
  }

  allChildren.push(
    new Paragraph({
      children: [new TextRun({ text: job.company?.name || 'AUTONYX', bold: true, size: 32 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Job Completion Report', size: 20, color: '64748b' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: job.job_number, bold: true, size: 24, color: '2563eb' }),
        new TextRun({ text: `  •  Generated ${generatedAt}`, size: 16, color: '94a3b8' }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({ text: 'Job Details', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
    detailTable,
  )

  // Penetrations heading
  allChildren.push(
    new Paragraph({
      text: `Penetrations (${(penetrations || []).length} logged)`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    }),
  )

  // Penetrations content
  let lastGroup = ''
  for (const pen of penetrations || []) {
    let buildingName = ''
    let levelName = ''
    let roomName = ''

    if (pen.room_id && roomLookup[pen.room_id]) {
      const info = roomLookup[pen.room_id]
      buildingName = info.buildingName
      levelName = info.levelName
      roomName = info.roomName
    } else if (pen.level_id && levelLookup[pen.level_id]) {
      const info = levelLookup[pen.level_id]
      buildingName = info.buildingName
      levelName = info.levelName
      roomName = pen.location_room || ''
    } else {
      levelName = pen.location_level || ''
      roomName = pen.location_room || ''
    }

    const gk = `${buildingName}|${levelName}|${roomName}`
    if (gk !== lastGroup) {
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [buildingName, levelName, roomName].filter(Boolean).join(' › ') || 'Unassigned',
              bold: true,
              size: 20,
              color: '475569',
            }),
          ],
          spacing: { before: 200, after: 100 },
          shading: { type: ShadingType.SOLID, color: 'F1F5F9', fill: 'F1F5F9' },
        }),
      )
      lastGroup = gk
    }

    if (pen.floorplan_label) {
      allChildren.push(
        new Paragraph({
          children: [new TextRun({ text: pen.floorplan_label, bold: true, size: 20 })],
          spacing: { before: 100, after: 50 },
        }),
      )
    }

    const photoData = photoBuffers.get(pen.id)
    if (photoData) {
      allChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: photoData.buffer,
              transformation: { width: photoData.width, height: photoData.height },
              type: 'jpg',
            }),
          ],
          spacing: { after: 100 },
        }),
      )
    }

    const fieldValues = pen.field_values || {}
    for (const [key, val] of Object.entries(fieldValues)) {
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${fieldLabels[key] || key}: `, bold: true, size: 16, color: '64748b' }),
            new TextRun({ text: String(val) || '—', size: 16 }),
          ],
          spacing: { after: 30 },
        }),
      )
    }

    allChildren.push(new Paragraph({ children: [], spacing: { after: 100 } }))
  }

  // Materials
  if ((roomMaterials || []).length > 0) {
    allChildren.push(
      new Paragraph({
        text: `Materials Used (${roomMaterials!.length} items)`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
    )

    const matHeaderRow = new TableRow({
      children: ['Material', 'Location', 'Qty'].map(text =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })] })],
          shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
        })
      ),
    })

    const matDataRows = (roomMaterials || []).map((m: any) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: m.material?.name || m.material_name_override || '—', size: 16 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: m.room_name || '—', size: 16 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${m.quantity} ${m.material?.unit || ''}`, size: 16 })] })],
          }),
        ],
      })
    )

    allChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [matHeaderRow, ...matDataRows],
      })
    )
  }

  // Footer credentials
  if ((companyCredentials || []).length > 0) {
    allChildren.push(new Paragraph({ children: [], spacing: { before: 400 } }))
    for (const cred of companyCredentials || []) {
      allChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cred.label}: `, bold: true, size: 14, color: '64748b' }),
            new TextRun({ text: cred.value, size: 14, color: '64748b' }),
          ],
        }),
      )
    }
  }

  // ABN footer
  if (job.company?.abn) {
    allChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `ABN: ${job.company.abn}`, size: 14, color: '94a3b8' })],
        spacing: { before: 100 },
      }),
    )
  }

  const doc = new Document({
    sections: [{
      children: allChildren,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${job.job_number}-report.docx"`,
      'Cache-Control': 'no-store',
    },
  })
}
