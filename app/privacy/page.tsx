import Link from 'next/link'
import { APP_NAME } from '@/lib/brand'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-800 antialiased">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {APP_NAME}
          </span>
        </Link>

        <p className="mt-12 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Privacy policy
        </h1>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            We&apos;re finalising the full privacy policy before public launch — the real
            document will live here shortly.
          </p>
          <p>
            Until then, the short version: we only collect the data we need to run the app
            for you (account info, your job data, your photos), we don&apos;t sell it, and
            we don&apos;t share it with anyone except the integrations you choose to connect.
            Your customers&apos; data is yours, not ours.
          </p>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          Last updated: placeholder. Real policy ships pre-launch.
        </p>

        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to sign up
        </Link>
      </div>
    </main>
  )
}
