# AUTONYX — What We're Building Next

> Last updated: 30 April 2026 (Pin scaling on zoom + zoom-to-cursor + Drawings pin detail completed)
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

---

## 🔨 IMMEDIATE NEXT (Pre-Launch Core)

### Standalone Drawing Export
- Separate export of just floor plan drawings with pins (not part of the main report)
- Grouped by building, one drawing per level
- Interactive — viewer can zoom in
- Pins must scale when zooming (not stay oversized) so exact placement is visible

### Drawing Prefix System
- Each level/drawing gets a configurable **prefix** (e.g. "L1-", "L2-", "GF-")
- When a worker logs a penetration on that level, the penetration label **automatically gets the prefix** applied
- Enables filtering/grouping exports by level — one spreadsheet per level based on prefix
- Prefix is set by admin when configuring levels in the building structure

### ~~Evidence Field Categories & Default Questions~~ ✅ DONE
- Two main job categories: Certification and Inspection
- Subcategories per category (e.g. Penetration Sealing, Fire Collar, Fire Door)
- Admin picks category at job level; worker picks subcategory per penetration
- Template questions load dynamically based on worker's subcategory selection
- Admin can still add custom questions via Setup tab
- Different penetrations in same job can have different subcategories

### Partial/Progress Invoicing + Invoice Creation from Invoices Page
- Big jobs need monthly invoices instead of one invoice at the end
- Multiple invoices against the same job over time (progress billing)
- Track total invoiced vs total job value
- **Create invoices from the /invoices page** (not only from inside the job detail page)
- "New Invoice" button on invoices list page → select a job → choose scope: full job or partial (e.g. "first month", "work completed so far")
- Job selection shows job title, job number, customer, and how much has already been invoiced
- Keep the existing "Generate Invoice" button on the job cost tab as well (both paths work)

### ~~Dedicated Drawings Tab~~ ✅ DONE
- Drawings moved to own tab on job detail page
- Zoom constrained: min 1x, pan boundaries prevent losing drawing off-screen

### ~~Pin Scaling on Zoom~~ ✅ DONE
- Pins scale inversely with zoom (effectivePinSize = pinSize / scale, min 8px floor)
- Badge text and label also scale proportionally (lowered internal Math.max floors)
- Zoom-to-cursor: refactored useZoomPan to single atomic state (scale + x + y in one useState) — eliminates React batching drift
- Pin detail panel on Drawings tab: clicking a pin shows full penetration details (evidence fields, photos with lightbox, subcategory, room, timestamp)
- Still TODO: pin scaling in exported drawings/reports (standalone drawing export)

### ~~Company Settings & Branding~~ ✅ DONE
- Company settings page, logo upload, brand colours, company details, credentials/licences
- PDF report footer branded with company details + credentials
- Still TODO: apply branding to invoices, customer portal, email notifications

### Scheduling/Calendar
- "Schedule" tab already exists as placeholder — needs to be built
- Calendar view showing jobs by date
- Drag-and-drop job assignment to workers
- Day/week/month views
- Visual indicator for worker availability and conflicts

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
| Done | Parts & Products, Dashboard charts, Xero OAuth, Webhooks + API, Customer Portal, Lead Tracking, Company Branding, Report Overhaul (PDF/spreadsheet/doc), Drawings Tab, Evidence Field Categories, Pin Scaling on Zoom |
| Now | Standalone drawing export |
| Now (parallel) | Drawing prefix system |
| Next | Partial invoicing, Scheduling/calendar, Stripe billing |
| Next (parallel) | Email notifications |
| Pre-launch AI | Voice entry, Photo checker, Natural language BI, Defect-to-quote, In-app AI assistant |
| Post-launch | AI portal assistant, Predictive materials, Profitability coach |
| Post-launch | Smart scheduling AI, Compliance risk score, AI site walk |
| Post-launch (non-AI) | Dark mode, Mobile app, Customer accounts, SMS |

---

## 💡 The One-Sentence Pitch

> *"We don't just manage jobs. We make every job smarter — from the moment you walk a site to the moment a customer pays an invoice — using AI that the entire industry is still too slow to build."*
