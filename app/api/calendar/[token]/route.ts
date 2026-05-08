import { generateIcalFeed } from '@/lib/services/calendar-feed'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return new Response('Invalid token', { status: 404 })
  }

  const url = new URL(req.url)
  const appUrl = `${url.protocol}//${url.host}`

  const ics = await generateIcalFeed(token, appUrl)
  if (ics === null) {
    return new Response('Calendar not found', { status: 404 })
  }

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="jobs.ics"',
      'Cache-Control': 'public, max-age=300, must-revalidate',
    },
  })
}
