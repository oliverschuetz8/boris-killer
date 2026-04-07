'use client'

import { useState } from 'react'
import { FileDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  jobId: string
  jobNumber: string
}

export default function ReportTab({ jobId, jobNumber }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleDownload() {
    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch(`/api/jobs/${jobId}/report`)

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to generate report' }))
        throw new Error(err.error || 'Failed to generate report')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${jobNumber}-report.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong')
      setStatus('error')
    }
  }

  const includes = [
    'Company branding header',
    'Job details & customer info',
    'All rooms with done/pending status',
    'Penetrations with evidence photos',
    'Materials used per room',
    'Page numbers & generation date',
  ]

  return (
    <div className="mt-4">
      <div className="bg-white rounded-xl border border-slate-200 p-8">

        {/* Title + description */}
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Completion Report</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-lg">
          Generate a PDF report including job details, building structure, all penetrations with photos, and materials used.
        </p>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={status === 'loading'}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating PDF…
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Download PDF Report
            </>
          )}
        </button>

        {/* Feedback messages */}
        {status === 'success' && (
          <div className="flex items-center gap-2 mt-4 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Report downloaded successfully</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 mt-4 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{errorMsg}</span>
          </div>
        )}

        {/* Report includes */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="pl-4 border-l-4 border-blue-500 mb-4">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Report Includes</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {includes.map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
