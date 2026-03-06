import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Invite flow — send worker to accept-invite page to set password
  if (type === 'invite') {
    return NextResponse.redirect(new URL('/accept-invite', requestUrl.origin))
  }

  // Default — send to dashboard
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}