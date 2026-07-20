import Link from 'next/link'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { LandingNav } from '@/components/landing-nav'
import { LandingFooter } from '@/components/landing-footer'
import { PricingTiers } from './pricing-tiers'

type CellValue = boolean | string

type ComparisonRow = {
  label: string
  starter: CellValue
  pro: CellValue
  business: CellValue
  enterprise: CellValue
}

type ComparisonGroup = {
  category: string
  rows: ComparisonRow[]
}

const COMPARISON: ComparisonGroup[] = [
  {
    category: 'Core',
    rows: [
      { label: 'Job scheduling & management', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Quoting & invoicing', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Customer management (CRM)', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Mobile app for the field', starter: true, pro: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Compliance & evidence',
    rows: [
      { label: 'Building → Level → Room structure', starter: false, pro: true, business: true, enterprise: true },
      { label: 'AS1851 compliance forms', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Photo evidence with metadata', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Floor plan pin mapping', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Custom compliance form builder', starter: false, pro: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Reporting',
    rows: [
      { label: 'PDF completion reports', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Spreadsheet (.xlsx) export', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Word (.docx) export', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Interactive HTML drawings export', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Job cost reporting', starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Customer experience',
    rows: [
      { label: 'Customer portal (magic link)', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Branded reports & portal', starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Schedule & calendar',
    rows: [
      { label: 'Schedule with drag-drop', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Calendar sync (Apple, Google, Outlook)', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Daily digest emails', starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    category: 'Pay & time',
    rows: [
      { label: 'Fair Work pay rules engine', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Xero Payroll timesheet sync', starter: false, pro: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Integrations',
    rows: [
      { label: 'Xero / MYOB integration', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Xero invoice sync', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Webhooks', starter: false, pro: false, business: true, enterprise: true },
      { label: 'Public API + API keys', starter: false, pro: false, business: true, enterprise: true },
    ],
  },
  {
    category: 'Operations',
    rows: [
      { label: 'Multi-branch / location', starter: false, pro: false, business: false, enterprise: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Email support', starter: true, pro: true, business: true, enterprise: true },
      { label: 'Priority support', starter: false, pro: true, business: true, enterprise: true },
      { label: 'Phone support', starter: false, pro: false, business: true, enterprise: true },
      { label: 'Onboarding sessions', starter: false, pro: false, business: '2 sessions', enterprise: 'Custom' },
      { label: 'Dedicated account manager', starter: false, pro: false, business: false, enterprise: true },
      { label: 'Custom SLA & contract', starter: false, pro: false, business: false, enterprise: true },
    ],
  },
]

const FAQS = [
  {
    q: 'What counts as a user?',
    a: 'Anyone who logs into the app — admins, managers, and field workers all count. Each tier includes a number of users in the base price; you can add more at the per-seat rate. Customers viewing the customer portal don\'t count as users — they\'re always free.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes. Upgrade or downgrade any time from Settings → Billing. Changes take effect immediately, prorated for the rest of your billing period.',
  },
  {
    q: 'What happens at the end of my 30-day trial?',
    a: 'You\'ll get an email reminder a few days before. To keep using the app, add a card and pick a plan. If you don\'t, your account moves to a read-only state — your data stays for 90 days while you decide.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The 30-day trial is completely free. You only add a card if you decide to keep using the app.',
  },
  {
    q: 'Monthly or annual — which should I pick?',
    a: 'Annual saves you 15-20% depending on tier and locks in your price for a full year. Monthly is more flexible if you\'re still testing the waters. Most established teams choose annual once they\'ve found the plan that fits.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Cancel from Settings → Billing. On monthly, your access continues until the end of the current month. On annual, you can cancel and get a prorated refund for the remaining months.',
  },
]

function Cell({ value }: { value: CellValue }) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-blue-600" strokeWidth={2.5} />
  }
  if (value === false) {
    return <Minus className="mx-auto h-4 w-4 text-slate-300" />
  }
  return <span className="text-xs font-medium text-slate-700">{value}</span>
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800 antialiased">
      <LandingNav />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50 px-6 pt-20 pb-12 md:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-indigo-100 opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-200 opacity-30 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Pricing
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Plans that scale with the crew.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            30-day trial on every tier. No card to start. Customer portal always free for
            your customers. Cancel any time.
          </p>
        </div>
      </section>

      {/* ───────── TIERS ───────── */}
      <section className="bg-slate-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <PricingTiers />
        </div>
      </section>

      {/* ───────── COMPARISON TABLE ───────── */}
      <section className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Compare plans
            </p>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              See exactly what&apos;s included.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
              Every feature, every plan. Pick the one that fits where you are now —
              upgrade as the team grows.
            </p>
          </div>

          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-4 pr-6 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Feature
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold tracking-tight text-slate-900">
                    Starter
                  </th>
                  <th className="relative px-4 py-4 text-center text-sm font-semibold tracking-tight text-blue-600">
                    Pro
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold tracking-tight text-slate-900">
                    Business
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-semibold tracking-tight text-slate-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(group => (
                  <>
                    <tr key={group.category} className="border-b border-slate-100 bg-slate-50/50">
                      <td
                        colSpan={5}
                        className="py-3 pr-6 text-xs font-medium uppercase tracking-wider text-slate-500"
                      >
                        {group.category}
                      </td>
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.label} className="border-b border-slate-100">
                        <td className="py-3.5 pr-6 text-sm text-slate-700">{row.label}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Cell value={row.starter} />
                        </td>
                        <td className="bg-blue-50/30 px-4 py-3.5 text-center">
                          <Cell value={row.pro} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Cell value={row.business} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Cell value={row.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="bg-slate-50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Common questions
            </p>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Things people ask before signing up.
            </h2>
          </div>

          <div className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-6 px-6 py-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="relative overflow-hidden bg-slate-900 px-6 py-24 text-white md:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
            Try it free for 30 days.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
            No credit card. Cancel any time. If it&apos;s not the simplest field service
            tool you&apos;ve used, walk away.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact-sales"
              className="inline-flex items-center gap-2 px-2 py-3.5 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Talk to us about Enterprise
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
