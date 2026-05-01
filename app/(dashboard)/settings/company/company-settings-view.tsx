'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Upload, Trash2, Loader2, Check, AlertCircle, ChevronDown, Plus, Pencil, Shield,
} from 'lucide-react'
import {
  updateCompanySettings,
  uploadCompanyLogo,
  deleteCompanyLogo,
  addCompanyCredential,
  updateCompanyCredential,
  deleteCompanyCredential,
  type CompanySettings,
  type CompanyCredential,
} from '@/lib/services/company-settings'

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

interface Props {
  settings: CompanySettings
  logoUrl: string | null
  credentials: CompanyCredential[]
  userRole: string
}

export default function CompanySettingsView({ settings, logoUrl, credentials, userRole }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = userRole === 'admin'

  // Credentials state
  const [creds, setCreds] = useState<CompanyCredential[]>(credentials)
  const [newCredLabel, setNewCredLabel] = useState('')
  const [newCredValue, setNewCredValue] = useState('')
  const [addingCred, setAddingCred] = useState(false)
  const [showAddCred, setShowAddCred] = useState(false)
  const [editingCredId, setEditingCredId] = useState<string | null>(null)
  const [editCredLabel, setEditCredLabel] = useState('')
  const [editCredValue, setEditCredValue] = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const [credMsg, setCredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form state
  const [profile, setProfile] = useState({
    name: settings.name || '',
    abn: settings.abn || '',
    email: settings.email || '',
    phone: settings.phone || '',
    website: settings.website || '',
    address_line1: settings.address_line1 || '',
    address_line2: settings.address_line2 || '',
    city: settings.city || '',
    state: settings.state || '',
    postcode: settings.postcode || '',
    country: settings.country || 'Australia',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Branding form state
  const [colors, setColors] = useState({
    primary_color: settings.primary_color || '#2563eb',
    secondary_color: settings.secondary_color || '#1e293b',
  })
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoDeleting, setLogoDeleting] = useState(false)
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [brandingMsg, setBrandingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ─── Profile Save ─────────────────────────────────────────
  async function handleProfileSave() {
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await updateCompanySettings(profile)
      setProfileMsg({ type: 'success', text: 'Company profile updated.' })
      router.refresh()
    } catch (e: any) {
      setProfileMsg({ type: 'error', text: e.message })
    } finally {
      setProfileSaving(false)
    }
  }

  // ─── Logo Upload ──────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    setLogoUploading(true)
    setBrandingMsg(null)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      await uploadCompanyLogo(formData)
      setBrandingMsg({ type: 'success', text: 'Logo uploaded.' })
      router.refresh()
      // Refresh the page to get new signed URL
      window.location.reload()
    } catch (e: any) {
      setBrandingMsg({ type: 'error', text: e.message })
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoDelete() {
    if (!confirm('Remove the company logo?')) return
    setLogoDeleting(true)
    setBrandingMsg(null)
    try {
      await deleteCompanyLogo()
      setCurrentLogoUrl(null)
      setBrandingMsg({ type: 'success', text: 'Logo removed.' })
      router.refresh()
    } catch (e: any) {
      setBrandingMsg({ type: 'error', text: e.message })
    } finally {
      setLogoDeleting(false)
    }
  }

  // ─── Branding Save ────────────────────────────────────────
  async function handleBrandingSave() {
    setBrandingSaving(true)
    setBrandingMsg(null)
    try {
      await updateCompanySettings(colors)
      setBrandingMsg({ type: 'success', text: 'Brand colours updated.' })
      router.refresh()
    } catch (e: any) {
      setBrandingMsg({ type: 'error', text: e.message })
    } finally {
      setBrandingSaving(false)
    }
  }

  // ─── Credential Handlers ───────────────────────────────────
  async function handleAddCredential() {
    if (!newCredLabel.trim() || !newCredValue.trim()) return
    setAddingCred(true)
    setCredMsg(null)
    try {
      const cred = await addCompanyCredential(newCredLabel.trim(), newCredValue.trim())
      setCreds(prev => [...prev, cred])
      setNewCredLabel('')
      setNewCredValue('')
      setShowAddCred(false)
      setCredMsg({ type: 'success', text: 'Credential added.' })
    } catch (e: any) {
      setCredMsg({ type: 'error', text: e.message })
    } finally {
      setAddingCred(false)
    }
  }

  async function handleUpdateCredential(id: string) {
    if (!editCredLabel.trim() || !editCredValue.trim()) return
    setCredSaving(true)
    setCredMsg(null)
    try {
      await updateCompanyCredential(id, { label: editCredLabel.trim(), value: editCredValue.trim() })
      setCreds(prev => prev.map(c => c.id === id ? { ...c, label: editCredLabel.trim(), value: editCredValue.trim() } : c))
      setEditingCredId(null)
      setCredMsg({ type: 'success', text: 'Credential updated.' })
    } catch (e: any) {
      setCredMsg({ type: 'error', text: e.message })
    } finally {
      setCredSaving(false)
    }
  }

  async function handleDeleteCredential(id: string) {
    if (!confirm('Remove this credential?')) return
    setCredMsg(null)
    try {
      await deleteCompanyCredential(id)
      setCreds(prev => prev.filter(c => c.id !== id))
      setCredMsg({ type: 'success', text: 'Credential removed.' })
    } catch (e: any) {
      setCredMsg({ type: 'error', text: e.message })
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file)
    }
  }

  return (
    <div className="w-full px-8 py-8">

      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Company Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Company details, logo, ABN, and brand colours.
        </p>
      </div>

      {/* ── Company Profile Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Company Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              disabled={!isAdmin}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ABN</label>
            <input
              type="text"
              value={profile.abn}
              onChange={e => setProfile(p => ({ ...p, abn: e.target.value }))}
              disabled={!isAdmin}
              placeholder="e.g. 12 345 678 901"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              disabled={!isAdmin}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              disabled={!isAdmin}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
            <input
              type="url"
              value={profile.website}
              onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
              disabled={!isAdmin}
              placeholder="https://"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Address */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 1</label>
              <input
                type="text"
                value={profile.address_line1}
                onChange={e => setProfile(p => ({ ...p, address_line1: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 2</label>
              <input
                type="text"
                value={profile.address_line2}
                onChange={e => setProfile(p => ({ ...p, address_line2: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City / Suburb</label>
              <input
                type="text"
                value={profile.city}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
              <div className="relative">
                <select
                  value={profile.state}
                  onChange={e => setProfile(p => ({ ...p, state: e.target.value }))}
                  disabled={!isAdmin}
                  className="w-full appearance-none px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Select state</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Postcode</label>
              <input
                type="text"
                value={profile.postcode}
                onChange={e => setProfile(p => ({ ...p, postcode: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
              <input
                type="text"
                value={profile.country}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Save + feedback */}
        {isAdmin && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleProfileSave}
              disabled={profileSaving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
            {profileMsg && (
              <span className={`flex items-center gap-1.5 text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Licences & Credentials Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Licences & Credentials</h2>
            <p className="text-xs text-slate-500 mt-0.5">These appear on PDF reports and invoices.</p>
          </div>
          {isAdmin && !showAddCred && (
            <button
              onClick={() => setShowAddCred(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

        {/* Add new credential form */}
        {showAddCred && isAdmin && (
          <div className="flex items-end gap-3 mb-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
              <input
                type="text"
                value={newCredLabel}
                onChange={e => setNewCredLabel(e.target.value)}
                placeholder="e.g. QBCC Licence"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
              <input
                type="text"
                value={newCredValue}
                onChange={e => setNewCredValue(e.target.value)}
                placeholder="e.g. 15012345"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddCredential}
              disabled={addingCred || !newCredLabel.trim() || !newCredValue.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {addingCred ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => { setShowAddCred(false); setNewCredLabel(''); setNewCredValue('') }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Credentials list */}
        {creds.length === 0 && !showAddCred ? (
          <div className="text-center py-8">
            <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No licences or credentials added yet.</p>
            {isAdmin && (
              <p className="text-xs text-slate-400 mt-1">Add your QBCC licence, FPA membership, insurance details, etc.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {creds.map(cred => (
              <div key={cred.id} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                {editingCredId === cred.id ? (
                  <>
                    <input
                      type="text"
                      value={editCredLabel}
                      onChange={e => setEditCredLabel(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editCredValue}
                      onChange={e => setEditCredValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleUpdateCredential(cred.id)}
                      disabled={credSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {credSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingCredId(null)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-500">{cred.label}</span>
                      <p className="text-sm font-semibold text-slate-900 truncate">{cred.value}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCredId(cred.id); setEditCredLabel(cred.label); setEditCredValue(cred.value) }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(cred.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {credMsg && (
          <div className="mt-3">
            <span className={`flex items-center gap-1.5 text-sm ${credMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {credMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {credMsg.text}
            </span>
          </div>
        )}
      </div>

      {/* ── Branding Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Branding</h2>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">Company Logo</label>

          {currentLogoUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentLogoUrl}
                alt="Company logo"
                className="w-32 h-32 object-contain rounded-lg border border-slate-200 bg-slate-50 p-2"
              />
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    onClick={handleLogoDelete}
                    disabled={logoDeleting}
                    className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {logoDeleting ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          ) : isAdmin ? (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {logoUploading ? (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
              ) : (
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              )}
              <p className="text-sm text-slate-600 font-medium">
                {logoUploading ? 'Uploading…' : 'Click or drag to upload logo'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, or SVG. Recommended 512x512px.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No logo uploaded.</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(file)
              e.target.value = ''
            }}
          />
        </div>

        {/* Colours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Primary Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colors.primary_color}
                onChange={e => setColors(c => ({ ...c, primary_color: e.target.value }))}
                disabled={!isAdmin}
                className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer disabled:cursor-default p-0.5"
              />
              <input
                type="text"
                value={colors.primary_color}
                onChange={e => setColors(c => ({ ...c, primary_color: e.target.value }))}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Secondary Colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colors.secondary_color}
                onChange={e => setColors(c => ({ ...c, secondary_color: e.target.value }))}
                disabled={!isAdmin}
                className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer disabled:cursor-default p-0.5"
              />
              <input
                type="text"
                value={colors.secondary_color}
                onChange={e => setColors(c => ({ ...c, secondary_color: e.target.value }))}
                disabled={!isAdmin}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-2">Preview</label>
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: colors.primary_color }}
          >
            <div className="px-6 py-4 flex items-center gap-3">
              {currentLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentLogoUrl}
                  alt=""
                  className="w-8 h-8 object-contain rounded bg-white/20 p-0.5"
                />
              )}
              <span className="text-white font-semibold text-sm">
                {profile.name || 'Company Name'}
              </span>
            </div>
            <div
              className="px-6 py-2 text-xs"
              style={{ backgroundColor: colors.secondary_color, color: 'rgba(255,255,255,0.7)' }}
            >
              Report header preview
            </div>
          </div>
        </div>

        {/* Save + feedback */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleBrandingSave}
              disabled={brandingSaving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {brandingSaving ? 'Saving…' : 'Save Colours'}
            </button>
            {brandingMsg && (
              <span className={`flex items-center gap-1.5 text-sm ${brandingMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {brandingMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {brandingMsg.text}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
