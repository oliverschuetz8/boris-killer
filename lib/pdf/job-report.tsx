import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 75,
    paddingHorizontal: 40,
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  reportLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  jobNumber: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },
  generatedAt: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 3,
  },

  // ── Job Details ─────────────────────────────────────────────────
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailCardTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  detailSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },

  // ── Status Badge ────────────────────────────────────────────────
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'capitalize',
  },

  // ── Section headers ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  sectionCount: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 6,
    marginTop: 1,
  },

  // ── Building / Level / Room ──────────────────────────────────────
  buildingBlock: {
    marginBottom: 14,
  },
  buildingHeader: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  buildingName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  levelBlock: {
    marginLeft: 10,
    marginBottom: 8,
  },
  levelHeader: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 5,
  },
  levelName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomName: {
    flex: 1,
    fontSize: 9,
    color: '#334155',
  },
  doneBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },

  // ── Penetration Grid (2×2) ──────────────────────────────────────
  groupHeader: {
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  groupHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  penCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  penCardEmpty: {
    flex: 1,
  },
  penPhoto: {
    width: '100%',
    height: 110,
    objectFit: 'cover',
  },
  penNoPhoto: {
    width: '100%',
    height: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  penNoPhotoText: {
    fontSize: 7,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  penBody: {
    padding: 6,
  },
  penLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  penFieldRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  penFieldLabel: {
    fontSize: 6.5,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    width: 65,
  },
  penFieldValue: {
    fontSize: 7.5,
    color: '#1e293b',
    flex: 1,
  },
  // Floor plan crop container
  drawingCropContainer: {
    width: '100%',
    height: 70,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  drawingImage: {
    position: 'absolute',
  },
  pinDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // ── Materials ───────────────────────────────────────────────────
  materialsSection: {
    marginTop: 18,
  },
  materialsTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  col1: { flex: 3 },
  col2: { flex: 2 },
  col3: { flex: 1, textAlign: 'right' },

  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerCompanyName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  footerDetails: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
  },
  footerCredentials: {
    alignItems: 'flex-end',
  },
  footerCredential: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'right' as const,
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
})

function statusColors(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    completed: { bg: '#dcfce7', text: '#166534' },
    in_progress: { bg: '#fef9c3', text: '#854d0e' },
    scheduled: { bg: '#dbeafe', text: '#1e40af' },
    on_hold: { bg: '#ffedd5', text: '#9a3412' },
    cancelled: { bg: '#f1f5f9', text: '#475569' },
  }
  return map[status] || { bg: '#f1f5f9', text: '#475569' }
}

interface CompanyCredentialPdf {
  label: string
  value: string
}

interface Props {
  job: any
  buildings: any[]
  penetrations: any[]
  roomMaterials: any[]
  evidenceFields: any[]
  companyLogoUrl?: string | null
  companyCredentials?: CompanyCredentialPdf[]
  levelDrawingsMap?: Record<string, string>
}

// ── Helper: group penetrations by building → level → room ────────
interface GroupedPenetration {
  buildingName: string
  levelName: string
  levelId: string | null
  roomName: string
  penetration: any
}

function groupPenetrations(penetrations: any[], buildings: any[]): GroupedPenetration[] {
  // Build lookup maps from building structure
  const roomLookup: Record<string, { roomName: string; levelId: string; levelName: string; buildingName: string }> = {}
  const levelLookup: Record<string, { levelName: string; buildingName: string }> = {}

  for (const b of buildings) {
    for (const l of (b.levels || [])) {
      levelLookup[l.id] = { levelName: l.name, buildingName: b.name }
      for (const r of (l.rooms || [])) {
        roomLookup[r.id] = { roomName: r.name, levelId: l.id, levelName: l.name, buildingName: b.name }
      }
    }
  }

  const grouped: GroupedPenetration[] = penetrations.map(pen => {
    if (pen.room_id && roomLookup[pen.room_id]) {
      const info = roomLookup[pen.room_id]
      return {
        buildingName: info.buildingName,
        levelName: info.levelName,
        levelId: info.levelId,
        roomName: info.roomName,
        penetration: pen,
      }
    }
    if (pen.level_id && levelLookup[pen.level_id]) {
      const info = levelLookup[pen.level_id]
      return {
        buildingName: info.buildingName,
        levelName: info.levelName,
        levelId: pen.level_id,
        roomName: pen.location_room || 'Unknown Room',
        penetration: pen,
      }
    }
    return {
      buildingName: 'Unassigned',
      levelName: pen.location_level || 'Unknown Level',
      levelId: pen.level_id,
      roomName: pen.location_room || 'Unknown Room',
      penetration: pen,
    }
  })

  // Sort by building → level → room for consistent grouping
  grouped.sort((a, b) => {
    if (a.buildingName !== b.buildingName) return a.buildingName.localeCompare(b.buildingName)
    if (a.levelName !== b.levelName) return a.levelName.localeCompare(b.levelName)
    return a.roomName.localeCompare(b.roomName)
  })

  return grouped
}

// ── Helper: chunk array into groups of N ─────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

// ── Penetration Card Component ───────────────────────────────────
function PenCard({
  pen,
  fieldLabels,
  drawingUrl,
}: {
  pen: any
  fieldLabels: Record<string, string>
  drawingUrl?: string | null
}) {
  const photos = pen.penetration_photos || []
  const fieldValues = pen.field_values || {}
  const primaryPhoto = photos[0]

  // Drawing crop calculations
  const CROP_W = 242 // half of usable page width minus gaps (~515/2 - 10 gap/2)
  const CROP_H = 70
  const DRAW_SCALE_W = 600 // render drawing at this width for crop
  const DRAW_SCALE_H = 450 // approximate aspect ratio

  const pinX = pen.floorplan_x ?? 50
  const pinY = pen.floorplan_y ?? 50

  // Calculate offsets to center the pin in the crop container
  const offsetX = Math.max(0, (pinX / 100) * DRAW_SCALE_W - CROP_W / 2)
  const offsetY = Math.max(0, (pinY / 100) * DRAW_SCALE_H - CROP_H / 2)

  return (
    <View style={styles.penCard}>
      {/* Photo */}
      {primaryPhoto?.url ? (
        <Image src={primaryPhoto.url} style={styles.penPhoto} />
      ) : (
        <View style={styles.penNoPhoto}>
          <Text style={styles.penNoPhotoText}>No photo</Text>
        </View>
      )}

      {/* Evidence fields */}
      <View style={styles.penBody}>
        {pen.floorplan_label && (
          <Text style={styles.penLabel}>{pen.floorplan_label}</Text>
        )}

        {Object.entries(fieldValues).map(([key, val]) => (
          <View key={key} style={styles.penFieldRow}>
            <Text style={styles.penFieldLabel}>{fieldLabels[key] || key}</Text>
            <Text style={styles.penFieldValue}>{String(val) || '—'}</Text>
          </View>
        ))}

        {Object.keys(fieldValues).length === 0 && !pen.floorplan_label && (
          <Text style={{ fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }}>No data recorded</Text>
        )}
      </View>

      {/* Floor plan crop */}
      {drawingUrl && pen.floorplan_x != null && pen.floorplan_y != null && (
        <View style={styles.drawingCropContainer}>
          <Image
            src={drawingUrl}
            style={[
              styles.drawingImage,
              {
                width: DRAW_SCALE_W,
                height: DRAW_SCALE_H,
                left: -offsetX,
                top: -offsetY,
              },
            ]}
          />
          {/* Red pin dot at center of container */}
          <View
            style={[
              styles.pinDot,
              {
                left: Math.min((pinX / 100) * DRAW_SCALE_W - offsetX - 4, CROP_W - 8),
                top: Math.min((pinY / 100) * DRAW_SCALE_H - offsetY - 4, CROP_H - 8),
              },
            ]}
          />
        </View>
      )}
    </View>
  )
}

// ── Main Document ────────────────────────────────────────────────
export function JobReportDocument({
  job,
  buildings,
  penetrations,
  roomMaterials,
  evidenceFields,
  companyLogoUrl,
  companyCredentials = [],
  levelDrawingsMap = {},
}: Props) {
  const generatedAt = new Date().toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })

  const accentColor = job.company?.primary_color || '#2563eb'
  const sc = statusColors(job.status)

  // Build field id → label lookup
  const fieldLabels: Record<string, string> = {}
  for (const f of evidenceFields) {
    fieldLabels[f.id] = f.label
  }

  // Group penetrations
  const grouped = groupPenetrations(penetrations, buildings)

  // Build penetration pages: 4 per page in 2×2 grid
  const penPages = chunk(grouped, 4)

  // Room counts
  const totalRooms = buildings.flatMap(b => b.levels?.flatMap((l: any) => l.rooms || []) || []).length
  const doneRooms = buildings.flatMap(b => b.levels?.flatMap((l: any) => (l.rooms || []).filter((r: any) => r.is_done)) || []).length

  // ── Footer (shared across all pages) ──
  const FooterView = (
    <View style={[styles.footer, { borderTopColor: accentColor }]} fixed>
      <View style={styles.footerTop}>
        <View>
          <View style={styles.footerLeft}>
            {companyLogoUrl && (
              <Image src={companyLogoUrl} style={{ width: 20, height: 20, objectFit: 'contain' }} />
            )}
            <Text style={styles.footerCompanyName}>{job.company?.name || 'AUTONYX'}</Text>
          </View>
          {job.company?.abn && (
            <Text style={styles.footerDetails}>ABN: {job.company.abn}</Text>
          )}
          {(job.company?.phone || job.company?.email) && (
            <Text style={styles.footerDetails}>
              {[job.company.phone, job.company.email].filter(Boolean).join(' · ')}
            </Text>
          )}
          {job.company?.website && (
            <Text style={styles.footerDetails}>{job.company.website}</Text>
          )}
        </View>

        {companyCredentials.length > 0 && (
          <View style={styles.footerCredentials}>
            {companyCredentials.map((cred, i) => (
              <Text key={i} style={styles.footerCredential}>
                {cred.label}: {cred.value}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerText}>{job.job_number}</Text>
        <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </View>
  )

  return (
    <Document title={`${job.job_number} — Completion Report`} author={job.company?.name || 'AUTONYX'}>

      {/* ── Page 1: Header + Job Details + Building Structure + Materials ── */}
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: accentColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {companyLogoUrl && (
              <Image src={companyLogoUrl} style={{ width: 48, height: 48, objectFit: 'contain' }} />
            )}
            <View>
              <Text style={styles.companyName}>{job.company?.name || 'AUTONYX'}</Text>
              <Text style={styles.reportLabel}>Job Completion Report</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.jobNumber, { color: accentColor }]}>{job.job_number}</Text>
            <Text style={styles.generatedAt}>Generated {generatedAt}</Text>
          </View>
        </View>

        {/* Job Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Job</Text>
            <Text style={styles.detailValue}>{job.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>
                {job.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Customer</Text>
            <Text style={styles.detailValue}>{job.customer?.name || '—'}</Text>
            {job.customer?.email && <Text style={styles.detailSub}>{job.customer.email}</Text>}
            {job.customer?.phone && <Text style={styles.detailSub}>{job.customer.phone}</Text>}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Site</Text>
            <Text style={styles.detailValue}>{job.site_name || '—'}</Text>
            {job.site_address_line1 && (
              <Text style={styles.detailSub}>
                {[job.site_address_line1, job.site_city, job.site_state, job.site_postcode].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Dates</Text>
            {job.scheduled_start && (
              <Text style={styles.detailSub}>
                Start: {new Date(job.scheduled_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })}
              </Text>
            )}
            {job.completed_at && (
              <Text style={[styles.detailValue, { marginTop: 2 }]}>
                Completed: {new Date(job.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })}
              </Text>
            )}
            {!job.completed_at && !job.scheduled_start && (
              <Text style={styles.detailSub}>Not scheduled</Text>
            )}
          </View>
        </View>

        {/* Building Structure */}
        {buildings.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Building Structure</Text>
              <Text style={styles.sectionCount}>{doneRooms}/{totalRooms} rooms done</Text>
            </View>

            {buildings.map(building => (
              <View key={building.id} style={styles.buildingBlock}>
                <View style={styles.buildingHeader}>
                  <Text style={styles.buildingName}>{building.name}</Text>
                </View>

                {(building.levels || []).map((level: any) => (
                  <View key={level.id} style={styles.levelBlock}>
                    <View style={styles.levelHeader}>
                      <Text style={styles.levelName}>{level.name}</Text>
                    </View>

                    {(level.rooms || []).map((room: any) => (
                      <View key={room.id} style={styles.roomRow}>
                        <Text style={styles.roomName}>{room.name}</Text>
                        <Text style={[
                          styles.doneBadge,
                          { backgroundColor: room.is_done ? '#dcfce7' : '#f1f5f9', color: room.is_done ? '#166534' : '#94a3b8' }
                        ]}>
                          {room.is_done ? '✓ Done' : 'Pending'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Materials */}
        {roomMaterials.length > 0 && (
          <View style={styles.materialsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Materials Used</Text>
              <Text style={styles.sectionCount}>{roomMaterials.length} items</Text>
            </View>

            <View style={styles.materialsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>Material</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>Location</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>Qty</Text>
              </View>

              {roomMaterials.map((m: any, i: number) => (
                <View key={m.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, styles.col1]}>
                    {m.material?.name || m.material_name_override || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.col2]}>
                    {m.room_name || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.col3]}>
                    {m.quantity} {m.material?.unit || ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Penetrations summary count on page 1 */}
        {penetrations.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Penetrations</Text>
              <Text style={styles.sectionCount}>{penetrations.length} logged — detail on following pages</Text>
            </View>
          </View>
        )}

        {FooterView}
      </Page>

      {/* ── Penetration Pages: 4 per page in 2×2 grid ── */}
      {penPages.map((pageGroup, pageIdx) => {
        // Track group headers needed for this page
        let lastGroup = pageIdx > 0 && penPages[pageIdx - 1].length > 0
          ? `${penPages[pageIdx - 1][penPages[pageIdx - 1].length - 1].buildingName}|${penPages[pageIdx - 1][penPages[pageIdx - 1].length - 1].levelName}|${penPages[pageIdx - 1][penPages[pageIdx - 1].length - 1].roomName}`
          : ''

        // Split into rows of 2
        const rows = chunk(pageGroup, 2)

        return (
          <Page key={`pen-page-${pageIdx}`} size="A4" style={styles.page}>
            {/* Page title */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e293b' }}>
                Penetrations
              </Text>
              <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                {job.job_number}
              </Text>
            </View>

            {rows.map((row, rowIdx) => {
              // Check if we need a group header before this row
              const firstInRow = row[0]
              const groupKey = `${firstInRow.buildingName}|${firstInRow.levelName}|${firstInRow.roomName}`
              const needsHeader = groupKey !== lastGroup
              lastGroup = row[row.length - 1]
                ? `${row[row.length - 1].buildingName}|${row[row.length - 1].levelName}|${row[row.length - 1].roomName}`
                : lastGroup

              return (
                <View key={rowIdx}>
                  {needsHeader && (
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupHeaderText}>
                        {firstInRow.buildingName} › {firstInRow.levelName} › {firstInRow.roomName}
                      </Text>
                    </View>
                  )}
                  <View style={styles.gridRow}>
                    {row.map((item, colIdx) => (
                      <PenCard
                        key={item.penetration.id}
                        pen={item.penetration}
                        fieldLabels={fieldLabels}
                        drawingUrl={item.levelId ? levelDrawingsMap[item.levelId] : undefined}
                      />
                    ))}
                    {/* Empty spacer if odd number in row */}
                    {row.length === 1 && <View style={styles.penCardEmpty} />}
                  </View>
                </View>
              )
            })}

            {FooterView}
          </Page>
        )
      })}

    </Document>
  )
}
