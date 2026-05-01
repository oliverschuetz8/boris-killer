import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /api/xero/connect
 * Initiates Xero OAuth 2.0 Authorization Code flow with PKCE.
 * Redirects the browser to Xero's consent page.
 */
export async function GET() {
  // Auth check — admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await sha256Base64url(codeVerifier)

  // Generate state for CSRF protection
  const state = generateRandomString(32)

  // Store in cookies (httpOnly, short-lived)
  const cookieStore = await cookies()
  cookieStore.set('xero_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  cookieStore.set('xero_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/xero/callback`,
    scope: 'openid profile email accounting.transactions accounting.contacts offline_access payroll.employees payroll.timesheets',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return NextResponse.redirect(`https://login.xero.com/identity/connect/authorize?${params}`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => chars[b % chars.length]).join('')
}

async function sha256Base64url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
