import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

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

  // Fetch job
  const { data: job } = await supabase
    .from('jobs')
    .select('id, job_number, title, company_id')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Fetch buildings → levels → rooms for name lookups
  const { data: buildings } = await supabase
    .from('buildings')
    .select(`
      id, name,
      levels:levels(
        id, name,
        rooms:rooms(id, name)
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

  // Fetch evidence field definitions
  const { data: evidenceFields } = await supabase
    .from('job_evidence_fields')
    .select('id, label')
    .eq('job_id', id)
    .order('sort_order')

  const fieldLabels: Record<string, string> = {}
  const fieldIds: string[] = []
  for (const f of evidenceFields || []) {
    fieldLabels[f.id] = f.label
    fieldIds.push(f.id)
  }

  // Fetch penetrations with photo count
  const { data: penetrations } = await supabase
    .from('penetrations')
    .select(`
      *,
      penetration_photos(id)
    `)
    .eq('job_id', id)
    .order('created_at')

  // Build workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = job.job_number
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Penetrations')

  // Columns: Pin Label, Building, Level, Room, [each evidence field], Photo Count, Created
  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Pin Label', key: 'pin_label', width: 12 },
    { header: 'Building', key: 'building', width: 18 },
    { header: 'Level', key: 'level', width: 18 },
    { header: 'Room', key: 'room', width: 18 },
  ]

  for (const fId of fieldIds) {
    columns.push({
      header: fieldLabels[fId],
      key: `field_${fId}`,
      width: 20,
    })
  }

  columns.push(
    { header: 'Photo Count', key: 'photo_count', width: 12 },
    { header: 'Created', key: 'created_at', width: 18 },
  )

  sheet.columns = columns

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, size: 10 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 24

  // Add rows
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

    const fieldValues = pen.field_values || {}
    const rowData: Record<string, any> = {
      pin_label: pen.floorplan_label || '',
      building: buildingName,
      level: levelName,
      room: roomName,
      photo_count: (pen.penetration_photos || []).length,
      created_at: new Date(pen.created_at).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
        timeZone: 'Australia/Sydney',
      }),
    }

    for (const fId of fieldIds) {
      rowData[`field_${fId}`] = fieldValues[fId] || ''
    }

    sheet.addRow(rowData)
  }

  // Auto-filter
  if ((penetrations || []).length > 0) {
    sheet.autoFilter = {
      from: 'A1',
      to: { row: 1, column: columns.length },
    }
  }

  // Alternate row colours
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      }
    }
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${job.job_number}-report.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
