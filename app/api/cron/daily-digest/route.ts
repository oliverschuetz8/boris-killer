import { sendDailyDigestsForAllUsers } from '@/lib/services/email-digests'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await sendDailyDigestsForAllUsers()
    return Response.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[cron/daily-digest]', err)
    return Response.json({ ok: false, error: err?.message }, { status: 500 })
  }
}
