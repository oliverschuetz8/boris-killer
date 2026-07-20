'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil, Plus, Star, Trash2, X, Phone, Mail, Briefcase, MapPin,
  Clock, FileText, Building2, User, ChevronDown, Pin, Eye, Info,
} from 'lucide-react'
import {
  createContact, updateContact, deleteContact,
  pinContactToJob, unpinContactFromJob,
  logCustomerActivity, deleteCustomerActivity,
} from '@/app/actions/customers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Timezone-independent date formatting (UTC) so server + client render the
// same string — avoids the hydration mismatch that bit the jobs list before.
function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const JOB_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ACCOUNT_STATUS_STYLES: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  dormant: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
}

const ROLE_OPTIONS = [
  'Decision-maker', 'Site contact', 'Accounts', 'Compliance',
  'Project manager', 'Estimator', 'Subcontractor', 'Other',
]

const CONTACT_METHOD_OPTIONS = ['Phone', 'Email', 'SMS']

const ACTIVITY_TYPE_OPTIONS = ['Note', 'Call', 'Email', 'Meeting']

function titleCase(s?: string | null) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

// ---------------------------------------------------------------------------
// Types (loose — matches the codebase's `any` customer style)
// ---------------------------------------------------------------------------

type AnyRec = Record<string, any>

interface Props {
  customer: AnyRec
  contacts: AnyRec[]
  jobs: AnyRec[]
  activity: AnyRec[]
  companyUsers: AnyRec[]
}

type TabKey = 'details' | 'jobs' | 'people' | 'sites' | 'activity'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomerHub({ customer, contacts, jobs, activity, companyUsers }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('details')

  const sites: AnyRec[] = customer.customer_sites || []
  const accountManager = companyUsers.find(u => u.id === customer.account_manager_id)

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'jobs', label: 'Jobs', count: jobs.length },
    { key: 'people', label: 'People', count: contacts.length },
    { key: 'sites', label: 'Sites', count: sites.length },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div className="w-full px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/customers" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
            ← Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
            {customer.account_status && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ACCOUNT_STATUS_STYLES[customer.account_status] || 'bg-slate-100 text-slate-600'}`}>
                {titleCase(customer.account_status)}
              </span>
            )}
          </div>
          {customer.account_type && (
            <p className="text-sm text-slate-500 mt-1 capitalize">{titleCase(customer.account_type)}</p>
          )}
        </div>
        <Link
          href={`/customers/${customer.id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Edit customer
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'details' && (
        <DetailsTab customer={customer} accountManager={accountManager} />
      )}
      {tab === 'jobs' && <JobsTab jobs={jobs} />}
      {tab === 'people' && (
        <PeopleTab customer={customer} contacts={contacts} jobs={jobs} onChange={() => router.refresh()} />
      )}
      {tab === 'sites' && <SitesTab sites={sites} />}
      {tab === 'activity' && (
        <ActivityTab customer={customer} activity={activity} jobs={jobs} onChange={() => router.refresh()} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Details tab
// ---------------------------------------------------------------------------

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-900">{value || '—'}</p>
    </div>
  )
}

// Small click-to-open info tooltip for labels that need a one-line explanation.
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600"
        aria-label="More info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-20 w-56 rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-lg leading-snug">
          {text}
        </span>
      )}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

function DetailsTab({ customer, accountManager }: { customer: AnyRec; accountManager?: AnyRec }) {
  const billingParts = [customer.billing_city, customer.billing_state, customer.billing_postcode].filter(Boolean).join(', ')
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Account">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Account type" value={titleCase(customer.account_type)} />
          <Field label="Status" value={titleCase(customer.account_status)} />
          <Field label="ABN" value={customer.abn} />
          <Field label="Payment terms" value={customer.payment_terms} />
        </div>
      </Card>

      <Card title="Primary contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" value={customer.email} />
          <Field label="Phone" value={customer.phone} />
        </div>
      </Card>

      <Card title="Billing">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field
              label="Billing address"
              value={customer.billing_address_line1
                ? <>{customer.billing_address_line1}{billingParts ? <><br />{billingParts}</> : null}</>
                : undefined}
            />
          </div>
          <Field label="Accounts email" value={customer.accounts_email} />
          <Field label="Accounts phone" value={customer.accounts_phone} />
        </div>
      </Card>

      <Card title="Relationship">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              Managed by
              <InfoTip text="The person on your team responsible for this customer — your internal owner of the relationship." />
            </p>
            <p className="text-sm text-slate-900">{accountManager ? (accountManager.full_name || accountManager.email) : '—'}</p>
          </div>
          <Field label="Last contacted" value={customer.last_contacted_at ? fmtDate(customer.last_contacted_at) : undefined} />
          <Field label="Next follow-up" value={customer.next_followup_date ? fmtDate(customer.next_followup_date) : undefined} />
        </div>
      </Card>

      {customer.notes && (
        <div className="lg:col-span-2">
          <Card title="Notes">
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{customer.notes}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Jobs tab
// ---------------------------------------------------------------------------

function JobsTab({ jobs }: { jobs: AnyRec[] }) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No jobs for this customer yet.</p>
        <Link href="/jobs/new" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Create a job</Link>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                  {job.job_number || '—'}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{job.title || '—'}</td>
              <td className="px-6 py-4">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${JOB_STATUS_STYLES[job.status] || 'bg-slate-100 text-slate-600'}`}>
                  {titleCase(job.status)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{fmtDate(job.scheduled_start)}</td>
              <td className="px-6 py-4 text-right text-sm">
                <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800">Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// People tab
// ---------------------------------------------------------------------------

const FLAG_LABELS: { key: string; label: string }[] = [
  { key: 'receives_reports', label: 'Reports' },
  { key: 'receives_quotes', label: 'Quotes' },
  { key: 'approves_work', label: 'Approves' },
  { key: 'site_access', label: 'Site access' },
]

function PeopleTab({ customer, contacts, jobs, onChange }: { customer: AnyRec; contacts: AnyRec[]; jobs: AnyRec[]; onChange: () => void }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AnyRec | null>(null)

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(c: AnyRec) { setEditing(c); setModalOpen(true) }

  async function handleDelete(c: AnyRec) {
    if (!confirm(`Remove ${c.name} from this customer's people? This can't be undone.`)) return
    try {
      await deleteContact(c.id, customer.id)
      onChange()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't remove this contact. Refresh the page and try again.")
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <User className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No people added yet.</p>
          <p className="text-slate-400 text-xs mt-1">Add the key people at this customer — who approves work, who gets reports, who lets you on site.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contacts.map(c => (
            <ContactCard
              key={c.id}
              contact={c}
              customerId={customer.id}
              jobs={jobs}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c)}
              onChange={onChange}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <ContactModal
          customerId={customer.id}
          contact={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); onChange() }}
        />
      )}
    </div>
  )
}

function ContactCard({ contact, customerId, jobs, onEdit, onDelete, onChange }: {
  contact: AnyRec; customerId: string; jobs: AnyRec[]; onEdit: () => void; onDelete: () => void; onChange: () => void
}) {
  const [pinJobId, setPinJobId] = useState('')
  const pinned: AnyRec[] = contact.job_contacts || []
  const pinnedJobIds = new Set(pinned.map(p => p.job_id))
  const availableJobs = jobs.filter(j => !pinnedJobIds.has(j.id))

  async function handlePin() {
    if (!pinJobId) return
    try {
      await pinContactToJob(contact.id, pinJobId, customerId)
      setPinJobId('')
      onChange()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't pin this person to the job. Refresh the page and try again.")
    }
  }

  async function handleUnpin(jc: AnyRec) {
    try {
      await unpinContactFromJob(jc.id, customerId)
      onChange()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't unpin this person. Refresh the page and try again.")
    }
  }

  return (
    <div className={`bg-white rounded-xl border p-5 ${contact.is_active === false ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {contact.is_primary && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
            <h3 className="text-sm font-semibold text-slate-900 truncate">{contact.name}</h3>
            {contact.is_active === false && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">Inactive</span>
            )}
          </div>
          {(contact.job_title || contact.role) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {[contact.job_title, contact.role].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <button onClick={onEdit} className="text-slate-400 hover:text-blue-600" title="Edit contact">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-slate-400 hover:text-red-600" title="Remove contact">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact methods */}
      <div className="mt-3 space-y-1.5">
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
            {contact.secondary_phone && <span className="text-slate-400">· {contact.secondary_phone}</span>}
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">{contact.email}</a>
          </div>
        )}
        {contact.preferred_contact_method && (
          <p className="text-xs text-slate-400">Prefers {contact.preferred_contact_method.toLowerCase()}</p>
        )}
      </div>

      {/* Flags */}
      {(FLAG_LABELS.some(f => contact[f.key]) || contact.worker_visible) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FLAG_LABELS.filter(f => contact[f.key]).map(f => (
            <span key={f.key} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {f.label}
            </span>
          ))}
          {contact.worker_visible && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              <Eye className="w-3 h-3" /> Tradies can see
            </span>
          )}
        </div>
      )}

      {contact.notes && (
        <p className="mt-3 text-xs text-slate-500 whitespace-pre-wrap border-t border-slate-100 pt-3">{contact.notes}</p>
      )}

      {/* Pinned jobs */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Pin className="w-3 h-3" /> Jobs
        </p>
        {pinned.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pinned.map(jc => (
              <span key={jc.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                <Link href={`/jobs/${jc.job_id}`} className="hover:text-blue-600">
                  {jc.jobs?.job_number || jc.jobs?.title || 'Job'}
                </Link>
                <button onClick={() => handleUnpin(jc)} className="text-slate-400 hover:text-red-600" title="Unpin">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {availableJobs.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={pinJobId}
                onChange={e => setPinJobId(e.target.value)}
                className="w-full appearance-none px-3 py-1.5 pr-9 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pin to a job…</option>
                {availableJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.job_number} — {j.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            <button
              onClick={handlePin}
              disabled={!pinJobId}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Pin
            </button>
          </div>
        ) : pinned.length === 0 ? (
          <p className="text-xs text-slate-400">No jobs to pin yet.</p>
        ) : null}
      </div>
    </div>
  )
}

function Checkbox({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )
}

function ContactModal({ customerId, contact, onClose, onSaved }: {
  customerId: string; contact: AnyRec | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    job_title: contact?.job_title || '',
    role: contact?.role || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    secondary_phone: contact?.secondary_phone || '',
    preferred_contact_method: contact?.preferred_contact_method || '',
    receives_reports: contact?.receives_reports ?? false,
    receives_quotes: contact?.receives_quotes ?? false,
    approves_work: contact?.approves_work ?? false,
    site_access: contact?.site_access ?? false,
    worker_visible: contact?.worker_visible ?? false,
    is_primary: contact?.is_primary ?? false,
    is_active: contact?.is_active ?? true,
    notes: contact?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function handleSave() {
    if (!form.name.trim()) { setError('A contact needs a name. Add a name and try again.'); return }
    setSaving(true); setError(null)
    try {
      if (contact) {
        await updateContact(contact.id, customerId, form)
      } else {
        await createContact(customerId, form)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this contact. Check the form and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">{contact ? 'Edit contact' : 'Add contact'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Dave Thompson" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Job title</label>
              <input value={form.job_title} onChange={e => set('job_title', e.target.value)} className={inputCls} placeholder="e.g. Facilities Manager" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <div className="relative">
                <select value={form.role} onChange={e => set('role', e.target.value)} className={`${inputCls} appearance-none pr-10 bg-white`}>
                  <option value="">Select…</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="04XX XXX XXX" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Secondary phone</label>
              <input type="tel" value={form.secondary_phone} onChange={e => set('secondary_phone', e.target.value)} className={inputCls} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred contact</label>
              <div className="relative">
                <select value={form.preferred_contact_method} onChange={e => set('preferred_contact_method', e.target.value)} className={`${inputCls} appearance-none pr-10 bg-white`}>
                  <option value="">No preference</option>
                  {CONTACT_METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">This person…</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <Checkbox name="receives_reports" label="Receives reports" checked={form.receives_reports} onChange={v => set('receives_reports', v)} />
              <Checkbox name="receives_quotes" label="Receives quotes" checked={form.receives_quotes} onChange={v => set('receives_quotes', v)} />
              <Checkbox name="approves_work" label="Approves work" checked={form.approves_work} onChange={v => set('approves_work', v)} />
              <Checkbox name="site_access" label="Grants site access" checked={form.site_access} onChange={v => set('site_access', v)} />
              <Checkbox name="is_primary" label="Primary contact" checked={form.is_primary} onChange={v => set('is_primary', v)} />
              <Checkbox name="is_active" label="Active" checked={form.is_active} onChange={v => set('is_active', v)} />
            </div>
          </div>

          {/* Tradie visibility — separate because it controls what the field crew sees */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Checkbox
              name="worker_visible"
              label="Tradies can see this contact"
              checked={form.worker_visible}
              onChange={v => set('worker_visible', v)}
            />
            <p className="text-xs text-slate-500 mt-1.5 ml-6">
              On: tradies assigned to a job this contact is pinned to can see their name + phone (e.g. the electrician).
              Off: office-only — the crew never sees them.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Anything specific to this person…" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sites tab
// ---------------------------------------------------------------------------

function SitesTab({ sites }: { sites: AnyRec[] }) {
  if (sites.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No sites on file for this customer.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sites.map(s => {
        const addr = [s.city, s.state, s.postcode].filter(Boolean).join(', ')
        return (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">{s.site_name || s.address_line1 || 'Site'}</h3>
                {s.address_line1 && <p className="text-sm text-slate-600 mt-0.5">{s.address_line1}</p>}
                {addr && <p className="text-sm text-slate-500">{addr}</p>}
                {(s.site_manager_name || s.site_manager_phone) && (
                  <p className="text-xs text-slate-500 mt-2">
                    Site manager: {[s.site_manager_name, s.site_manager_phone].filter(Boolean).join(' · ')}
                  </p>
                )}
                {s.access_instructions && (
                  <p className="text-xs text-slate-500 mt-1">Access: {s.access_instructions}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------

function ActivityTab({ customer, activity, jobs, onChange }: { customer: AnyRec; activity: AnyRec[]; jobs: AnyRec[]; onChange: () => void }) {
  const [type, setType] = useState('Note')
  const [description, setDescription] = useState('')
  const [contactedToday, setContactedToday] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Merge manual activity entries with derived "job created" events, newest first.
  const timeline = useMemo(() => {
    const manual = activity.map(a => ({
      id: a.id,
      kind: 'manual' as const,
      type: a.activity_type,
      description: a.description,
      at: a.occurred_at,
    }))
    const jobEvents = jobs.map(j => ({
      id: `job-${j.id}`,
      kind: 'job' as const,
      type: 'Job created',
      description: `${j.job_number || 'Job'} — ${j.title || ''}`.trim(),
      at: j.created_at,
      jobId: j.id,
    }))
    return [...manual, ...jobEvents].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [activity, jobs])

  async function handleAdd() {
    if (!description.trim()) { setError('Add a short note before saving.'); return }
    setSaving(true); setError(null)
    try {
      await logCustomerActivity(customer.id, {
        activity_type: type,
        description: description.trim(),
        markContactedToday: contactedToday,
      })
      setDescription('')
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this activity. Try again or refresh the page.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this activity entry?')) return
    try {
      await deleteCustomerActivity(id, customer.id)
      onChange()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't remove this entry. Refresh the page and try again.")
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Log form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Log activity</h2>
          <div className="space-y-3">
            <div className="relative">
              <select value={type} onChange={e => setType(e.target.value)} className={`${inputCls} appearance-none pr-10 bg-white`}>
                {ACTIVITY_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="What happened? e.g. Called Dave re: annual inspection quote."
            />
            <Checkbox name="contacted" label="Mark contacted today" checked={contactedToday} onChange={setContactedToday} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add entry'}
            </button>
          </div>
          {customer.last_contacted_at && (
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Last contacted {fmtDate(customer.last_contacted_at)}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="lg:col-span-2">
        {timeline.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No activity yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {timeline.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.kind === 'job' ? 'bg-blue-50' : 'bg-slate-100'}`}>
                  {item.kind === 'job'
                    ? <Briefcase className="w-4 h-4 text-blue-600" />
                    : <FileText className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.type}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-400">{fmtDate(item.at)}</span>
                      {item.kind === 'manual' && (
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-600" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.description && <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
