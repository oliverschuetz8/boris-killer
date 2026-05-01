'use client'

import { useState } from 'react'
import { FileDown, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react'

type ExportFormat = 'pdf' | 'spreadsheet' | 'document'
type DownloadStatus = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  jobId: string
  jobNumber: string
}

const EXPORTS: { id: ExportFormat; label: string; description: string; endpoint: string; filename: string; icon: typeof FileDown }[] = [
  {
    id: 'pdf',
    label: 'Download PDF Report',
    description: 'Full branded report with photos, evidence data, and floor plan close-ups',
    endpoint: '',
    filename: '-report.pdf',
    icon: FileDown,
  },
  {
    id: 'spreadsheet',
    label: 'Download Spreadsheet',
    description: 'Excel file with one row per penetration — filterable by level, room, and fields',
    endpoint: '/spreadsheet',
    filename: '-report.xlsx',
    icon: FileSpreadsheet,
  },
  {
    id: 'document',
    label: 'Download Document',
    description: 'Editable Word document — open in Google Docs or Microsoft Word',
    endpoint: '/document',
    filename: '-report.docx',
    icon: FileText,
  },
]

export default function ReportTab({ jobId, jobNumber }: Props) {
  const [statuses, setStatuses] = useState<Record<ExportFormat, DownloadStatus>>({
    pdf: 'idle',
    spreadsheet: 'idle',
    document: 'idle',
  })
  const [errors, setErrors] = useState<Record<ExportFormat, string>>({
    pdf: '',
    spreadsheet: '',
    document: '',
  })

  async function handleDownload(format: ExportFormat) {
    setStatuses(prev => ({ ...prev, [format]: 'loading' }))
    setErrors(prev => ({ ...prev, [format]: '' }))

    const exp = EXPORTS.find(e => e.id === format)!

    try {
      const response = await fetch(`/api/jobs/${jobId}/report${exp.endpoint}`)

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to generate report' }))
        throw new Error(err.error || 'Failed to generate report')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${jobNumber}${exp.filename}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatuses(prev => ({ ...prev, [format]: 'success' }))
      setTimeout(() => setStatuses(prev => ({ ...prev, [format]: 'idle' })), 3000)
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [format]: err.message || 'Something went wrong' }))
      setStatuses(prev => ({ ...prev, [format]: 'error' }))
    }
  }

  const includes = [
    'Company branding header & footer',
    'Job details & customer info',
    '4 penetrations per page (2×2 grid)',
    'Photo + evidence data per penetration',
    'Cropped floor plan close-up with pin location',
    'Grouped by building › level › room',
    'Materials used table',
    'Page numbers & generation date',
  ]

  return (
    <div className="mt-4">
      <div className="bg-white rounded-xl border border-slate-200 p-8">

        {/* Title + description */}
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Completion Report</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-lg">
          Export the job completion report in multiple formats. The PDF includes branded layouts with photos and floor plan close-ups.
        </p>

        {/* Export buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPORTS.map(exp => {
            const Icon = exp.icon
            const status = statuses[exp.id]
            const error = errors[exp.id]

            return (
              <div
                key={exp.id}
                className="border border-slate-200 rounded-lg p-5 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{exp.label.replace('Download ', '')}</span>
                </div>

                <p className="text-xs text-slate-500 mb-4 flex-1">{exp.description}</p>

                <button
                  onClick={() => handleDownload(exp.id)}
                  disabled={status === 'loading'}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Icon className="w-4 h-4" />
                      {exp.label}
                    </>
                  )}
                </button>

                {status === 'success' && (
                  <div className="flex items-center gap-2 mt-3 text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Downloaded</span>
                  </div>
                )}
                {status === 'error' && (
                  <div className="flex items-center gap-2 mt-3 text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">{error}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Report includes */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="pl-4 border-l-4 border-blue-500 mb-4">
            <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">PDF Report Includes</p>
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
