import Link from 'next/link'
import { APP_NAME } from '@/lib/brand'

export default function TermsPage() {
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
          Terms of service
        </h1>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            We&apos;re finalising the full terms of service before public launch — the real
            document will live here shortly.
          </p>
          <p>
            Until then, by using {APP_NAME} you agree to use it in good faith for the purpose
            it was built: running construction and trade jobs in Australia. We&apos;ll let you
            know in writing the moment the official terms are published, and you&apos;ll always
            be able to read them here.
          </p>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          Last updated: placeholder. Real terms ship pre-launch.
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
