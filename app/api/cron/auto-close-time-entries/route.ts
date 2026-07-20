import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoCloseRunawayClocks } from '@/lib/services/time-tracking'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Daily cron at 23:59 Sydney (13:59 UTC during AEST). Closes any open shift or
 * job timer that has been running longer than 16 hours so forgotten clocks
 * don't bleed into the next day. Closed rows are flagged `auto_closed = true`
 * so admin + tradie can review and adjust.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    const result = await autoCloseRunawayClocks(admin)
    return NextResponse.json({
      ok: true,
      closed: result.closed,
      ran_at: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: `Auto-close failed: ${error?.message || 'unknown'}` },
      { status: 500 },
    )
  }
}
