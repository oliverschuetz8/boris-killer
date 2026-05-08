import { processPendingEventReminders } from '@/lib/services/email-digests'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await processPendingEventReminders()
    return Response.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('[cron/event-reminders]', err)
    return Response.json({ ok: false, error: err?.message }, { status: 500 })
  }
}
