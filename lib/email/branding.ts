import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailBranding } from './types'

export async function getEmailBranding(companyId: string): Promise<EmailBranding> {
  const admin = createAdminClient()

  const { data: company, error } = await admin
    .from('companies')
    .select(`
      id, name, email, phone, website, abn, logo_url,
      primary_color, secondary_color,
      email_signature, email_reply_to, email_show_logo,
      address_line1, address_line2, city, state, postcode, country
    `)
    .eq('id', companyId)
    .single()

  if (error || !company) {
    throw new Error(`Failed to load company branding: ${error?.message ?? 'not found'}`)
  }

  const { data: credentials } = await admin
    .from('company_credentials')
    .select('label, value')
    .eq('company_id', companyId)
    .order('display_order')

  let signedLogoUrl: string | null = null
  if (company.logo_url && company.email_show_logo) {
    const { data: signed } = await admin.storage
      .from('job-photos')
      .createSignedUrl(company.logo_url, 60 * 60 * 24 * 7)
    signedLogoUrl = signed?.signedUrl ?? null
  }

  const addressParts = [
    company.address_line1,
    company.address_line2,
    [company.city, company.state, company.postcode].filter(Boolean).join(' '),
    company.country,
  ].filter(Boolean) as string[]

  return {
    company_id: company.id,
    name: company.name,
    logo_url: signedLogoUrl,
    primary_color: company.primary_color || '#2563eb',
    secondary_color: company.secondary_color || '#1e293b',
    email_signature: company.email_signature,
    email_reply_to: company.email_reply_to,
    email_show_logo: company.email_show_logo ?? true,
    abn: company.abn,
    email: company.email,
    phone: company.phone,
    website: company.website,
    address: addressParts.length > 0 ? addressParts.join(', ') : null,
    credentials: credentials || [],
  }
}
