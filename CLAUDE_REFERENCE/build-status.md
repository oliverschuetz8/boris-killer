# 05 — Current Project State

Last Updated: 28 April 2026 | Project: AUTONYX (codename: BORIS Killer) | Status: Active MVP (~88% complete)

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
- Jobs list with search and status filter

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
- Zoom & pan: mouse wheel zoom toward cursor, click-drag pan, pinch-to-zoom on mobile
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
- Search by name, filter by subcategory and supplier dropdowns
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
- Events: job.created, job.completed, job.status_changed, job.assigned, invoice.created, invoice.status_changed, invoice.overdue, hours.submitted, room.completed, webhook.test
- Add/edit/delete webhooks with URL, event selection, description
- Toggle active/paused, test button, failure count tracking
- Webhook delivery log with event, status code, success/fail, timestamp
- Per-company API keys (admin only) with SHA-256 hash storage, one-time key display
- Public REST API at /api/v1/ (jobs list/detail, invoices list/detail) authenticated via Bearer token
- Non-blocking fire-and-forget webhook delivery from server actions (createJob, updateJobStatus, createInvoiceFromJob, updateInvoiceStatus, syncTimesheets)

---

## Database Tables (all with RLS enabled)

| Table | Purpose |
|---|---|
| companies | Multi-tenant root |
| users | All users — company_id, role, trade, hourly_rate |
| jobs | Core job entity with full site details |
| customers | Customer records |
| buildings | Job site buildings (site_id = job.id) |
| levels | Levels within buildings |
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
| invoices | Invoice records |
| invoice_line_items | Line items per invoice |
| portal_links | Magic link tokens for customer portal access |
| level_drawings | Floor plan drawing uploads per level |
| xero_connections | One Xero OAuth connection per company (tokens, tenant info) |
| job_time_entries | Labour hours from Xero timesheets, mapped to jobs |
| webhooks | Per-company webhook subscriptions (URL, secret, events, status) |
| webhook_logs | Webhook delivery log (event, payload, response, success) |
| api_keys | Per-company API keys (hashed, prefix for display, permissions) |

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

- **Report overhaul** — Current PDF too basic. Needs: 4 penetrations per page (photo + evidence data + cropped floor plan close-up with pin), multiple export formats (PDF, spreadsheet/Excel, document/.docx for Google Docs), standalone interactive drawing export with zoomable pins. Key differentiator vs BORIS.
- **Drawing prefix system** — Each level gets a prefix (e.g. "L1-"), auto-applied to penetration labels. Enables filtering exports by level.
- **Evidence field categories & default questions** — Two main job categories (Certification / Inspection) with subcategories. Each subcategory has default questions. Admin can add custom questions on top. Workers see the right questions based on job category + subcategory.
- **Partial/progress invoicing + invoice creation from invoices page** — Multiple invoices per job (monthly billing). "New Invoice" button on /invoices page: select job, choose full or partial scope. Track total invoiced vs total job value. Keep existing generate button on job cost tab too.
- **Dedicated Drawings tab** — Move drawings from Structure tab to its own tab on job detail page. Upload + view drawings with pins.
- **Pin scaling on zoom** — Pins must scale with the drawing when zooming (currently stay oversized). Applies in-app and in exports.
- **Company settings & branding** — Company logo, brand colours, name, address, ABN. Applied to reports, invoices, portal, emails.
- **Scheduling/calendar** — Calendar view with drag-and-drop, day/week/month views, worker availability.
- **Stripe billing** — Starter/Pro/Business/Enterprise tiers, per-seat pricing, 30-day trial.
- **Email notifications** — Job completed, assigned, created, reminders, overdue invoices.
- **Website-to-app lead tracking** — Marketing website inquiry form to app for conversion funnel visibility.
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
