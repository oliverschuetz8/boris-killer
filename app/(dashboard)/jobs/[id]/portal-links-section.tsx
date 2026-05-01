'use client'

import { useState, useEffect } from 'react'
import { Link2, Copy, Check, XCircle, Plus, ExternalLink, Loader2 } from 'lucide-react'
import { generatePortalLink, revokePortalLinkAction } from '@/app/actions/portal'
import type { PortalLink } from '@/lib/services/portal'

interface Props {
  jobId: string
  companyId: string
  initialLinks: PortalLink[]
}

export default function PortalLinksSection({ jobId, companyId, initialLinks }: Props) {
  const [links, setLinks] = useState<PortalLink[]>(initialLinks)
  const [generating, setGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const activeLinks = links.filter(l => !l.is_revoked && new Date(l.expires_at) > new Date())
  const expiredOrRevoked = links.filter(l => l.is_revoked || new Date(l.expires_at) <= new Date())

  async function handleGenerate() {
    setGenerating(true)
    try {
      const link = await generatePortalLink(jobId, companyId)
      setLinks(prev => [link, ...prev])
    } catch (err) {
      alert('Failed to generate portal link')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke(linkId: string) {
    if (!confirm('Revoke this portal link? The customer will no longer be able to access it.')) return
    setRevokingId(linkId)
    try {
      await revokePortalLinkAction(linkId, jobId)
      setLinks(prev =>
        prev.map(l => l.id === linkId ? { ...l, is_revoked: true } : l)
      )
    } catch {
      alert('Failed to revoke link')
    } finally {
      setRevokingId(null)
    }
  }

  function copyToClipboard(token: string, linkId: string) {
    const url = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Customer Portal
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Generate Link
        </button>
      </div>

      {activeLinks.length === 0 && expiredOrRevoked.length === 0 && (
        <p className="text-xs text-slate-400">
          No portal links yet. Generate one to share with your customer.
        </p>
      )}

      {/* Active links */}
      {activeLinks.map(link => (
        <div
          key={link.id}
          className="border border-slate-200 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </span>
            <span className="text-xs text-slate-400">
              Expires {new Date(link.expires_at).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => copyToClipboard(link.token, link.id)}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors truncate"
            >
              {copiedId === link.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-green-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">/portal/{link.token.slice(0, 8)}...</span>
                </>
              )}
            </button>

            <a
              href={`/portal/${link.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors flex-shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => handleRevoke(link.id)}
              disabled={revokingId === link.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50 flex-shrink-0"
              title="Revoke link"
            >
              {revokingId === link.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      ))}

      {/* Expired/revoked links */}
      {expiredOrRevoked.length > 0 && (
        <div className="space-y-1.5">
          {expiredOrRevoked.map(link => (
            <div
              key={link.id}
              className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
            >
              <span className="text-xs text-slate-400 line-through">
                /portal/{link.token.slice(0, 8)}...
              </span>
              <span className="text-xs text-slate-400">
                {link.is_revoked ? 'Revoked' : 'Expired'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
