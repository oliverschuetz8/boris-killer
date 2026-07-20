import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  MapPin,
  ClipboardCheck,
  FileText,
  Camera,
  Calendar,
  Check,
} from 'lucide-react'
import { TradeVocabMarquee } from './trade-vocab-marquee'
import { LandingNav } from '@/components/landing-nav'
import { LandingFooter } from '@/components/landing-footer'
import { APP_NAME } from '@/lib/brand'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/jobs')
  }

  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">
      {/* ───────── NAV ───────── */}
      <LandingNav />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 px-6 pt-20 pb-28 md:pt-32 md:pb-40">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p
                className="animate-fade-up text-xs font-medium uppercase tracking-[0.2em] text-slate-500"
                style={{ animationDelay: '0ms' }}
              >
                For passive fire protection contractors · Australia
              </p>

              <h1
                className="animate-fade-up mt-8 text-[clamp(2.75rem,7vw,6.5rem)] font-bold leading-[0.95] tracking-tight text-slate-900"
                style={{ animationDelay: '120ms' }}
              >
                Run jobs.<br />
                Capture evidence.<br />
                Get paid.
              </h1>

              <p
                className="animate-fade-up mt-6 text-2xl font-medium tracking-tight text-slate-400 md:text-3xl"
                style={{ animationDelay: '240ms' }}
              >
                No paperwork.
              </p>

              <p
                className="animate-fade-up mt-10 max-w-xl text-base text-slate-600 md:text-lg"
                style={{ animationDelay: '360ms' }}
              >
                AS1851-ready evidence capture, floor plan pin mapping, and the reports your customers actually want.
                Built in Australia for passive fire contractors.
              </p>

              <div
                className="animate-fade-up mt-10 flex flex-wrap items-center gap-4"
                style={{ animationDelay: '480ms' }}
              >
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 px-2 py-3.5 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <p
                className="animate-fade-up mt-6 text-sm text-slate-500"
                style={{ animationDelay: '600ms' }}
              >
                30-day trial. No credit card required.
              </p>
            </div>

            {/* Hero visual — floor plan with pins (placeholder) */}
            <div
              className="animate-fade-up lg:col-span-5"
              style={{ animationDelay: '300ms' }}
            >
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-100 via-indigo-50 to-emerald-50 opacity-60 blur-2xl" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.06),transparent_60%)] p-8 text-center">
                    <MapPin className="h-8 w-8 text-blue-600" strokeWidth={1.5} />
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Screenshot slot
                    </p>
                    <p className="max-w-[20ch] text-sm text-slate-500">
                      Floor plan with penetration pins, level prefix labels visible
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TRADE VOCAB MARQUEE ───────── */}
      <TradeVocabMarquee />

      {/* ───────── BEFORE / AFTER ───────── */}
      <section id="how" className="bg-slate-50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            How it works
          </p>
          <h2 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Your evidence, sorted.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Capture proof as you go. Generate the report at the end. Send it.
          </p>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-slate-200 md:grid-cols-2">
            {/* Without */}
            <div className="bg-white p-8 md:p-10">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Without {APP_NAME}
              </p>
              <ul className="mt-6 space-y-4 text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1 w-3 shrink-0 bg-slate-300" />
                  <span>End-of-job paperwork that takes longer than the job itself.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1 w-3 shrink-0 bg-slate-300" />
                  <span>Photos scattered across phones, WhatsApp threads, and email drafts.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1 w-3 shrink-0 bg-slate-300" />
                  <span>Reports assembled by hand at 9pm Sunday night.</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 inline-block h-1 w-3 shrink-0 bg-slate-300" />
                  <span>Evidence linked to the wrong room — or no room at all.</span>
                </li>
              </ul>
            </div>

            {/* With */}
            <div className="relative bg-white p-8 md:p-10">
              <span className="absolute left-0 top-0 h-full w-1 bg-blue-600" />
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
                With {APP_NAME}
              </p>
              <ul className="mt-6 space-y-4 text-slate-700">
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />
                  <span>Photo as you go. Auto-tagged to building, level, room.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />
                  <span>Pin every penetration on the actual floor plan. Drag, label, done.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />
                  <span>PDF, spreadsheet, and Word reports generated from your data.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" strokeWidth={2.5} />
                  <span>Send your customer a portal link. They see exactly what was done, where.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FEATURE CARDS (pastel zone) ───────── */}
      <section className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 — slate-blue pastel */}
            <article
              className="group rounded-2xl border border-slate-200 p-8 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
              style={{ backgroundColor: '#e0e7ff' }}
            >
              <div
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#6366f1' }}
              >
                <MapPin className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                Floor plan pin mapping
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Pin every penetration on the actual drawing. Auto-prefixed labels per level (L1-001, L1-002).
                Customer-presentable. AS1851-ready.
              </p>
            </article>

            {/* Card 2 — mint pastel */}
            <article
              className="group rounded-2xl border border-slate-200 p-8 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
              style={{ backgroundColor: '#d1fae5' }}
            >
              <div
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#10b981' }}
              >
                <ClipboardCheck className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                Evidence built for compliance
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Type, FRL, sealant, installer, date — captured per penetration, not buried in notes.
                Default questions per work type, custom questions when you need them.
              </p>
            </article>

            {/* Card 3 — peach pastel */}
            <article
              className="group rounded-2xl border border-slate-200 p-8 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
              style={{ backgroundColor: '#fed7aa' }}
            >
              <div
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: '#f97316' }}
              >
                <FileText className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
                Reports without Sunday nights
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                PDF, spreadsheet, Word — generated from your data, branded with your logo.
                Send your customer a live portal link and skip the 50-photo email.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ───────── PRODUCT VISUALS ───────── */}
      <section className="bg-slate-50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            What you ship
          </p>
          <h2 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Built for the field. Polished for the customer.
          </h2>

          <div className="mt-16 grid gap-6 lg:grid-cols-12">
            {/* Big screenshot — PDF report page */}
            <div className="lg:col-span-7">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                  <FileText className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Screenshot slot
                  </p>
                  <p className="max-w-[28ch] text-sm text-slate-500">
                    PDF report page — 2×2 grid, photo + evidence Q&amp;A + cropped floor plan close-up per penetration
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                The compliance deliverable. One PDF page per four penetrations, branded with your logo.
              </p>
            </div>

            {/* Side stack — phone mockup */}
            <div className="space-y-6 lg:col-span-5">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <Camera className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Screenshot slot
                  </p>
                  <p className="max-w-[20ch] text-sm text-slate-500">
                    Worker mobile — penetration form mid-completion with photo preview
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                On-site capture. Big buttons, big photos, no decision fatigue.
              </p>
            </div>
          </div>

          {/* Schedule wide row */}
          <div className="mt-12">
            <div className="aspect-[3/1] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <Calendar className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Screenshot slot
                </p>
                <p className="max-w-[36ch] text-sm text-slate-500">
                  Schedule — Month view with pastel chips, busy week showing 10–15 mixed-type events
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Drag, drop, reschedule. Jobs and events in one place — by-worker view when you need it.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Pricing
          </p>
          <h2 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Plans that scale with the crew.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Customer portal is always included. 30-day trial on every tier. No credit card to start.
          </p>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Starter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold tracking-tight text-slate-900">Starter</p>
              <p className="mt-1 text-xs text-slate-500">Solo operators getting started</p>
              <p className="mt-6 text-3xl font-bold tracking-tight text-slate-900">A$99<span className="text-sm font-medium text-slate-500">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">A$60 / extra seat</p>
              <hr className="my-6 border-slate-100" />
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Unlimited jobs</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Floor plan pin mapping</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> PDF, spreadsheet, Word reports</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Customer portal</li>
              </ul>
            </div>

            {/* Pro — featured */}
            <div className="relative rounded-2xl border-2 border-blue-600 bg-white p-8 shadow-xl shadow-blue-600/10">
              <span className="absolute -top-3 left-8 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                Most popular
              </span>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Pro</p>
              <p className="mt-1 text-xs text-slate-500">Small teams running real volume</p>
              <p className="mt-6 text-3xl font-bold tracking-tight text-slate-900">A$299<span className="text-sm font-medium text-slate-500">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">A$50 / extra seat</p>
              <hr className="my-6 border-slate-100" />
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Everything in Starter</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Schedule with drag-drop</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Xero integration + timesheet sync</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Calendar sync (Apple, Google, Outlook)</li>
              </ul>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold tracking-tight text-slate-900">Business</p>
              <p className="mt-1 text-xs text-slate-500">Multi-crew operations</p>
              <p className="mt-6 text-3xl font-bold tracking-tight text-slate-900">A$749<span className="text-sm font-medium text-slate-500">/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">A$45 / extra seat</p>
              <hr className="my-6 border-slate-100" />
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Everything in Pro</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Webhooks + public API</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Email distribution groups</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Priority support</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <p className="text-sm font-semibold tracking-tight text-slate-900">Enterprise</p>
              <p className="mt-1 text-xs text-slate-500">Custom needs, custom terms</p>
              <p className="mt-6 text-3xl font-bold tracking-tight text-slate-900">A$1,699<span className="text-sm font-medium text-slate-500">+/mo</span></p>
              <p className="mt-1 text-xs text-slate-500">A$40 / extra seat</p>
              <hr className="my-6 border-slate-100" />
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Everything in Business</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> SSO + custom roles</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> Dedicated onboarding</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-blue-600" /> SLA &amp; account manager</li>
              </ul>
            </div>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Annual discount available. Customer portal always free for your customers.
          </p>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="relative overflow-hidden bg-slate-900 px-6 py-24 text-white md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
            Stop chasing photos.<br />Start running jobs.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
            30-day trial. No credit card. Cancel anytime if it&apos;s not the simplest field service tool you&apos;ve used.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-2 py-3.5 text-sm font-medium text-slate-300 hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <LandingFooter />
    </main>
  )
}
