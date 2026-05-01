import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /api/xero/callback
 * Handles the OAuth callback from Xero.
 * Exchanges the authorization code for tokens and stores the connection.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=missing_params`)
  }

  // Verify state
  const cookieStore = await cookies()
  const storedState = cookieStore.get('xero_oauth_state')?.value
  const codeVerifier = cookieStore.get('xero_code_verifier')?.value

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=state_mismatch`)
  }

  if (!codeVerifier) {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=missing_verifier`)
  }

  // Clean up cookies
  cookieStore.delete('xero_oauth_state')
  cookieStore.delete('xero_code_verifier')

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=not_authenticated`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id || profile.role !== 'admin') {
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=not_admin`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${siteUrl}/api/xero/callback`,
        client_id: process.env.XERO_CLIENT_ID!,
        client_secret: process.env.XERO_CLIENT_SECRET!,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Xero token exchange failed:', errText)
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get the connected tenant
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!connectionsRes.ok) {
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=tenant_fetch_failed`)
    }

    const connections = await connectionsRes.json()
    const tenant = connections[0] // Use the first connected org

    if (!tenant) {
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=no_tenant`)
    }

    // Upsert connection (one per company)
    const { error: upsertError } = await supabase
      .from('xero_connections')
      .upsert(
        {
          company_id: profile.company_id,
          xero_tenant_id: tenant.tenantId,
          xero_tenant_name: tenant.tenantName || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          sync_status: 'idle',
        },
        { onConflict: 'company_id' }
      )

    if (upsertError) {
      console.error('Failed to store Xero connection:', upsertError)
      return NextResponse.redirect(`${siteUrl}/settings/integrations?error=save_failed`)
    }

    return NextResponse.redirect(`${siteUrl}/settings/integrations?success=connected`)
  } catch (err: any) {
    console.error('Xero callback error:', err)
    return NextResponse.redirect(`${siteUrl}/settings/integrations?error=unexpected`)
  }
}
