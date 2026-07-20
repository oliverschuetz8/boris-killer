import Link from 'next/link'
import { APP_NAME } from '@/lib/brand'

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden />
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </Link>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
            <Link href="/how-it-works" className="transition hover:text-slate-900">
              How it works
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/login" className="transition hover:text-slate-900">
              Sign in
            </Link>
            <Link href="/signup" className="transition hover:text-slate-900">
              Start free trial
            </Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Built in Australia.
          </p>
          <p className="text-slate-400">{APP_NAME} is part of AUTONYX.</p>
        </div>
      </div>
    </footer>
  )
}
