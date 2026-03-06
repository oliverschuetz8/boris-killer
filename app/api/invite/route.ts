import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, full_name, phone, role } = await request.json()

  // Get the inviting admin's company_id
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseServer
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}