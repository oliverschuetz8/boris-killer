# AUTONYX — What We're Building Next

> Last updated: 8 May 2026 (Unified search & filter UX across admin list pages + Email Notifications header consistency fix)
> This document covers the full build order from current state through launch and beyond.

---

## ✅ ALREADY COMPLETE

- Jobs management (create, edit, assign, status)
- Worker execution page (location-first: building → level → room → penetrations)
- Building structure (site → level → room, drill-down, colour-coded)
- Evidence tab (admin drill-down, photo viewer, admin delete)
- Pay Rules engine (7 Australian Fair Work award packages, overtime calculations)
- Team management (RLS fixed, role badges, dynamic colours)
- Materials catalogue (admin configures, workers log usage)
- Job cost report (labour + materials = full job cost)
- Invoicing (generate, manage, status tracking)
- Dashboard stats and job assignments (Step 1 complete)
- Floor plan drawings with pin mapping (cumulative pins, free-text labels, zoom/pan, pin actions, drawings modal, per-level scoping)
- Job type field (installation/maintenance/inspection) on create, edit, detail, and worker today view
- Setup tab on job detail page (admin/manager only — assignments, evidence fields, material defaults moved from edit page)
- Multi-photo selection (gallery allows multiple, camera stays single)
- Evidence field default answers (admin sets, pre-fills worker form)
- Xero integration plan (OAuth, Payroll timesheet pull, invoice push)
- Webhook system + public API plan (n8n automations)
- Customer Portal with magic link (token-based read-only portal, floor plan drawings with interactive pins, photo lightbox, admin generate/revoke links)
- Parts & Products system (parts catalogue with buy/sell/margin/supplier, products as bundles of parts, worker execution updated, job cost tab with buy/sell/margin breakdown, setup tab supports parts/products/legacy, migration from old materials)
- Dashboard Charts & Visualisations (Recharts: job status donut chart, completion rate bar chart, revenue summary cards, jobs per worker horizontal bar chart, empty states, modern clean design)
- Xero OAuth + Invoice Sync (OAuth 2.0 PKCE flow, push invoices to Xero as draft, pull timesheets, hybrid auto/manual job mapping, sync employee pay rates, labour rate parts with buy/sell/margin, unassigned hours queue)
- Webhook System + Public API Keys (per-company webhooks with HMAC signing, API keys with SHA-256 hash, REST API at /api/v1/, event integration in jobs/invoices/xero actions)
- Website-to-App Lead Tracking (leads table, admin UI at /leads with stats/filters/CRUD, public API POST/GET /api/v1/leads with API key auth, lead.created webhook event)
- Company Settings & Branding (settings page at /settings/company, logo upload, brand colours, company details, licences/credentials with label+value CRUD, PDF report footer with branding + credentials, company_credentials table)
- Report Overhaul (PDF overhauled: 2×2 grid, 4 per page, floor plan crops with pin, grouped by building/level/room. Spreadsheet export .xlsx. Document export .docx. Report tab with 3 independent export buttons. Fixed photo column bug. Signed URL generation for all assets. Standalone drawing export still TODO.)
- Dedicated Drawings Tab (moved from Structure tab to own tab, zoom constrained: min 1x with symmetric pan boundaries, scroll-to-zoom captures page scroll)
- Pin Scaling on Zoom (pins scale inversely with zoom, zoom-to-cursor with atomic state, badge/label text scales proportionally, pin detail panel on Drawings tab with evidence fields + photos + lightbox)
- Evidence Field Categories & Default Questions (Certification/Inspection categories, subcategories per category, worker picks subcategory per penetration, template questions load dynamically, admin custom fields still supported, per-penetration subcategory stored in DB)
- Drawing Prefix System (admin sets per-level prefix in Structure tab via collapsed badge + pencil edit UI, service layer silently prepends prefix to worker's pin label at save time, worker UX unchanged, enables export filtering by level)
- Partial/Progress Invoicing + Invoice Creation from Invoices Page (multiple invoices per job for monthly progress billing, "+ New Invoice" button on `/invoices` page with two-stage modal — pick job then pick scope (Full/Partial), partial form has scope label + date range picker with smart defaults + "Pull billables for this period" button that auto-fills line items from materials/labour in that period at sell prices, job timeline panel shows scheduled/actual start→end, invoicing progress panel on job cost tab with invoiced/remaining bar and prior-invoice list, dual buttons "Generate Full Invoice" + "New Partial Invoice", scope label + period range displayed on invoice list/detail, double-billing confirmation when full-invoicing a job that already has prior invoices, ex-GST progress tracking matches AU progress-claim standard, webhook payload includes scope_label/is_partial/period dates)
- Standalone Interactive Drawing Export (4th export format on Report tab — single self-contained `.html` file with all level drawings + pins; logo, drawings and photos embedded as base64 data URIs so it works offline; click any pin → side panel with subcategory/room/level badges, evidence Q&A, photo grid, click-to-zoom lightbox; full zoom/pan inside the export mirroring admin Drawings tab math — wheel zoom-to-cursor, click-drag pan, pinch on touch, +/−/reset controls, MIN_SCALE=1 MAX_SCALE=5; inverse pin scaling via `--pin-eff` CSS var with 8px floor and 0.38 font multiplier for clean 2-3 char labels; HTML generator at `lib/html/drawings-export.ts`, route at `/api/jobs/[id]/report/drawings`)
- Schedule / Calendar Work Hub (route at `/schedule`, default Month view with soft pastel chips and type icons — overhauled per Oliver's "no big orange bars" feedback to feel like a real calendar not a Gantt chart; holds jobs AND generic events together — meeting, call, reminder, task, material delivery, interview, focus block, custom; drag-drop reschedule + resize; by-worker resource view with drag-between-lanes reassignment; filters for type/status/worker/customer/search; Today panel right-side aside with chronological list + Tomorrow/Next7 counts; reminder dot in top nav bell; EventComposer modal for create/edit with 8-button type picker; EventPanel slide-over with mark-done/edit/delete; lightweight recurring jobs auto-spawn next draft on completion; one-way iCal feed per user — Apple/Google/Outlook subscribe-by-URL; daily morning email digest at 7am AEST + per-event 30-min-before reminder pings via Vercel cron; new `calendar_events` table; `recurrence_months`/`parent_job_id`/`recurrence_spawned` columns added to jobs; `calendar_token` column added to users)
- Unified Search & Filter UX on admin list pages (single reusable `<SearchFilter>` component with search bar + filter icon popover wired into Customers, Jobs, Team, Parts, Products with contextual per-page filters — City/Sites for Customers; Status/Priority/Customer/Scheduled bucket for Jobs with old status pill row replaced; Role/Trade for Team; Subcategory/Supplier for Parts; Parts/Pricing for Products; client-side filtering on already-fetched data, no extra DB queries; result counts on every page; standard appearance-none + ChevronDown pattern on all selects)
- Settings sub-page header consistency fix (Email Notifications page header brought in line with Materials/Parts/Pay-Rules/Webhooks/Integrations/Company — amber Mail icon block removed, smaller `text-xl` title aligned with back link, arrow `w-3.5 h-3.5`, "Settings" back text, `mb-6` gap)

---

## 🔨 IMMEDIATE NEXT (Pre-Launch Core)

### ~~Standalone Drawing Export~~ ✅ DONE
- Single self-contained `.html` export, all drawings with pins, fully interactive (zoom/pan + clickable pins → details panel)
- Inverse pin scaling so pins shrink with zoom (8px floor) — exact placement remains visible in dense clusters
- Embedded base64 data URIs for logo, drawings, photos — file works offline, no expiring signed URLs
- Brand-styled header/footer using company primary colour, ABN, credentials

### ~~Drawing Prefix System~~ ✅ DONE
- Admin sets per-level prefix (e.g. "L1-") in Structure tab via collapsed badge + pencil edit UI with Save/Cancel buttons
- Service layer silently prepends the level's prefix to worker's pin label at save time (worker types "001", stored as "L1-001")
- Worker UX unchanged — pin label remains plain free-text
- Enables admin to filter/group exports by level prefix

### ~~Evidence Field Categories & Default Questions~~ ✅ DONE
- Two main job categories: Certification and Inspection
- Subcategories per category (e.g. Penetration Sealing, Fire Collar, Fire Door)
- Admin picks category at job level; worker picks subcategory per penetration
- Template questions load dynamically based on worker's subcategory selection
- Admin can still add custom questions via Setup tab
- Different penetrations in same job can have different subcategories

### ~~Partial/Progress Invoicing + Invoice Creation from Invoices Page~~ ✅ DONE
- Multiple invoices per job for monthly progress billing
- "+ New Invoice" button on `/invoices` page with two-stage modal (pick job → pick scope)
- Smart period-aware partial billing: pick a date range, system auto-pulls materials + labour at sell prices, admin edits as needed
- Job timeline panel shows scheduled/actual start → end so admin doesn't have to look it up
- Invoicing progress panel on job cost tab with invoiced/remaining bar and prior invoice list
- Existing "Generate Invoice" button on job cost tab preserved (renamed "Generate Full Invoice", with double-billing warning when prior invoices exist)
- Ex-GST tracking on both sides (matches AU progress-claim standard)

### ~~Dedicated Drawings Tab~~ ✅ DONE
- Drawings moved to own tab on job detail page
- Zoom constrained: min 1x, pan boundaries prevent losing drawing off-screen

### ~~Pin Scaling on Zoom~~ ✅ DONE
- Pins scale inversely with zoom (effectivePinSize = pinSize / scale, min 8px floor)
- Badge text and label also scale proportionally (lowered internal Math.max floors)
- Zoom-to-cursor: refactored useZoomPan to single atomic state (scale + x + y in one useState) — eliminates React batching drift
- Pin detail panel on Drawings tab: clicking a pin shows full penetration details (evidence fields, photos with lightbox, subcategory, room, timestamp)
- Pin scaling now also applied in the standalone HTML drawing export (same math)

### ~~Company Settings & Branding~~ ✅ DONE
- Company settings page, logo upload, brand colours, company details, credentials/licences
- PDF report footer branded with company details + credentials
- Still TODO: apply branding to invoices, customer portal, email notifications

### ~~Scheduling/Calendar~~ ✅ DONE — built as Schedule/Calendar Work Hub
- Schedule/Calendar Work Hub at `/schedule` — Month default with soft pastel chips, holds jobs + generic events together
- 8 event types beyond jobs: meeting, call, reminder, task, material delivery, interview, focus block, custom
- Drag-drop reschedule + resize, by-worker resource view (drag between lanes reassigns), filters, Today panel
- EventComposer for create/edit, EventPanel slide-over with mark-done/edit/delete
- Lightweight recurring jobs (auto-spawn next draft on completion, configurable months)
- One-way iCal feed (Apple/Google/Outlook subscribe-by-URL via per-user token)
- Email digests: morning summary + per-event 30-min-before reminders (Vercel cron)
- Native two-way Google/Outlook OAuth sync deferred to v2.5

### Stripe Billing
- Starter / Pro / Business / Enterprise tiers
- Monthly + annual billing
- Per-seat pricing
- 30-day trial
- Full billing at MVP launch

### ~~Xero OAuth + Invoice Sync~~ ✅ DONE
- Admin connects Xero once in Settings > Integrations
- Pull timesheet data from Xero Payroll API with hybrid auto/manual job mapping
- Labour rate parts: buy_cost = Xero rate, sell_price = invoice rate with margin
- Push draft invoice to Xero with labour + materials line items

### ~~Webhook System + Public API Keys~~ ✅ DONE
- Per-company webhooks with HMAC-SHA256 signing at /settings/webhooks
- API keys with SHA-256 hash storage, one-time display, Bearer auth
- REST API at /api/v1/ (jobs + invoices list/detail)
- Events fired from jobs, invoices, and Xero sync actions

### Email Notifications
- Job completed → PDF report + email customer + Xero invoice
- Job assigned → notify worker
- New job created → email customer confirmation
- Job 24hrs away → reminder to customer + worker
- Invoice overdue → auto payment reminder

### ~~Website-to-App Lead Tracking~~ ✅ DONE
- Leads table with status lifecycle (new → contacted → qualified → proposal → converted → lost)
- Admin UI at /leads with stat cards, search, status/source filters, add/edit/delete modals
- Public API: POST + GET /api/v1/leads authenticated via Bearer API key
- lead.created webhook event fires on new leads from API

---

## 🤖 AI FEATURES — PRE-LAUNCH (Build alongside core features)

Full detail in: `AUTONYX_AI_FEATURES_ROADMAP.md`

### 1. Voice-First Field Data Entry
Worker speaks, AI fills all fields. Works for any trade.
**Status: Not started**

### 2. Photo Compliance Checker
Flags objective issues only (missing photos, wrong materials, missing FRL match).
Max 1 alert per room. Never picky. Admin always dismisses easily.
**Status: Not started**

### 3. Natural Language Business Intelligence
Type a question, get an answer. No filters, no reports.
**Status: Not started**

### 4. Defect-to-Quote Pipeline
Inspection defects → auto defect report + remediation quote → customer approves in portal → job created.
**Status: Not started**

### 5. In-App AI Help Assistant
- Small AI chat icon (bottom-right corner) for admins
- Trained specifically on our app — knows every feature, page, and workflow
- Helps admins navigate, find features, and understand how to use things
- In-app support bot that eliminates the need for documentation/manuals
**Status: Not started**

---

## 💬 IN-APP MESSAGING & NOTIFICATIONS — PRE-LAUNCH MVP

### In-App Messaging & Notifications
A chat interface inside the app so users can talk to each other and receive system events without relying on email.

**Two-way conversations:**
- Workers ↔ admins/managers — workers ask questions on the fly ("which sealant for this penetration?"), admins reply from the dashboard
- Admins ↔ clients (optional) — opt-in chat surface inside the customer portal for clients who want it
- Conversations scoped per job where relevant (chat thread visible from job detail page) and a separate "general" inbox

**System notifications inside the app (replaces worker emails):**
- job.assigned — "You've been assigned to [job]"
- job.reminder — day-before reminder for scheduled jobs
- job.updated — admin changes scheduled time, location, or evidence requirements
- New chat message indicator

**UX:**
- Notification bell in top nav with unread badge
- Workers get the same surface on mobile (worker bottom-nav inbox)
- Once the app is on the App Store, push notifications hook into this same channel — no separate plumbing
- Read/unread tracking per user

**Why this exists separately from email:**
- Workers don't open email; they live in the work app
- Customers/admins still get email for invoice events; workers get in-app notifications instead
- Sets up for App Store push notifications as a single delivery layer

**Status: Not started**

---

## 🚀 AI FEATURES — POST-LAUNCH (Build during growth phase)

### 6. AI Customer Portal Assistant
Customers chat with their job data. Zero admin effort.

### 7. Predictive Materials Ordering
AI forecasts materials needed before job starts based on historical data.

### 8. AI Job Profitability Coach
Plain-English debrief + recommendations after every completed job.

### 9. Smart Scheduling AI
Assistant mode only. Admin always decides. Surfaces overtime risk, certifications, availability.
No auto-assign. No location tracking. Workers keep their freedom.

### 10. Compliance Risk Score + Auto-Outreach
Per-building risk score. Auto-sends inspection reminders when due dates approach.
= Automated recurring revenue engine.

### 11. AI Site Walk Scoping
Worker records 60-second video. AI identifies penetrations, maps to rooms, generates quote.
= The demo that makes competitors say "buy or be crushed."

---

## 📋 POST-LAUNCH FEATURES (Non-AI)

- Dark mode
- Customer accounts (portal currently magic-link only)
- Mobile app (same Supabase backend, separate app)
- SMS notifications via Twilio
- Carbon footprint tracking per job (commercial clients increasingly require this)

---

## 🏗️ BUILD ORDER SUMMARY

| Phase | What |
|-------|------|
| Done | Parts & Products, Dashboard charts, Xero OAuth, Webhooks + API, Customer Portal, Lead Tracking, Company Branding, Report Overhaul (PDF/spreadsheet/doc/interactive HTML), Drawings Tab, Evidence Field Categories, Pin Scaling on Zoom, Drawing Prefix System, Partial/Progress Invoicing, Standalone Interactive Drawing Export, Email Notifications (admin/customer events), Schedule/Calendar Work Hub (mixed jobs+events, recurring jobs, iCal feed, email digests) |
| Now | In-app messaging & notifications |
| Next | Stripe billing |
| Pre-launch AI | Voice entry, Photo checker, Natural language BI, Defect-to-quote, In-app AI assistant |
| Post-launch | AI portal assistant, Predictive materials, Profitability coach |
| Post-launch | Smart scheduling AI, Compliance risk score, AI site walk |
| Post-launch (non-AI) | Dark mode, Mobile app, Customer accounts, SMS |

---

## 💡 The One-Sentence Pitch

> *"We don't just manage jobs. We make every job smarter — from the moment you walk a site to the moment a customer pays an invoice — using AI that the entire industry is still too slow to build."*
