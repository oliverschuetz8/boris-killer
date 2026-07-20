import Link from 'next/link'
import { APP_NAME } from '@/lib/brand'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-indigo-100 opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[24rem] w-[24rem] rounded-full bg-orange-200 opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-emerald-100 opacity-50 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex flex-col items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 transition hover:opacity-80"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-blue-600" aria-hidden />
            <span className="text-base font-semibold tracking-tight text-slate-900">
              {APP_NAME}
            </span>
          </Link>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Field service · Built in Australia
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5 md:p-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
        )}
      </div>
    </main>
  )
}
