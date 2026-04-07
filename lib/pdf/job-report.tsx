import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 50,
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

  // ── Penetrations ────────────────────────────────────────────────
  penetrationsSection: {
    marginTop: 18,
    marginBottom: 10,
  },
  penetrationCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  penetrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  penetrationLocation: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  penetrationMeta: {
    fontSize: 8,
    color: '#64748b',
  },
  penetrationBody: {
    padding: 10,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  fieldItem: {
    minWidth: '30%',
  },
  fieldLabel: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9,
    color: '#1e293b',
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  photo: {
    width: 100,
    height: 80,
    borderRadius: 4,
    objectFit: 'cover',
  },
  noPhotos: {
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
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
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 12,
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

interface Props {
  job: any
  buildings: any[]
  penetrations: any[]
  roomMaterials: any[]
  evidenceFields: any[]
}

export function JobReportDocument({ job, buildings, penetrations, roomMaterials, evidenceFields }: Props) {
  const generatedAt = new Date().toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const sc = statusColors(job.status)

  // Build a lookup: field id → field label
  const fieldLabels: Record<string, string> = {}
  for (const f of evidenceFields) {
    fieldLabels[f.id] = f.label
  }

  // Group penetrations by room_id
  const pensByRoom: Record<string, any[]> = {}
  for (const p of penetrations) {
    const key = p.room_id || 'unassigned'
    if (!pensByRoom[key]) pensByRoom[key] = []
    pensByRoom[key].push(p)
  }

  // Group room materials by room_id
  const matsByRoom: Record<string, any[]> = {}
  for (const m of roomMaterials) {
    const key = m.room_id || 'unassigned'
    if (!matsByRoom[key]) matsByRoom[key] = []
    matsByRoom[key].push(m)
  }

  const totalRooms = buildings.flatMap(b => b.levels?.flatMap((l: any) => l.rooms || []) || []).length
  const doneRooms = buildings.flatMap(b => b.levels?.flatMap((l: any) => (l.rooms || []).filter((r: any) => r.is_done)) || []).length

  return (
    <Document title={`${job.job_number} — Completion Report`} author={job.company?.name || 'AUTONYX'}>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{job.company?.name || 'AUTONYX'}</Text>
            <Text style={styles.reportLabel}>Job Completion Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.jobNumber}>{job.job_number}</Text>
            <Text style={styles.generatedAt}>Generated {generatedAt}</Text>
          </View>
        </View>

        {/* ── Job Details Grid ── */}
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
                Start: {new Date(job.scheduled_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}
            {job.completed_at && (
              <Text style={[styles.detailValue, { marginTop: 2 }]}>
                Completed: {new Date(job.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}
            {!job.completed_at && !job.scheduled_start && (
              <Text style={styles.detailSub}>Not scheduled</Text>
            )}
          </View>

        </View>

        {/* ── Building Structure ── */}
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

        {/* ── Penetrations ── */}
        {penetrations.length > 0 && (
          <View style={styles.penetrationsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Penetrations</Text>
              <Text style={styles.sectionCount}>{penetrations.length} logged</Text>
            </View>

            {penetrations.map((pen, i) => {
              const photos = pen.penetration_photos || []
              const fieldValues = pen.field_values || {}

              return (
                <View key={pen.id} style={styles.penetrationCard} wrap={false}>
                  <View style={styles.penetrationHeader}>
                    <Text style={styles.penetrationLocation}>
                      {[pen.location_level, pen.location_room].filter(Boolean).join(' › ') || 'No location'}
                    </Text>
                    <Text style={styles.penetrationMeta}>#{i + 1}</Text>
                  </View>

                  <View style={styles.penetrationBody}>
                    {/* Field values */}
                    {Object.keys(fieldValues).length > 0 && (
                      <View style={styles.fieldsRow}>
                        {Object.entries(fieldValues).map(([key, val]) => (
                          <View key={key} style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>{fieldLabels[key] || key}</Text>
                            <Text style={styles.fieldValue}>{String(val) || '—'}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {pen.notes && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={styles.fieldLabel}>Notes</Text>
                        <Text style={styles.fieldValue}>{pen.notes}</Text>
                      </View>
                    )}

                    {/* Photos */}
                    {photos.length > 0 ? (
                      <View style={styles.photosRow}>
                        {photos.map((photo: any) => (
                          <Image key={photo.id} src={photo.url} style={styles.photo} />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noPhotos}>No photos</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── Materials ── */}
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

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{job.company?.name || 'AUTONYX'} · {job.job_number}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
