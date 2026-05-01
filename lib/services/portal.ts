import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ─── Types ───

export interface PortalLink {
  id: string
  job_id: string
  company_id: string
  token: string
  expires_at: string
  is_revoked: boolean
  created_at: string
  created_by: string
}

export interface PortalPhoto {
  id: string
  storage_path: string
  caption: string | null
}

export interface PortalPenetration {
  id: string
  field_values: Record<string, string>
  created_at: string
  room_id: string | null
  level_id: string | null
  floorplan_x: number | null
  floorplan_y: number | null
  floorplan_label: string | null
  photos: PortalPhoto[]
}

export interface PortalRoom {
  id: string
  name: string
  is_done: boolean
}

export interface PortalLevel {
  id: string
  name: string
  order_index: number
  rooms: PortalRoom[]
}

export interface PortalBuilding {
  id: string
  name: string
  levels: PortalLevel[]
}

export interface PortalEvidenceField {
  id: string
  label: string
  order_index: number
}

export interface PortalLevelDrawing {
  id: string
  level_id: string
  file_url: string
  file_name: string
}

export interface PortalJobData {
  job: {
    id: string
    job_number: string
    title: string
    description: string | null
    status: string
    priority: string
    job_type: string | null
    scheduled_start: string | null
    scheduled_end: string | null
    site_name: string | null
    site_address_line1: string | null
    site_city: string | null
    site_state: string | null
    site_postcode: string | null
    completed_at: string | null
    customer: {
      name: string
      email: string | null
      phone: string | null
    }
  }
  company: {
    name: string
    logo_url: string | null
    primary_color: string | null
  }
  buildings: PortalBuilding[]
  penetrations: PortalPenetration[]
  evidence_fields: PortalEvidenceField[]
  level_drawings: PortalLevelDrawing[]
}

// ─── Portal data (uses admin client — no auth required) ───

export async function getPortalJobData(token: string): Promise<PortalJobData | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_portal_job_data', { p_token: token })

  if (error || !data) return null
  return data as PortalJobData
}

export async function getPortalPhotoUrl(storagePath: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

export async function getPortalDrawingUrl(storagePath: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase.storage
    .from('job-photos')
    .createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}

// ─── Admin operations (requires auth — uses server client) ───

export async function getPortalLinksForJob(jobId: string): Promise<PortalLink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portal_links')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as PortalLink[]
}

export async function createPortalLink(
  jobId: string,
  companyId: string,
  createdBy: string,
  expiryDays: number = 30,
): Promise<PortalLink> {
  const supabase = await createClient()
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const { data, error } = await supabase
    .from('portal_links')
    .insert({
      job_id: jobId,
      company_id: companyId,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create portal link: ${error.message}`)
  return data as PortalLink
}

export async function revokePortalLink(linkId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('portal_links')
    .update({ is_revoked: true })
    .eq('id', linkId)
  if (error) throw new Error(`Failed to revoke portal link: ${error.message}`)
}
