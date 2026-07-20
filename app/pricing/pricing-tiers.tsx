'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

type Billing = 'monthly' | 'annual'

type Tier = {
  name: string
  description: string
  monthlyPrice: number | null
  annualPriceMonthly: number | null
  annualDiscount: string
  usersIncluded: number
  extraSeat: number
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
  enterprise?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    name: 'Starter',
    description: 'Solo operators getting started',
    monthlyPrice: 99,
    annualPriceMonthly: 84,
    annualDiscount: '15% off',
    usersIncluded: 2,
    extraSeat: 60,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup',
    features: [
      'Job scheduling & invoicing',
      'Mobile app for the field',
      'Customer portal (magic link)',
      'PDF, spreadsheet, Word reports',
      'Xero / MYOB integration',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    description: 'Small teams running real volume',
    monthlyPrice: 299,
    annualPriceMonthly: 254,
    annualDiscount: '15% off',
    usersIncluded: 5,
    extraSeat: 50,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup',
    highlight: true,
    features: [
      'Everything in Starter',
      'AS1851 compliance forms',
      'Floor plan pin mapping',
      'Job cost reporting',
      'Schedule with drag-drop',
      'Calendar sync (Apple, Google, Outlook)',
      'Xero invoice sync',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    description: 'Multi-crew operations',
    monthlyPrice: 749,
    annualPriceMonthly: 599,
    annualDiscount: '20% off',
    usersIncluded: 15,
    extraSeat: 45,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup',
    features: [
      'Everything in Pro',
      'Webhooks + public API',
      'Xero Payroll timesheet sync',
      '2 onboarding sessions',
      'Email distribution groups',
      'Phone support',
    ],
  },
  {
    name: 'Enterprise',
    description: 'Custom needs, custom terms',
    monthlyPrice: null,
    annualPriceMonthly: null,
    annualDiscount: 'Custom',
    usersIncluded: 30,
    extraSeat: 40,
    ctaLabel: 'Talk to us',
    ctaHref: '/contact-sales',
    enterprise: true,
    features: [
      'Everything in Business',
      'Custom compliance form builder',
      'Multi-branch / location support',
      'Dedicated account manager',
      'White-glove onboarding',
      'Custom SLA & contract',
    ],
  },
]

export function PricingTiers() {
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              billing === 'monthly'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling('annual')}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              billing === 'annual'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                billing === 'annual'
                  ? 'bg-white text-slate-900'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              Save up to 20%
            </span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map(tier => {
          const isAnnual = billing === 'annual'
          const displayPrice = isAnnual ? tier.annualPriceMonthly : tier.monthlyPrice

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                tier.highlight
                  ? 'border-2 border-blue-600 shadow-xl shadow-blue-600/10'
                  : 'border-slate-200'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}

              <p className="text-sm font-semibold tracking-tight text-slate-900">
                {tier.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">{tier.description}</p>

              <div className="mt-6">
                {tier.enterprise ? (
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    Custom
                  </p>
                ) : (
                  <>
                    <p className="text-3xl font-bold tracking-tight text-slate-900">
                      A${displayPrice}
                      <span className="text-sm font-medium text-slate-500">
                        /mo
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isAnnual
                        ? `Billed annually — ${tier.annualDiscount}`
                        : `Billed monthly`}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-5 space-y-1 border-t border-slate-100 pt-5">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-900">
                    {tier.usersIncluded} users
                  </span>{' '}
                  included
                </p>
                <p className="text-xs text-slate-500">
                  Extra seat: A${tier.extraSeat}/mo
                </p>
              </div>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-slate-100 pt-6 text-sm text-slate-600">
                {tier.features.map(feature => (
                  <li key={feature} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition ${
                  tier.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : tier.enterprise
                      ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {tier.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
