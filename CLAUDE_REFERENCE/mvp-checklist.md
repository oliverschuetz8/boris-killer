# Better-BORIS App: Must-have Checklist

> Version: 2026-02-16 | Purpose: Non-negotiable features for a simpler BORIS alternative (compliance + customer-friendly).

---

## Product/UX (simplicity)

- [ ] Simple Mode / Advanced Mode toggle (advanced features hidden by default; progressive disclosure)
- [ ] Role-based home screens (Owner/Dispatcher vs Field Tech vs Customer)
- [ ] One 'Job Page' that shows everything (status, tasks/forms, photos, notes, approvals, report, invoice)
- [ ] Fast onboarding wizard (company setup + templates loaded in minutes)
- [ ] Template library (industry packs: passive fire / inspections / compliance)

---

## Core workflow (quote -> job -> proof -> invoice)

- [ ] Clients + Sites (one client, multiple locations, contacts, history)
- [ ] Quote builder (services + materials + labor, reusable items, client approval)
- [ ] Scheduling/dispatch (calendar drag & drop + assign techs)
- [ ] Mobile-first job execution (start/finish, checklists, photos, signatures)
- [ ] Invoice generation from job (time/materials -> invoice draft)
- [ ] Payment link option (Stripe or similar, even if simple at MVP)

---

## Niche wedge (what makes us better than BORIS)

- [x] Customer Proof Portal (dead simple: timeline, status, photos, downloads, approve/sign)
- [ ] Evidence -> Report automation (auto-generate branded report with photos + timestamps + signatures)
- [ ] Report overhaul: 4 penetrations per page, photo + evidence data + cropped floor plan close-up per penetration
- [ ] Multiple export formats: PDF, spreadsheet (Excel/CSV), document (.docx for Google Docs)
- [ ] Standalone drawing export: interactive, zoomable pins, grouped by building
- [ ] Automatic status updates (email/SMS: booked -> on-site -> completed -> report ready)
- [x] Floor plan drawings with pin mapping (LEGALLY REQUIRED for AS1851 — admin uploads drawings per level, workers pin evidence locations, report includes annotated drawings)

---

## Parts & Products (materials rework)

- [x] Parts catalogue (individual items: name, subcategory, buy cost, sell price, margin, supplier, unit)
- [x] Products catalogue (bundles of parts with calculated cost/margin)
- [x] Smart naming convention suggestions
- [x] Filter by subcategory, supplier, name search
- [x] Bulk edit (change margin/price for filtered selection)
- [x] Workers log parts or products during execution (no prices visible to workers)

---

## Dashboard & Reporting

- [x] Dashboard charts (job status pie chart, completion rate, revenue summary, worker activity)
- [x] Modern visualisations (Recharts or similar — not dated like BORIS)

---

## Evidence Fields & Categories

- [ ] Two main job categories: Certification and Inspection (replaces/refines job_type)
- [ ] Subcategories under each category (specific list TBD from boss)
- [ ] Default questions per subcategory (workers see automatically)
- [ ] Admin can still add custom questions per job on top of defaults

---

## Invoicing Enhancements

- [ ] Partial/progress invoicing (multiple invoices per job, monthly billing for large jobs)
- [ ] Create invoices from /invoices page (select job, choose full or partial scope) — not only from job detail

---

## Drawings & Pins

- [ ] Dedicated Drawings tab on job detail page (moved from Structure tab)
- [ ] Drawing prefix system (auto-label penetrations per level, e.g. "L1-001")
- [ ] Pin scaling on zoom (pins scale with drawing, not stay oversized)

---

## Company Setup

- [ ] Company settings & branding (logo, colours, name, address, ABN)
- [ ] Branding applied to reports, invoices, customer portal, emails

---

## Website & Leads

- [ ] Website inquiry form → app lead tracking (conversion funnel visibility)

---

## Field ops essentials

- [ ] Offline mode (full job + forms + photos offline; reliable sync indicator)
- [ ] Map view (jobs + tech locations; basic ETA/traffic via maps)
- [ ] Time tracking (per job; export-ready)
- [ ] Photo + annotation (markups, labels, before/after)

---

## Compliance & audit trail

- [ ] Custom forms builder (mandatory fields, photo required, signature required, logic rules)
- [ ] Audit log (who did what/when/where; GPS/time stamps)
- [ ] Recurring inspections/PPM (auto-create future jobs + reminders)

---

## Integrations (must be click-to-connect)

- [x] Xero/MYOB/QuickBooks (at least export + ideally 2-way invoice sync)
- [ ] Google/Outlook calendar sync
- [x] Zapier/Make/n8n hook (webhooks + API from day one)

---

## Admin/permissions

- [ ] Permissions & roles (company admin, office, tech, customer)
- [ ] Multi-site / multi-contact access (customer sees only their sites/jobs)
- [ ] File storage (plans, certificates, photos; organized per job/site)

---

## AI Features (pre-launch)

- [ ] In-app AI help assistant (bottom-right chat icon, trained on our app, helps admins navigate)

---

## Non-functional (you will lose without these)

- [ ] Speed (job page + reports do not lag even with lots of photos)
- [ ] Reliable reporting engine (PDF generation that does not break on big jobs)
- [ ] Clean mobile UX (big buttons, minimal taps, 'today view' for techs)

---

## MVP cut rule

Keep the wedge first: **Customer Proof Portal + Floor Plan Drawings + Parts & Products + Report Overhaul (PDF/spreadsheet/doc) + Evidence Categories + Company Branding + Dashboard Charts + Schedule + Drawing Prefix + Pin Scaling + Partial Invoicing + Integrations**. Push everything else to phase 2.
