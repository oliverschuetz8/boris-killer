import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { friendlyAuthError } from '@/lib/errors'

export async function POST(request: Request) {
  const { email, full_name, phone, role } = await request.json()

  // Get the inviting admin's company_id
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Your session has expired. Refresh the page and sign in again.' }, { status: 401 })

  const { data: profile } = await supabaseServer
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: "You don't have permission to invite team members. Ask your account admin if you need access." }, { status: 401 })
  }

  // Use service role key to send invite
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name,
      phone,
      role,
      company_id: profile.company_id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
  })

  if (error) {
    console.error('Invite error:', error)
    return NextResponse.json(
      { error: friendlyAuthError(error, "We couldn't send that invite. Check the email address and try again — if it keeps happening, contact support.") },
      { status: 400 },
    )
  }
  return NextResponse.json({ success: true })
}