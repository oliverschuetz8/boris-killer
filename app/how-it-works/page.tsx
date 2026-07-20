import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Layers,
  Camera,
  FileText,
  Send,
  Building2,
  Shield,
  Package,
  User,
  MapPin,
  Check,
  ClipboardCheck,
  Smartphone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LandingNav } from '@/components/landing-nav'
import { LandingFooter } from '@/components/landing-footer'

type Step = {
  number: string
  label: string
  title: string
  body: string
  bullets: string[]
  icon: LucideIcon
  bgClass: string
  iconBgClass: string
  iconColorClass: string
  screenshotIcon: LucideIcon
  screenshotDescription: string
  reverseLayout?: boolean
}

const STEPS: Step[] = [
  {
    number: '01',
    label: 'Step 01',
    title: 'Set up the job.',
    body:
      'Open a new job. Add the customer, the site address, and when the work\'s scheduled. Pick the evidence category — Certification or Inspection — and you\'re done.',
    bullets: [
      'Customer + site, full Australian address',
      'Schedule, status, priority',
      'Evidence category and subcategory',
      'Job number auto-generated',
    ],
    icon: Plus,
    bgClass: 'bg-indigo-50/40',
    iconBgClass: 'bg-indigo-500',
    iconColorClass: 'text-indigo-600',
    screenshotIcon: ClipboardCheck,
    screenshotDescription: 'Job creation screen — customer, site address, schedule, evidence category',
  },
  {
    number: '02',
    label: 'Step 02',
    title: 'Plan the work.',
    body:
      'Map the site as it is in real life. Buildings, levels, rooms. Configure custom evidence questions for the work type. Assign your workers.',
    bullets: [
      'Building → Level → Room hierarchy',
      'Per-level drawing prefix (e.g. L1-001)',
      'Custom evidence questions per job',
      'Assign workers from your team',
    ],
    icon: Layers,
    bgClass: 'bg-emerald-50/40',
    iconBgClass: 'bg-emerald-500',
    iconColorClass: 'text-emerald-600',
    screenshotIcon: Building2,
    screenshotDescription: 'Building structure tab — buildings, levels, rooms, drawing prefixes',
    reverseLayout: true,
  },
  {
    number: '03',
    label: 'Step 03',
    title: 'Capture on site.',
    body:
      'Workers open the app on their phone. They pick the building, level, room. They pin every penetration on the actual floor plan drawing, take photos, fill the evidence fields, and mark the room done when it\'s done.',
    bullets: [
      'Mobile-first, big buttons, gloves-friendly',
      'Pin penetrations directly on the drawing',
      'Photo evidence tagged to the right room',
      'Material logs per room',
    ],
    icon: Camera,
    bgClass: 'bg-orange-50/40',
    iconBgClass: 'bg-orange-500',
    iconColorClass: 'text-orange-600',
    screenshotIcon: Smartphone,
    screenshotDescription: 'Worker mobile execute view — pinning penetrations on floor plan, photo capture',
  },
  {
    number: '04',
    label: 'Step 04',
    title: 'Generate the report.',
    body:
      'One click — PDF, spreadsheet, Word, or an interactive HTML version with clickable pins. Branded with your logo, company details, and credentials.',
    bullets: [
      'PDF with 2×2 penetration grid + photos',
      'Spreadsheet (.xlsx) for filtering and sorting',
      'Word (.docx) for editing and adding notes',
      'Interactive HTML with zoomable drawings',
    ],
    icon: FileText,
    bgClass: 'bg-amber-50/40',
    iconBgClass: 'bg-amber-500',
    iconColorClass: 'text-amber-600',
    screenshotIcon: FileText,
    screenshotDescription: 'Report tab — PDF / spreadsheet / Word / HTML, branded with your logo',
    reverseLayout: true,
  },
  {
    number: '05',
    label: 'Step 05',
    title: 'Send to your customer.',
    body:
      'Generate a magic-link portal and send it. Your customer opens it on any device — no login, no friction. They see the report, photos, floor plans, and every pin.',
    bullets: [
      'Magic link, no signup required',
      '30-day expiry, admin can revoke any time',
      'Mobile-friendly view for on-the-go customers',
      'Full evidence drilldown — building → level → room → pin',
    ],
    icon: Send,
    bgClass: 'bg-violet-50/40',
    iconBgClass: 'bg-violet-500',
    iconColorClass: 'text-violet-600',
    screenshotIcon: Send,
    screenshotDescription: 'Customer portal — what your customer sees when they open your link',
  },
]

type ComplianceMapping = {
  captureIcon: LucideIcon
  captureLabel: string
  requirementLabel: string
}

const COMPLIANCE_MAPPING: ComplianceMapping[] = [
  {
    captureIcon: Camera,
    captureLabel: 'Photo per penetration',
    requirementLabel: 'Evidence of installation',
  },
  {
    captureIcon: Shield,
    captureLabel: 'FRL rating field',
    requirementLabel: 'Fire-resistance level proof',
  },
  {
    captureIcon: Package,
    captureLabel: 'Sealant + product code',
    requirementLabel: 'Material traceability',
  },
  {
    captureIcon: User,
    captureLabel: 'Installer + date',
    requirementLabel: 'Installer accountability',
  },
  {
    captureIcon: MapPin,
    captureLabel: 'Pin on floor plan',
    requirementLabel: 'Location records',
  },
  {
    captureIcon: Building2,
    captureLabel: 'Building → Level → Room',
    requirementLabel: 'Site hierarchy documented',
  },
]

const OUTCOMES = [
  {
    headline: 'Reports go out the day the job\'s done.',
    body: 'Photos, evidence, and floor plan pins compile automatically into the format you need. Hit Generate, send the link.',
  },
  {
    headline: 'Your customer stops chasing you for updates.',
    body: 'Magic-link portal. They check progress whenever they want, on any device. No phone calls, no email forwards.',
  },
  {
    headline: 'Compliance evidence is ready when the certifier asks.',
    body: 'Every penetration has FRL, sealant, installer, date, photo, and location. AS1851-shaped from the start.',
  },
]

export default function HowItWorksPage() {
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
            How it works
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Five steps from quote to paid.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Set up the job, plan the site, capture on the phone, generate the report, send
            the customer a link. Same flow every time. No paperwork at the end.
          </p>
        </div>
      </section>

      {/* ───────── WORKFLOW INFOGRAPHIC ───────── */}
      <section className="bg-slate-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="flex flex-col items-center gap-2 lg:flex-row lg:flex-1">
                <div
                  className={`flex w-full flex-1 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.iconBgClass}`}
                  >
                    <step.icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {step.number}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {step.title.replace(/\.$/, '').split(' ').slice(0, 2).join(' ')}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <ArrowRight
                    className="h-5 w-5 shrink-0 rotate-90 text-slate-300 lg:rotate-0"
                    strokeWidth={1.5}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 5 STEP SECTIONS ───────── */}
      {STEPS.map(step => {
        const Icon = step.icon
        const ScreenshotIcon = step.screenshotIcon
        return (
          <section
            key={step.number}
            className={`relative px-6 py-24 md:py-28 ${step.bgClass}`}
          >
            <div className="mx-auto max-w-6xl">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                {/* Text column */}
                <div className={step.reverseLayout ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.iconBgClass}`}
                    >
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      {step.label}
                    </p>
                  </div>

                  <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                    {step.title}
                  </h2>

                  <p className="mt-4 text-lg text-slate-600">{step.body}</p>

                  <ul className="mt-8 space-y-3">
                    {step.bullets.map(bullet => (
                      <li key={bullet} className="flex items-start gap-3">
                        <Check
                          className={`mt-0.5 h-5 w-5 shrink-0 ${step.iconColorClass}`}
                          strokeWidth={2.5}
                        />
                        <span className="text-base text-slate-700">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot placeholder column */}
                <div className={step.reverseLayout ? 'lg:order-1' : ''}>
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                      <ScreenshotIcon
                        className="h-8 w-8 text-slate-400"
                        strokeWidth={1.5}
                      />
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Screenshot slot
                      </p>
                      <p className="max-w-[28ch] text-sm text-slate-500">
                        {step.screenshotDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* ───────── COMPLIANCE CALLOUT (with AS1851 mapping) ───────── */}
      <section className="bg-emerald-50/60 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-700">
              Built for compliance
            </p>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              AS1851 from day one.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              The evidence model is shaped around what AS1851 actually requires. Every
              penetration captures exactly what a certifier needs to see.
            </p>
          </div>

          <div className="mt-16 rounded-2xl border border-emerald-100 bg-white p-8 md:p-12">
            <div className="grid grid-cols-1 gap-3 text-xs font-medium uppercase tracking-wider text-emerald-700 md:grid-cols-[1fr_auto_1fr] md:gap-6">
              <p>What you capture</p>
              <span aria-hidden className="hidden md:block" />
              <p>AS1851 requirement met</p>
            </div>

            <div className="mt-6 space-y-3">
              {COMPLIANCE_MAPPING.map(row => {
                const CaptureIcon = row.captureIcon
                return (
                  <div
                    key={row.captureLabel}
                    className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-6"
                  >
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                      <CaptureIcon
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm text-slate-700">
                        {row.captureLabel}
                      </span>
                    </div>
                    <ArrowRight
                      className="hidden h-4 w-4 justify-self-center text-emerald-400 md:block"
                      strokeWidth={2}
                    />
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                      <Check
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        strokeWidth={2.5}
                      />
                      <span className="text-sm text-slate-700">
                        {row.requirementLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── OUTCOMES BLOCK ───────── */}
      <section className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              What changes
            </p>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              The before-and-after, in plain words.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {OUTCOMES.map(outcome => (
              <div
                key={outcome.headline}
                className="rounded-2xl border border-slate-200 bg-white p-8"
              >
                <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900">
                  {outcome.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {outcome.body}
                </p>
              </div>
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
            No credit card. Run a real job through the whole flow before you decide.
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
              href="/pricing"
              className="inline-flex items-center gap-2 px-2 py-3.5 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
