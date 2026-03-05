'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { seedMaterialsFromPack } from '@/lib/services/materials'

interface Pack {
  id: string
  name: string
  work_types: string[]
}

const PACK_DESCRIPTIONS: Record<string, { icon: string; description: string }> = {
  'Passive Fire Protection': {
    icon: '🔥',
    description: 'Firestopping, penetration seals, fire doors. FRL/rating fields, compliance reporting.',
  },
  'HVAC': {
    icon: '❄️',
    description: 'Service, maintenance, install. Asset tags, fault codes, recurring jobs.',
  },
  'Electrical': {
    icon: '⚡',
    description: 'Circuits, testing, installs. Circuit IDs, test results, compliance checklists.',
  },
  'Plumbing': {
    icon: '🔧',
    description: 'Repairs, installs, maintenance. Fixture IDs, parts tracking, before/after.',
  },
  'Fire Services - Active': {
    icon: '🚨',
    description: 'Alarms, sprinklers, hydrants. Asset IDs, pass/fail, defect severity.',
  },
  'General Construction': {
    icon: '🏗️',
    description: 'Broad package for mixed trades. Minimal required fields, flexible.',
  },
  'Custom': {
    icon: '⚙️',
    description: 'Start with a basic list and configure your own work types.',
  },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'pack' | 'setting-up'>('pack')
  const [packs, setPacks] = useState<Pack[]>([])
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadPacks() {
      const { data, error } = await supabase
        .from('work_type_packs')
        .select('id, name, work_types')
        .order('is_default', { ascending: false })

      if (error) {
        setError('Failed to load industry packs')
        return
      }

      setPacks(data || [])
      // Pre-select default pack
      const defaultPack = data?.find(p => p.name === 'Passive Fire Protection')
      if (defaultPack) setSelectedPackId(defaultPack.id)
      setLoading(false)
    }
    loadPacks()
  }, [])

  async function handleContinue() {
    if (!selectedPackId) return
    setStep('setting-up')
    setError(null)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/login')
        return
      }

      const companyName = user.user_metadata.company_name
      const companySlug = user.user_metadata.company_slug
      const fullName = user.user_metadata.full_name

      if (!companyName || !companySlug) {
        setError('Missing company information. Please sign up again.')
        setStep('pack')
        return
      }

      // Create company
      const { data, error: rpcError } = await supabase.rpc('complete_signup', {
        user_id: user.id,
        company_name: companyName,
        company_slug: companySlug,
        full_name: fullName,
      })

      if (rpcError) {
        setError(`Setup failed: ${rpcError.message}`)
        setStep('pack')
        return
      }

      if (data?.error) {
        setError(`Setup failed: ${data.error}`)
        setStep('pack')
        return
      }

      // Set the selected industry pack
      if (data?.company_id) {
        await supabase
          .from('companies')
          .update({ work_type_pack_id: selectedPackId })
          .eq('id', data.company_id)
      }
      await seedMaterialsFromPack(data?.company_id, selectedPackId)

      router.push('/dashboard')
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`)
      setStep('pack')
    }
  }

  if (step === 'setting-up') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900">Setting up your account…</h1>
          <p className="text-gray-600 mt-2">This will only take a moment</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">What's your primary trade?</h1>
          <p className="text-gray-500 mt-2">
            This sets your default work types and photo fields. You can change it anytime in Settings.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pack grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {packs.map(pack => {
            const meta = PACK_DESCRIPTIONS[pack.name] || { icon: '📋', description: '' }
            const isSelected = selectedPackId === pack.id

            return (
              <button
                key={pack.id}
                onClick={() => setSelectedPackId(pack.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                      {pack.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview work types */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1.5">Work types included:</p>
                    <div className="flex flex-wrap gap-1">
                      {(pack.work_types as string[]).slice(0, 5).map(wt => (
                        <span key={wt} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {wt}
                        </span>
                      ))}
                      {(pack.work_types as string[]).length > 5 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          +{(pack.work_types as string[]).length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedPackId}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          Continue →
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can change your industry pack anytime in Settings
        </p>
      </div>
    </div>
  )
}