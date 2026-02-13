'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [connected, setConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Test connection
    supabase.from('_test').select('*').then(() => {
      setConnected(true)
    })
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          BORIS Killer - Setup Complete
        </h1>
        <p className="text-lg mb-2">
          Supabase: {connected ? '✅ Connected' : '⏳ Connecting...'}
        </p>
        <p className="text-sm text-gray-600">
          Ready to build the future of construction management
        </p>
      </div>
    </main>
  )
}
