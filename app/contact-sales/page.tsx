import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { LandingNav } from '@/components/landing-nav'
import { LandingFooter } from '@/components/landing-footer'

// TODO (pre-launch): replace this placeholder with a real lead capture form.
// On submit, fan out to (a) leads DB table, (b) Google Sheets append,
// (c) admin email notification. See memory: project_enterprise_lead_pipeline.

export default function ContactSalesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">
      <LandingNav />

      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 px-6 pt-20 pb-32 md:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-indigo-100 opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-0 h-[24rem] w-[24rem] rounded-full bg-emerald-100 opacity-30 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Enterprise inquiries
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Tell us about your team.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-600 md:text-lg">
            Enterprise plans are tailored — multi-branch operations, custom compliance
            forms, dedicated account management, custom SLAs. We&apos;ll walk you through
            it on a 30-minute call.
          </p>

          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5 md:p-10">
            <p className="text-sm leading-relaxed text-slate-600">
              We&apos;re finishing the inquiry form before public launch. In the meantime,
              email us and we&apos;ll be in touch within one business day.
            </p>
            <a
              href="mailto:hello@example.com?subject=Enterprise%20plan%20inquiry"
              className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Email us
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </a>
            <p className="mt-4 text-xs text-slate-400">
              hello@example.com — replace once final domain is set.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to pricing
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
