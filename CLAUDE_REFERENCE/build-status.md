# 05 — Current Project State

Last Updated: 8 May 2026 (In-app messaging & notifications parked — not building pre-launch; revisit only on customer demand) | Project: AUTONYX (codename: BORIS Killer) | Status: Active MVP (~98% complete, launch-ready feature set)

---

## Completed Components

### Infrastructure & Setup
- Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL + auth + RLS + storage bucket: job-photos)
- GitHub + Vercel auto-deployment working
- Claude Code with Supabase MCP, GitHub MCP, Vercel MCP connected
- osxkeychain configured for GitHub credentials
- Multi-tenant architecture with company_id on every table

### Authentication
- Login + signup pages complete
- Two-phase signup: user created first, then company linked
- RLS policies on all tables
- Email confirmation disabled for dev (re-enable before launch)

### Jobs Module
- Full CRUD with job number auto-generation
- Job detail page with tabs: Overview, Evidence, Materials, Structure, Setup, Cost, Report
- Setup tab (admin/manager only): worker assignments, evidence fields, job materials setup — moved out of edit page
- Job edit page: title, description, schedule, status, priority, job type, site details, notes
- Job type field: installation, maintenance, inspection (default: installation) — badge on detail page and worker today view
- Status: draft, scheduled, in_progress, on_hold, completed, cancelled
- Priority: low, normal, high, urgent
- Jobs list with unified search + filter popover (status, priority, customer, scheduled bucket — Today/This week/Upcoming/Past/Unscheduled); old status pill row replaced

### Worker Execute Page
- Start Job with timestamp
- Location picker: building → level → room
- Penetration logging with evidence fields and photos
- Camera vs gallery separate inputs (camera single, gallery allows multiple selection)
- Large photo preview (4:3 ratio) before saving — worker checks quality first
- Materials logged per room (not per job)
- Mark room done — blocked until materials are filled in
- Room done status persists after page reload
- Full job overview: building → level → room → penetrations drill-down

### Floor Plan Drawings with Pin Mapping
- Admin uploads floor plan drawings per level (stored in job-photos bucket)
- Workers see the correct drawing when selecting a building + level
- Workers place pins on the drawing to mark exact penetration locations
- Free-text pin labels (e.g. 1, 1.1, A1, B-2) — not auto-numbered
- Cumulative pins: all existing pins visible while placing a new one, scoped per level
- Zoom & pan: mouse wheel zoom toward cursor (captures scroll — no page scroll while zooming), click-drag pan, pinch-to-zoom on mobile
- Zoom constrained: min 1x (can't shrink below original size), max 5x; pan boundaries keep at least 20% of drawing visible on all edges
- Zoom-to-cursor: scroll wheel zooms exactly where the mouse cursor points (atomic state update — scale + translate in single useState to prevent drift)
- Pin scaling on zoom: pins scale inversely with zoom level (effectivePinSize = pinSize / scale, min 8px). Badge text and label also scale proportionally. Manual pin size +/- controls still adjust the base size.
- Pin size +/- controls, hide/show pins toggle
- Tap existing pin → action menu: Edit, Move, Delete
- "View Drawing" button opens full-screen drawings-only modal with all pins + interactive actions
- Evidence tab shows pins on floor plan with correct labels
- Database: floorplan_label column on penetrations table, percentage-based coordinates (0-100%)

### Building Structure (Admin)
- Admin sets up: buildings → levels → rooms
- Collapsed by default, drill-down on click with chevron rotation
- Colour-coded levels with left border indicator (6 cycling colours)
- Room done tracking via is_done boolean field
- Add/delete buildings, levels, rooms

### Evidence Tab (Admin)
- Drill-down: building → level → room → penetrations
- Field values shown with correct labels (not raw UUIDs)
- Admin can delete individual penetrations and photos
- Photo lightbox for full-size view
- Unassigned section for penetrations without location data

### Customer Portal (Magic Link)
- Token-based read-only portal for customers — no login required
- Portal route at /portal/[token] — outside dashboard layout, no auth needed
- Magic link with 30-day expiry and admin revoke capability
- Shows job info, evidence drill-down (building → level → room → penetrations), photos, floor plan drawings with pins
- Pin interaction: customers can tap pins on floor plan to see penetration details
- Floor plan drawings shown as standalone section — always visible, no clicking needed
- Photo lightbox for full-size view
- Mobile-responsive layout (max-w-4xl centered)
- Admin controls on job detail sidebar: generate link, copy URL, open in new tab, revoke
- SECURITY DEFINER PostgreSQL functions bypass RLS for unauthenticated access
- Server-side signed URL generation for all photos and drawings
- Service role admin client (lib/supabase/admin.ts) for portal data fetching

### Evidence Fields (Admin per job)
- Field types: text, dropdown, structure_level
- Required toggle, reorder with up/down arrows, delete
- Type + Required badges aligned right next to delete button
- Optional default answer per field (pre-fills worker form, worker can change it)

### Worker Assignments
- Assign multiple workers to a job from Setup tab on job detail page
- Workers only see their assigned jobs in the jobs list
- Unassign button per worker, shown on job detail Overview tab

### Parts Catalogue (/settings/parts)
- Admin CRUD for individual parts with buy cost, sell price, margin, supplier, part number, subcategory
- Search across name / SKU / supplier / subcategory + filter popover (subcategory + supplier) via shared `<SearchFilter>` component
- Bulk edit: select multiple parts → change margin, sell price, or supplier for all selected
- Smart naming suggestions when adding new parts
- Import from Legacy button migrates old materials table rows to parts
- Units: each, box, tube, metre, litre, bag, roll, sheet
- Soft delete (is_active = false)
- Full width admin layout with back arrow to /settings

### Products Catalogue (/settings/products)
- Admin creates product bundles (e.g. "Fire Collar Kit - 110mm")
- Each product contains parts with quantities
- Auto-calculated total buy cost, sell price, margin from component parts
- Expand/collapse to view and manage parts within each product
- Add/remove parts, edit quantities inline
- Soft delete (is_active = false)

### Materials Catalogue (/settings/materials) — Legacy
- Old flat materials list (name, unit, unit_price) — superseded by Parts & Products
- Removed from settings page navigation (still accessible directly)

### Pay Rules (/settings/pay-rules)
- PKG-BCGO: Building & Construction General On-site (MA000020)
- PKG-ELEC: Electrical (MA000025)
- PKG-JOIN: Joinery and Building Trades (MA000029)
- PKG-PLUMB-MECH: Plumbing (MA000036)
- PKG-PLUMB-SPRINKLER: Fire Sprinkler Fitting (MA000036)
- PKG-CRANE: Mobile Crane Hiring (MA000032)
- PKG-PREMIX: Premixed Concrete (MA000057)
- Employment type: full-time, part-time, casual
- Live rate preview table updates as you type base rate
- Full overtime calculation engine in lib/services/pay-calculator.ts

### Team Page (/settings/team)
- Invite team members, edit trade and base hourly rate
- Dynamic role badge colours (deterministic hash for any role name)
- Admin can update other users (RLS policy fixed)

### Dashboard (Step 1 - Claude Code)
- Real stats: active jobs, completed this month, workers, revenue
- Recent jobs list with customer, status, assigned workers

### Dashboard Charts & Visualisations (Step 2 - Claude Code)
- Recharts library for modern, clean charts
- Job Status donut chart (colour-coded by status with legend and total count)
- Completion Rate bar chart (last 6 months, green bars)
- Revenue Summary mini cards (Draft/Sent/Paid/Overdue with colour-coded totals)
- Jobs Per Worker horizontal bar chart (top 10 workers)
- Empty states with muted icons when no data
- All charts in white rounded cards matching existing design system

### Job Cost Report + Invoicing (Step 2 - Claude Code)
- Cost tab: materials breakdown with buy cost, sell price, margin; labour breakdown; 4 summary cards (Materials Sell, Materials Cost, Labour, Total)
- Generate Invoice button on cost tab
- /invoices list page with search, status filter, summary cards (Draft/Sent/Overdue/Paid)
- /invoices/[id] detail page with line items, GST (10%), totals, sidebar
- Invoice number auto-generation: INV-YEAR-NNN
- Status actions: Mark as Sent, Mark as Paid, Cancel, Delete

### Xero OAuth + Invoice Sync
- Xero OAuth 2.0 with PKCE flow (connect/callback/disconnect API routes)
- Admin connects Xero once in Settings > Integrations
- Push invoices to Xero as draft (button on invoice detail page)
- Pull timesheets from Xero Payroll AU API into job_time_entries
- Hybrid timesheet-to-job mapping: auto-map via tracking categories, manual assign queue for unmatched
- Sync employee pay rates from Xero → labour rate parts (buy_cost = Xero rate)
- Labour rate parts: subcategory "Labour", unit "hour", buy_cost/sell_price/margin like materials
- Job cost tab uses buy_cost (actual cost), invoices use sell_price (with margin)
- Token auto-refresh when within 5 minutes of expiry
- Unassigned hours queue on integrations page (assign to job or ignore)

### Webhook System + Public API Keys
- Per-company webhook subscriptions at /settings/webhooks (admin/manager)
- HMAC-SHA256 signed payloads with X-Webhook-Signature header
- Events: job.created, job.completed, job.status_changed, job.assigned, invoice.created, invoice.status_changed, invoice.overdue, hours.submitted, room.completed, lead.created, webhook.test
- Add/edit/delete webhooks with URL, event selection, description
- Toggle active/paused, test button, failure count tracking
- Webhook delivery log with event, status code, success/fail, timestamp
- Per-company API keys (admin only) with SHA-256 hash storage, one-time key display
- Public REST API at /api/v1/ (jobs list/detail, invoices list/detail, leads create/list) authenticated via Bearer token
- Non-blocking fire-and-forget webhook delivery from server actions (createJob, updateJobStatus, createInvoiceFromJob, updateInvoiceStatus, syncTimesheets)

### Website-to-App Lead Tracking
- Leads table with full lifecycle: new → contacted → qualified → proposal → converted → lost
- Admin lead management UI at /leads (admin/manager only) with nav link
- 5 stat cards: Total, New, Qualified, Converted, Conversion Rate
- Filter by search, status, source with full-width admin layout
- Add/edit/delete leads with modal forms
- Auto-sets converted_at timestamp when status changes to 'converted'
- Public API: POST /api/v1/leads (create lead via API key auth, fires lead.created webhook)
- Public API: GET /api/v1/leads (list leads via API key auth, optional status/limit filters)
- Service layer in lib/services/leads.ts with getLeads, getLeadStats, createLead, updateLead, deleteLead

### Company Settings & Branding
- Company settings page at /settings/company (admin/manager view, admin edit)
- Company logo upload with preview (stored in job-photos bucket at {company_id}/branding/logo.png)
- Brand colours: primary + secondary colour pickers
- Company details: name, email, phone, address (line1/line2, city, state, postcode, country), ABN, website
- Licences & Credentials system: admin adds custom label+value pairs (e.g. "QBCC Licence: 12345", "FPA Member: FM-001")
- Credentials stored in company_credentials table with display_order for consistent ordering
- PDF report footer: professional branded footer on every page — company logo, name, ABN, contact details on left; credentials on right; accent-coloured top border; job number + page count at bottom
- Report API route passes company branding + credentials to PDF renderer
- Service layer in lib/services/company-settings.ts (getCompanySettings, updateCompanySettings, uploadCompanyLogo, deleteCompanyLogo, getCompanyLogoUrl, CRUD for credentials)

### Evidence Field Categories & Default Questions (Per-Penetration Subcategories)
- Two main job categories: Certification and Inspection (evidence_categories table)
- Multiple subcategories per category (evidence_subcategories table, e.g. "Penetration Sealing", "Fire Collar", "Fire Door")
- Default template questions per subcategory (evidence_template_fields table) — workers see automatically
- Admin picks only category at job level (create/edit); worker picks subcategory per penetration
- Subcategory dropdown shown as first field ("Type") in penetration form during execution
- Template fields load dynamically based on worker's subcategory selection
- Different penetrations in the same job can have different subcategories and different questions
- Admin can still add custom questions via Setup tab (job_evidence_fields) — apply to all penetrations
- Field values stored in penetration's field_values JSON with IDs from both template fields and custom fields
- Evidence tab and penetration list resolve labels from both sources
- Penetration list shows subcategory name + pin label (e.g. "Penetration 1.2", "Fire Door 1.3")
- Database: evidence_subcategory_id column added to penetrations table

### Dedicated Drawings Tab
- Floor plan drawings moved from Structure tab to a dedicated "Drawings" tab on job detail page
- Upload and view drawings with pins in the Drawings tab
- Structure tab now focused on building/level/room management only
- Floor plan zoom constrained: minimum zoom 1x, symmetric pan boundaries on all four sides prevent losing the drawing off-screen
- Scroll-to-zoom captures scroll event: mouse wheel only zooms when cursor is over the drawing, page does not scroll simultaneously
- Pin detail panel: clicking a pin on the Drawings tab shows full penetration details below the floor plan — evidence field question/answer pairs, all photos (clickable lightbox), subcategory badge, room name, timestamp

### Partial/Progress Invoicing + Invoice Creation from Invoices Page
- Multiple invoices per job over time (progress billing for big jobs that need monthly invoicing instead of one giant final invoice)
- "+ New Invoice" button on `/invoices` page (was previously only generatable from inside a job's Cost tab — both paths now coexist)
- Modal with two-stage flow: Stage 1 pick-a-job (searchable list with job number, title, customer, total job value, amount already invoiced, count, remaining), Stage 2 scope tabs (Full job / Partial — progress)
- Full job path: same auto-pull as before (materials + labour). Shows amber double-billing warning if prior invoices exist; admin must confirm.
- Partial / progress path: scope label (e.g. "First month", "Progress to 30 April"), date range picker ("Bill from / Bill to") with smart defaults, "Pull billables for this period" button auto-fills line items from materials + labour logged in that period, admin can edit/add/remove rows, live GST totals
- Smart defaults: suggested start = day after last invoice's period end (or job start if no prior invoices), suggested end = today
- Job timeline panel in the partial form: shows scheduled start → scheduled end (or actual_start/actual_end if available with "Started/Completed" labels) so admin/worker doesn't have to look up the job
- Pull billables: materials filtered by `created_at` in date range (Sydney TZ-aware bounds), labour from `job_time_entries.date` (assigned status only); uses parts/products sell_price for materials and labour-rate-part sell_price for labour (matches what `createInvoiceFromJob` produces for full invoices)
- Validation: scope label required, at least one valid line (description + qty > 0 + unit_price ≥ 0), confirmation prompt before pull replaces existing user-entered rows
- Invoicing progress panel on job cost tab: invoiced / remaining (ex-GST), thin progress bar, list of prior invoices linkable to detail page, dual buttons "Generate Full Invoice" + "New Partial Invoice" (partial opens same form in a modal)
- Display: partial invoices show `[Progress: First month]` pill on invoices list; invoice detail shows "Covers 1 Apr → 30 Apr" under the heading
- Webhook: `invoice.created` payload now includes `scope_label`, `is_partial`, `period_start_date`, `period_end_date`
- Database: `scope_label text`, `is_partial boolean default false`, `period_start_date date`, `period_end_date date` columns added to `invoices` (no new tables — same `job_id` groups progress invoices)
- Service layer (`lib/services/invoices.ts`): `getInvoicedTotalForJob`, `getInvoicesForJob`, `getJobsWithInvoiceTotals` (batch-fetched, no N+1), `getPartialInvoiceContext`, `getJobBillablesForPeriod`, updated `createInvoiceFromJob(jobId, options)` with `scopeLabel`, `isPartial`, `customLineItems`, `periodStartDate`, `periodEndDate`
- Comparison basis: ex-GST on both sides (job total ex-GST vs invoice subtotals ex-GST) — matches AU progress-claim convention and how Xero/MYOB report internally

### Drawing Prefix System
- Each level can have a configurable `drawing_prefix` text (e.g. "L1-", "GF-", "B2-") set by admin in the Structure tab
- Admin UI: collapsed by default — shows badge `[L1-]` (or "No drawing prefix" if unset) with a small pencil edit icon. Clicking the pencil opens an inline edit row with Save/Cancel buttons (Enter to save, Escape to cancel). Prefix badge also shows on collapsed level header.
- New level form: optional prefix field alongside name input
- Worker experience UNCHANGED — pin label remains plain free-text input; worker has zero awareness of the prefix system
- Service layer silently prepends the level's `drawing_prefix` when saving a penetration: worker types "001" on Level 1 (prefix "L1-") → stored `floorplan_label` = "L1-001"
- Levels with no prefix → label saved as worker typed it (current behaviour preserved)
- All existing displays (Drawings tab, Evidence tab, reports, customer portal) automatically show prefixed labels since they already read `floorplan_label`
- Enables admin to filter/group exports by level (e.g. one spreadsheet per level based on prefix)
- Database: `drawing_prefix text` and `auto_number_counter integer` columns added to `levels` table (counter currently unused — kept for potential future auto-numbering)

### Report Overhaul (PDF + Spreadsheet + Document Export)
- PDF report overhauled: 2×2 grid layout (4 penetrations per page), each card shows photo + evidence fields + cropped floor plan close-up with pin location
- Penetrations grouped by building → level → room with group headers
- Header on page 1 only (job details, building structure, materials summary), branded footer on all pages
- Floor plan crop: overflow:hidden container with calculated offsets from pin percentage coordinates, red dot overlay at pin location
- Spreadsheet export (.xlsx): one row per penetration, dynamic columns from evidence fields, styled header, auto-filter, alternating row colours (exceljs)
- Document export (.docx): editable Word document mirroring PDF content, embedded photos as image buffers, materials table, credentials footer (docx package)
- Report tab UI: 3 independent export cards (PDF, Spreadsheet, Document) with per-format loading/success/error states
- Fixed critical bug: penetration_photos query used `url` column (doesn't exist) — changed to `storage_path` with signed URL generation
- Signed URL generation for all photos, level drawings, and company logo in PDF and document routes
- API routes: /api/jobs/[id]/report (PDF), /api/jobs/[id]/report/spreadsheet (xlsx), /api/jobs/[id]/report/document (docx)

### Schedule / Calendar Work Hub
- Route at `/schedule` (admin/manager only — workers redirected to `/today`); top-nav already has Schedule link
- **Default view: Month** (was Week — overhauled per Oliver's feedback to look like a real calendar, not a Gantt chart of giant orange bars)
- Four views available: Month / Week / Day / Agenda — Month shows compact chips, Week+Day show time grid (still available for those who want it)
- Calendar holds **jobs AND generic events together** — see Generic Calendar Events section below for event types
- **Soft pastel chip styling**: type-coloured background (jobs slate-blue, meetings mint, calls peach, reminders butter, material deliveries lavender, interviews pink, focus blocks slate, custom indigo); thin coloured left edge communicates job status (saturation); fixed-height chips regardless of duration; type icon + time + title in chip body; completed items rendered with opacity 0.55 + line-through
- **Today panel** (right-side aside, ~280px wide): persistent on Day view, toggleable on Week/Month via "Today" button in toolbar; shows today's items chronologically with type icon + time + title + customer + status dot, plus footer counts for Tomorrow + Next 7 days
- **Reminder dot in top nav**: small red dot on bell icon when admin has jobs starting within 1 hour OR currently in-progress (workers stay on /today, no dot for them); count fetched server-side in dashboard layout via `getUpcomingSummary`
- **Drag-drop reschedule**: grab any chip → drop on new slot → optimistic local update + server action; preserves duration; falls back on error
- **Drag-resize duration**: drag bottom edge of event in time views → updates `scheduled_end` (jobs) or `end_time` (events)
- **Conflict warning**: non-blocking yellow toast when a drag puts a worker into overlapping job times (only fires for jobs with assignments; client-side check on loaded events)
- **By-worker resource view**: toggle in toolbar switches Day view to row-per-worker layout (à la AroFlo dispatcher view); jobs explode by assignment (one chip per worker per job, plus "Unassigned" lane); drag a job between worker lanes → calls `reassignJobToWorker` (removes old assignment, adds new); calendar events skipped in this mode (no assignments)
- **Filter bar**: search (matches job title/number, event title, customer), Type multi-select (job + 8 event types), Status multi-select (jobs only), Workers multi-select (jobs only), Customer single-select; "Clear filters" link when any active; live count "X total"
- **EventPanel slide-over** on chip click: dispatches by item kind — Job body shows job number/title/status/customer/site/scheduled times/assignments/recurrence/parent-job-link/description with "Open job" + "Edit schedule" buttons; Event body shows type icon/title (strikethrough if completed)/when/location/video link/customer/lead/linked job/creator/visibility/reminder/description with "Mark as done"/"Edit"/"Delete" buttons
- **Empty-slot click → EventComposer** (form-based create): user picks an empty time on the calendar → composer opens with start/end pre-filled (changed from old job-only modal — now creates events of any type; jobs still created via /jobs/new)
- **EventComposer modal**: 8-button type picker grid at top (icons + labels); fields adapt per type (defaults: meeting 60min/30min reminder, call 30min/15min, reminder 0min/0min ping, task 0min/no reminder, material_delivery 30min/60min, interview 60min/30min, block 60min/no reminder, custom 60min); inputs for title, start/end (datetime-local), all-day toggle, description, location, video link, linked customer, reminder timing (None/At time/5/15/30/60/120/1day), visibility (private/team/company); same modal handles edit (pre-filled from existing event)
- **Inline toast system** (bottom-right): success/warning/error toasts auto-dismiss after 4.5s; used for reschedule confirmation, conflict warnings, create/update/delete feedback
- **Custom CSS** in `app/(dashboard)/schedule/calendar-styles.css`: design-system overrides for react-big-calendar — slate/white palette, blue active button, blue-50 today highlight, soft hover (no transform), 22px chip min-height (20px in Month view)
- **Tech stack**: react-big-calendar v1.x + react-dnd + react-dnd-html5-backend + date-fns; vanilla CSS overrides; no FullCalendar (commercial license issue with resource view)

### Generic Calendar Events
- New `calendar_events` table holds everything time-bound that isn't a job
- 8 event types: `meeting | call | reminder | task | material_delivery | interview | block | custom`
- Optional links to `job_id`, `customer_id`, `lead_id` so events can be tied to existing entities
- Visibility levels: `private` (only creator sees) / `team` / `company` (everyone in company sees) — visibility filtered in RLS policy via `created_by = auth.uid() OR visibility IN ('team','company')`
- Per-event reminder: `reminder_minutes_before` (null=off) + `reminder_sent_at` tracked to prevent duplicate pings
- All-day toggle, location text, video link, custom color override, description
- Mark as completed (line-through + opacity dim on calendar)
- Service layer `lib/services/calendar-events.ts` (read), `app/actions/calendar-events.ts` (CRUD + reschedule + toggle complete)
- Empty digest-event → calendar fetches both `jobs` (existing) and `calendar_events` for date range, unifies via `CalendarItem` discriminated union (`{kind:'job',data:ScheduleEvent} | {kind:'event',data:CalendarEvent}`); helpers in `app/(dashboard)/schedule/calendar-types.ts` provide `styleForItem`, `itemStart`, `itemEnd`, `itemTitle`, `itemSubtitle`, etc.

### Recurring Jobs (Lightweight)
- "Repeat this job" section on job edit form: dropdown (No recurrence / 6 / 12 / 24 months / Custom up to 120) — Custom shows number input
- When job marked completed AND `recurrence_months` set AND `recurrence_spawned = false`: `updateJobStatus` action calls `spawnRecurringDraft` → inserts new draft job with `scheduled_start = original_start + N months`, copies customer/site/description/priority/job_type/evidence_category/evidence_subcategory; preserves duration via `(scheduled_end - scheduled_start)`; sets `parent_job_id = original_id`; flips `recurrence_spawned = true` on original to prevent duplicates if status toggled
- Spawned draft job appears on calendar immediately (next service date)
- Job detail panel + EventPanel show "Repeats every N months" badge when set; spawned children show "Created from a recurring job: view original" link
- Webhook `job.created` fires for the auto-spawned draft with `parent_job_id` in payload
- Database: `recurrence_months int`, `parent_job_id uuid references jobs(id) on delete set null`, `recurrence_spawned boolean default false` columns added to jobs

### Calendar Sync (iCal feed — one-way)
- Per-user iCal subscription URL: `/api/calendar/{token}` (public, unauthenticated, token-based)
- Self-serve enable/regenerate/disable via Calendar Sync card on `/profile` page
- Token = 64-char hex stored in `users.calendar_token` (unique partial index)
- Feed includes user's jobs (worker: assigned jobs; admin/manager: all company jobs) + cancelled status excluded; ±90 days lookback / +365 days lookahead
- `.ics` content generated by `lib/services/calendar-feed.ts` — manual VCALENDAR/VEVENT format, escaped per RFC 5545, line-folded at 75 chars; refresh interval hint `PT15M`
- Event description includes customer name, status, full URL back to /jobs/{id}
- Works in Apple Calendar, Google Calendar (incl. Workspace), Outlook (subscribe-by-URL)
- Read-only: edits in user's calendar app don't push back to us (calendar of record stays in our app); native two-way Google/Outlook OAuth sync deferred to v2.5

### Email Digests & Per-Event Reminders (Cron)
- **Daily morning digest** at 7:00 AM AEST (Vercel cron `0 21 * * *` UTC) → `/api/cron/daily-digest` → `sendDailyDigestsForAllUsers` iterates active users with `email_notifications_enabled=true`, builds personal digest, skips empty digests
- Digest content per user: today's items (jobs + visible events) sorted by time, Tomorrow count, Next 7 days count; admins see all company jobs, workers see only assigned jobs; events filtered by visibility (creator OR team/company)
- **Per-event reminder ping** every 5 min (Vercel cron `*/5 * * * *`) → `/api/cron/event-reminders` → `processPendingEventReminders` finds events with reminder set, not yet sent, starting within next 24h; in-memory window check `minutesUntilStart <= reminder_minutes_before`; sends to event creator only (per-attendee deferred); flips `reminder_sent_at` on success
- Both crons protected by `Bearer ${CRON_SECRET}` (reuses existing env var from check-overdue-invoices cron)
- Email templates: `lib/email/templates/daily-digest.ts` (Good morning + items list + Tomorrow/Next 7 days summary + CTA "Open schedule") and `lib/email/templates/event-reminder.ts` (event title + minutesLabel + details table + description blockquote + CTA)
- Both templates use existing `wrapTemplate` + `getEmailBranding` for consistent header/footer with company logo + brand colours
- All sends logged to `email_logs` (event = 'daily.digest' or 'event.reminder')
- Standalone module `lib/services/email-digests.ts` (no 'use server' — called from cron API routes); reuses Resend integration from existing `lib/services/email.ts` plumbing

### Standalone Interactive Drawing Export
- 4th export format on Report tab: a single self-contained `.html` file with every level drawing and all penetration pins
- Self-contained: company logo, all floor plan drawings, and all penetration photos are embedded as base64 data URIs at generation time — file works offline, no signed URLs to expire
- Branded header (logo, company name, job number, customer, generation date) and footer (credentials, ABN, email, phone, website)
- Buildings → levels grouped, only levels with a drawing render
- Click any pin → side panel slides in with full penetration details: subcategory badge, room badge, level/timestamp pills, evidence-field Q&A grid, photo grid; click photo → full-screen lightbox; Escape closes both
- Zoom/pan inside the export (mirrors the admin Drawings tab math): wheel zoom-toward-cursor with atomic transform updates, click-drag pan with 20% boundary clamp, pinch-to-zoom on touch, +/− and reset controls overlaid bottom-right of each drawing, MIN_SCALE=1, MAX_SCALE=5
- Inverse pin scaling via `--pin-eff` CSS variable: `effectivePinSize = max(8px, 24/scale)`, font-size, border thickness all derive from it (font multiplier 0.38 so 2-3 char labels like "0.1" sit cleanly inside the circle)
- Image rendering hint (`image-rendering: high-quality` / `-webkit-optimize-contrast`) for marginal scaling improvement; true sharpness still depends on uploaded source resolution
- Each level zooms independently; drag-vs-click suppression so pin click after pan doesn't open panel
- HTML generator lives in `lib/html/drawings-export.ts` (pure function — takes data, returns HTML string); API route at `/api/jobs/[id]/report/drawings` orchestrates fetching + base64 conversion
- Vanilla JS only inside the export — no external dependencies, opens in any modern browser
- File size scales with photo count (base64 inflates by ~33%); for jobs with hundreds of photos the file can grow large — flagged for future server-side downscaling

### Unified Search & Filter UX (Admin List Pages)
- Single reusable `<SearchFilter>` component at `components/ui/search-filter.tsx` — search input on the left + filter icon button on the right that opens a popover with field-specific dropdowns; active-filter pills with individual remove + "Clear all"; closes on outside click or Escape; count badge on filter button when filters are applied
- Wired into 5 admin list pages with contextual per-page filters:
  - **Customers** — search across name / email / phone / city / billing address / all site cities & addresses; filters: City (dynamically built from billing city + every site city), Sites (Any / With sites / No sites yet); page split into client `customers-list.tsx` so server `page.tsx` only fetches and passes data
  - **Jobs** (admin view) — search across title / job number / customer / site city / site address / site manager; filters: Status, Priority, Customer (dynamic), Scheduled bucket (Today / This week / Upcoming / Past / Unscheduled); old status pill row removed in favour of one consistent filter mechanism
  - **Team** (`/settings/team`) — search across full name / email / phone / trade / role; filters: Role (dynamic), Trade (dynamic)
  - **Parts** (`/settings/parts`) — search across name / SKU / supplier / subcategory (was name only); inline two-dropdown row replaced with the new popover (subcategory + supplier)
  - **Products** (`/settings/products`) — search across name + description (was name only); filters: Parts (Any / With parts / No parts yet), Pricing (Any / Has sell price / No sell price)
- Filtering is client-side on already-fetched data — no service file changes, no extra DB queries, RLS untouched
- All `<select>` elements inside the popover follow the standard `appearance-none + ChevronDown overlay + pr-10` pattern (failure pattern #3)
- Result counts ("X of Y") shown on every page so it's obvious when filters are narrowing the list

### Settings Sub-Page Header Consistency Fix
- Email Notifications page (`/settings/notifications`) header cleaned up to match the canonical sub-page pattern shared by Materials / Parts / Pay-Rules / Webhooks / Integrations / Company
- Removed: amber rounded `Mail` icon block that previously sat between the back link and the title
- Title now sits inline with the back link's left edge — `text-xl` (was `text-3xl`), arrow icon `w-3.5 h-3.5` (was `w-4 h-4`), back text "Settings" (was "Back to settings"), `mb-6` header gap (was `mb-8`), `transition-colors` on the back link

---

## Database Tables (all with RLS enabled)

| Table | Purpose |
|---|---|
| companies | Multi-tenant root |
| users | All users — company_id, role, trade, hourly_rate |
| jobs | Core job entity with full site details |
| customers | Customer records |
| buildings | Job site buildings (site_id = job.id) |
| levels | Levels within buildings (drawing_prefix for label prepending) |
| rooms | Rooms within levels (is_done boolean) |
| penetrations | Evidence records — room_id, level_id, field_values JSONB |
| penetration_photos | Photos attached to penetrations |
| job_evidence_fields | Admin-configured fields per job |
| job_material_defaults | Pre-configured materials per job |
| room_materials | Materials logged per room by workers |
| materials | Global materials catalogue (legacy) |
| parts | Individual purchasable items with buy cost, sell price, margin, supplier |
| products | Bundles of parts with calculated totals |
| product_parts | Join table: parts within products with quantities |
| job_assignments | Worker → job assignments |
| company_pay_rules | Award package + overtime rules per company |
| invoices | Invoice records (scope_label, is_partial, period_start_date, period_end_date for progress billing) |
| invoice_line_items | Line items per invoice |
| portal_links | Magic link tokens for customer portal access |
| level_drawings | Floor plan drawing uploads per level |
| xero_connections | One Xero OAuth connection per company (tokens, tenant info) |
| job_time_entries | Labour hours from Xero timesheets, mapped to jobs |
| webhooks | Per-company webhook subscriptions (URL, secret, events, status) |
| webhook_logs | Webhook delivery log (event, payload, response, success) |
| api_keys | Per-company API keys (hashed, prefix for display, permissions) |
| leads | Lead/inquiry tracking with status lifecycle and conversion tracking |
| company_credentials | Custom licence/credential label+value pairs per company (display on reports) |
| evidence_categories | Job categories: Certification, Inspection |
| evidence_subcategories | Subcategories under each category (e.g. Penetration Sealing, Fire Collar) |
| evidence_template_fields | Default questions per subcategory (loaded dynamically at form time) |
| calendar_events | Generic time-bound events (meeting, call, reminder, task, material_delivery, interview, block, custom) — links optional to job/customer/lead, visibility private/team/company, reminder_minutes_before + reminder_sent_at for email pings |
| email_preferences | Per-company per-event email config (is_enabled, recipient_roles, recipient_user_ids, recipient_group_ids, extra_emails, notify_customer) — unique on (company_id, event) |
| email_logs | Email delivery log (event, recipient_email, subject, success, error_message, provider_message_id) |
| email_groups | Reusable distribution lists (name, description, member_user_ids, member_emails) — referenced from email_preferences.recipient_group_ids for "Leadership Team" etc. |

**New columns on existing tables:**
- `jobs.recurrence_months int`, `jobs.parent_job_id uuid`, `jobs.recurrence_spawned boolean` — for lightweight recurring job spawn
- `users.calendar_token text unique` — per-user iCal feed token (null = sync disabled)
- `users.email_notifications_enabled boolean default true` — per-user opt-out of all transactional emails
- `companies.email_signature text`, `companies.email_reply_to text`, `companies.email_show_logo boolean default true` — email branding overrides shown in Company Profile

Storage bucket: `job-photos` | Path pattern: `{company_id}/{job_id}/penetrations/{penetration_id}/{timestamp}.ext`

---

## Architecture Rules (Non-Negotiable)

- All business logic in `lib/services/` — never in components or page.tsx directly
- Server components (page.tsx) only: auth check + data fetch + pass props to client component
- Admin pages: always `w-full` — NEVER add `max-w-` centering
- Worker/mobile pages: `max-w-lg mx-auto`
- No text/icons should touch the edge of any card/container — always use padding
- All dropdowns: `appearance-none` on select + ChevronDown icon overlay at `right-3 top-1/2 -translate-y-1/2`
- Use plain `<img>` tag for blob: URLs and Supabase signed URLs — NOT Next.js Image component
- RLS required on every new table with company_id isolation policy

---

## Not Yet Built (Must-Have for MVP)

- ~~**Report overhaul**~~ ✅ DONE — PDF overhauled (2×2 grid, 4 per page, floor plan crops, grouped by location), spreadsheet export (.xlsx), document export (.docx), standalone interactive drawing export (.html with zoom/pan and clickable pins).
- ~~**Drawing prefix system**~~ ✅ DONE — Each level gets a prefix (e.g. "L1-"), silently prepended to penetration labels at save time. Worker UX unchanged. Enables filtering exports by level.
- ~~**Evidence field categories & default questions**~~ ✅ DONE — Two main job categories (Certification / Inspection) with subcategories. Worker picks subcategory per penetration. Template questions load dynamically. Admin can add custom questions on top.
- ~~**Partial/progress invoicing + invoice creation from invoices page**~~ ✅ DONE — Multiple invoices per job (monthly billing). "New Invoice" button on /invoices page: select job, choose full or partial scope. Smart period-aware billing: pick a date range, system auto-pulls materials + labour from that period at sell prices, admin edits as needed. Job timeline shown in form. Tracks invoiced vs remaining ex-GST. Existing generate button on job cost tab preserved.
- ~~**Dedicated Drawings tab**~~ ✅ DONE — Drawings moved to own tab, structure tab focused on building/level/room only. Zoom constrained (min 1x, pan boundaries).
- ~~**Pin scaling on zoom**~~ ✅ DONE — Pins scale inversely with zoom (admin Drawings tab + standalone HTML export), zoom-to-cursor with atomic state, pin detail panel on Drawings tab.
- ~~**Company settings & branding**~~ ✅ DONE — Company logo, brand colours, name, address, ABN, credentials/licences. Applied to PDF reports (footer). Invoices, portal, emails still to be branded.
- ~~**Scheduling/calendar**~~ ✅ DONE — Schedule/Calendar Work Hub at `/schedule`. Default Month view with soft pastel chips + type icons. Holds jobs AND generic events (meeting, call, reminder, task, material delivery, interview, focus block, custom). Drag-drop reschedule + resize, by-worker resource view (drag between worker lanes reassigns), filters (type/status/worker/customer/search), Today panel, EventComposer modal for create/edit, EventPanel slide-over with mark-done/edit/delete, lightweight recurring jobs (auto-spawn next draft on completion). One-way iCal sync (Apple/Google/Outlook) via per-user token. Daily morning digest emails + per-event 30-min-before reminder emails via Vercel cron.
- **Stripe billing** — Starter/Pro/Business/Enterprise tiers, per-seat pricing, 30-day trial.
- ~~**Email notifications**~~ ✅ DONE — Resend integration with branded templates (job.created, job.completed, invoice.sent/paid/overdue). Per-company preferences at /settings/notifications with **three additive recipient channels**: (1) role-based broadcast (admin/manager/worker chips with member counts), (2) specific people picker (searchable, scoped to active company users), (3) reusable distribution groups (CRUD section above events — "Leadership", "Operations", etc., each with team members + external emails, deduped at send time). Plus free-text additional emails and customer chase opt-in for invoice.overdue. Email branding (logo, reply-to, signature) under Company Profile. Daily Vercel cron checks overdue invoices. Worker-facing events (job.assigned, job.reminder) not built and parked alongside in-app messaging — workers rely on Today view + assigned-jobs list, plus WhatsApp/calls for ad-hoc coordination. Both pickers close on outside click for standard popover UX.
- ~~**In-app messaging & notifications**~~ **PARKED 8 May 2026** — Not building pre-launch. Most fire-protection SMBs already coordinate via WhatsApp + calls; no customer signal yet. Real cost (4 tables + Supabase realtime + two new pages + top-nav bell-dropdown rewrite + worker bottom-nav rework + lifecycle wiring + daily reminder cron) outweighs current value. Full spec preserved in build-roadmap.md → "IN-APP MESSAGING & NOTIFICATIONS — PARKED" section. **Trigger to revisit:** explicit ask from ≥2 paying launch customers, or App Store push notifications needing a surface to live in.
- **In-app AI help assistant** — AI chat icon (bottom-right) trained on our app, helps admins navigate and find features.

## Known Issues / Technical Debt

- Email confirmation disabled — re-enable before production launch
- No toast notifications (success/failure is currently silent)
- No loading skeleton states on most pages
- Labour hours on invoices now populated from Xero time entries (requires Xero connection + sync)
- Checklist tab = Coming soon placeholder

---

## Pricing (Decided)

| Plan | Monthly Price | Extra Seats |
|---|---|---|
| Starter | A$99/mo | A$60/seat |
| Pro | A$299/mo | A$50/seat |
| Business | A$749/mo | A$45/seat |
| Enterprise | A$1,699+/mo | A$40/seat |

Customer portal always free | 30-day free trial | Annual discount available
