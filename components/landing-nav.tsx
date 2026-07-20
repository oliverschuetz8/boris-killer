import Link from 'next/link'
import { APP_NAME } from '@/lib/brand'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            {APP_NAME}
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/how-it-works"
            className="hidden text-sm text-slate-600 transition hover:text-slate-900 md:block"
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className="hidden text-sm text-slate-600 transition hover:text-slate-900 md:block"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-600 transition hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </nav>
  )
}
