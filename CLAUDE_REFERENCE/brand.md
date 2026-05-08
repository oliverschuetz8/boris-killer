# Brand Identity & Voice

> Last Updated: 8 May 2026 | Project: AUTONYX (codename: BORIS Killer) | Status: Foundation document — name + logo TBD

> **Single source of truth for brand voice, tone, vocabulary, visual identity, and microcopy patterns. Used by humans AND AI when generating ANY user-facing copy, design, or naming decision. If a surface conflicts with this file, the surface is wrong.**

---

## TL;DR

We are an **Australian field service & job management SaaS for tradies**. Built first for **passive fire protection** companies (compliance-driven, evidence-heavy work), architected to be **trade-agnostic** and scale globally.

The brand is **plain English**, **modern but understated**, **peer-respectful**, **anti-jargon (except earned)**, **calm-confident**. Slate base + blue accent + a soft pastel category palette. Two voice modes — **warm-casual on worker mobile**, **warm-professional on admin desktop** — sharing one spine.

We are NOT: aggressive, hyped, "we're so excited!", emoji-heavy, gamified, or condescending to the trade.

---

## ⚠ TBD slots

**These two assets do not yet exist. Until they do, leave them empty in code (NEVER fall back to AUTONYX) and use the placeholder tokens below in any documentation:**

| Asset | Status | Placeholder token |
|---|---|---|
| **App name** | Not yet chosen — domain availability is the gating constraint (`.com` + `.com.au` both required) | `[APP_NAME_TBD]` |
| **Wordmark / logo** | Not yet designed — depends on name | `[LOGO_TBD]` |
| **Favicon** | Not yet designed | `[FAVICON_TBD]` |

**When the name is chosen**, update this file's TBD section, then run a global find-and-replace across the codebase (the [Brand Fix Backlog memory](../.claude/projects/.../memory/project_brand_fix_backlog.md) tracks the affected files).

**Internal codename "BORIS Killer"** is fine in `CLAUDE.md`, code comments, commit messages, and this memory system. **Never customer-facing.**

---

## 1. Mission & Positioning

### What we are
Field service and job management software for Australian SMB construction and trade companies. We turn paperwork-heavy jobs (penetration sealing, fire collars, compliance inspections, multi-trip jobs) into structured digital evidence — trackable, exportable, customer-presentable.

### Wedge: passive fire protection
Year 1 GTM is fire-only. Marketing speaks fire fluently (penetrations, FRL, AS1851, fire collars, fire boards). Once we hit ~10 happy fire clients, we expand to active fire → asbestos → HVAC → electrical/plumbing → general construction.

**Important brand rule:** the *language and architecture* stay trade-agnostic (jobs, sites, levels, rooms, evidence — work for any trade). Only the *marketing positioning* gets niche-specific. When we expand, we swap marketing copy; the brand voice doesn't change.

### Anti-positioning
We do NOT define ourselves by competitors. "BORIS Killer" is a working codename — never customer-facing, never a comparison phrase, never name-dropped. If we're better than BORIS, customers will discover that themselves.

### One-liner positioning options (pick later)
- *"Run jobs, capture evidence, get paid. No paperwork."*
- *"The simple way to run a fire-protection business."*
- *"Built for tradies who'd rather be on the tools than in spreadsheets."*

---

## 2. Audience — three tiers

We design for three distinct humans. Each gets a different voice, density, and visual treatment.

### Tier 1: The Admin (primary buyer + most-used desktop user)
- **Who**: owner-operator or office manager. 30s–50s. Australian SMB.
- **Where**: desktop, planning mode, 9am–5pm, often spreadsheets open in another tab.
- **State of mind**: time-poor, software-skeptical, has been burned by "all-in-one" tools that became unusable.
- **What they want**: control without complexity. Big-picture views, fast lookups, no surprises.
- **Voice for them**: **warm-professional, factual, calm-confident**. No emoji. No hype. Specific verbs. AU spelling.

### Tier 2: The Tradie (primary daily field user)
- **Who**: tradesperson on site. 20s–50s. Phone in pocket, gloves on, time pressure.
- **Where**: mobile-only (phone screen, often outdoors, often gloves on).
- **State of mind**: hates paperwork, hates anything slow, will abandon software that gets in the way.
- **What they want**: tap → done. Big buttons, plain words, zero decision fatigue.
- **Voice for them**: **warm-casual, terse, peer-respectful**. Single 👋 allowed in greetings only. No exclamation marks. No instructions written by people who've never done the job.

### Tier 3: The Customer (read-only via portal — the *client* of our client)
- **Who**: builders, head contractors, building owners, insurers, certifiers receiving compliance reports.
- **Where**: portal link from email, no login.
- **State of mind**: skeptical, wants proof, doesn't want to learn software.
- **What they want**: quick visual confirmation that work was done correctly.
- **Voice for them**: **clean, neutral, factual**. Industry terms used confidently (penetration, evidence, compliance). No marketing voice — they're not our customer, they're our customer's customer.

---

## 3. Voice — five principles (the spine)

These principles tie all surfaces and tones together. Every line of copy across the app should pass all five.

### 3.1 Plain English over jargon (except *earned* jargon)
- **Banned**: "leverage", "synergy", "robust", "best-in-class", "enterprise-grade", "powerful", "seamless"
- **Banned**: database-internal terms — "subcategory", "template field", "evidence_template_field", "industry pack", "default value"
- **Earned (KEEP)**: penetration, fire collar, fire-rated, FRL, AS1851, evidence, compliance, certifier — these signal trade credibility
- **Test**: would a tradie at a smoko break understand it?

### 3.2 Short over long
- Every UI string passes "could this be 3 words shorter?"
- Headlines under 10 words, button labels 1–3 words, error messages 1 sentence + suggested action
- Two short sentences beat one long one

### 3.3 Direct over hyped
- **Banned**: "We're so excited", "Amazing!", "Welcome to the future of...", "Get ready to...", "🎉"
- **Default**: state what's true, then say what to do next
- Confidence is shown by *not* having to oversell

### 3.4 Peer-respectful, never condescending
- Tradies are masters of their craft. Software is the apprentice.
- Never explain how to do their job. Explain how to do *the software*.
- Never patronize ("Oops! Something went wrong 😅") — talk like an adult to an adult

### 3.5 Australian, not American
- **Spelling**: colour, catalogue, organise, optimise, licence (noun), license (verb)
- **Currency**: A$1,234.56 always (never $ alone, never USD)
- **Dates**: en-AU formatting (`8 May 2026`, never `5/8/26`)
- **Idiom OK**: "sorted", "g'day" (sparingly, only worker mobile), "across" (as in "across the team")
- **Idiom not OK**: "bloody", "mate" (too cute in writing), American spellings anywhere

---

## 4. Tone modulation matrix — by surface

The voice principles are constant. The *tone dial* shifts per surface. This table is the source of truth.

| Surface | Tone | Density | Emoji? | Example |
|---|---|---|---|---|
| **Marketing / landing** | Confident, fire-explicit (Year 1), peer-coded | Hero short, proof rich | No | *"Run fire jobs, capture evidence, get paid."* |
| **Login / signup** | Neutral-helpful, low friction | Minimal | No | *"Create your account. 30-day trial, no card."* |
| **Onboarding** | Hand-held, question-driven, warm | One question per screen | No (icons not emoji) | *"What kind of work do you mostly do?"* |
| **Worker today / mobile** | Warm-casual, terse | Big buttons, minimal text | 👋 once, only in greeting | *"Hey Oliver 👋 — you've got 3 jobs today."* |
| **Worker execute (action)** | Terse, direct | One thing on screen | No | *"Take photo"*, *"Mark room done"* |
| **Admin desktop** | Warm-professional, factual | Information-dense OK | No | *"Good morning, Oliver. Here's what's happening at Acme today."* |
| **Customer portal** | Clean, neutral, factual | Spacious | No | *"Evidence & Documentation. Tap a pin to see details."* |
| **Email — internal events** | Brief, sometimes warmly casual | Short body | No | *"Nice — INV-2026-001 has been paid."* |
| **Email — to customer** | Polite, helpful, low pressure | Standard transactional | No | *"Hi Sarah, please find your invoice details below."* |
| **Email — overdue chase to customer** | Apologetic-friendly, no pressure | Short, gentle | No | *"Just a friendly reminder — if you've already arranged payment, please ignore this."* |
| **Errors** | Factual, never blamey, ALWAYS suggest next step | One sentence + action | No | *"Couldn't save the job — check your internet and try again."* |
| **Confirmations** | Calm, specific verb, never melodramatic | One question | No | *"Delete this invoice? This can't be undone."* |
| **PDF report (customer-facing)** | Professional, building-owner-presentable | Dense, structured | No | Compliance-document register |

**Rule**: when in doubt about a surface's tone, ask "which audience tier sees this?" and shift toward their voice.

---

## 5. Vocabulary — do / don't

### 5.1 Words for people

| Concept | DO use | DON'T use | Where |
|---|---|---|---|
| Field user (AU customer-facing) | **Tradie** | worker, employee, staff, "your guys" | Marketing, onboarding, dashboard labels, emails to admin |
| Field user (admin context, neutral) | **Team member** | worker, staff, employee | Admin UI when describing the crew |
| Field user (international, future) | **Tech** or **Field tech** | tradie (US/EU don't say it) | Future US/EU localization |
| Field user (technical/code) | `worker` | (no change) | Code, RLS roles, role check `userRole === 'worker'` |
| Buyer | **Admin** or **Manager** (job titles) | "owner-operator" (too HR), "user" (too generic) | UI roles, settings |
| End-customer | **Customer** | client, account, recipient | Everywhere — never "client" |
| Customer's customer (portal viewer) | **Customer** still | "viewer", "guest" | Portal copy |

### 5.2 Words for things

| Concept | DO | DON'T |
|---|---|---|
| Unit of work | **Job** | ticket, task, work order, project |
| Where work happens | **Site** | location, address, place, project |
| Building component | **Building → Level → Room** | floor (use *level*), unit, suite |
| The thing being sealed/inspected | **Penetration** (industry-correct) | hole, opening, point |
| Proof of work done | **Evidence** | photos+notes, data, record |
| Pre-built question template | **Default question** | "template field", "evidence template field" |
| Custom field admin adds | **Custom question** | "evidence field", "field" alone |
| Trade-specialty config | **Trade preset** | "industry pack", "work type pack" |
| Materials catalogue | **Parts** (individual) and **Products** (bundles) | "items", "SKUs", "stock" |
| Schedule entity | **Job** (if real job) or **Event** (meeting/call/etc.) | "appointment", "task", "calendar item" |
| Paid invoice | "Marked paid" / "Paid" | "settled", "cleared" |

### 5.3 Words for actions (button labels & verbs)

Sentence case always. Specific verbs over generic.

| DO | DON'T |
|---|---|
| Start job | Begin, Initiate, Kick off |
| Save changes | Submit, OK, Update |
| Send invoice | Send, Submit, Process |
| Mark room done | Complete, Finish, Close |
| Delete invoice | Remove, Discard |
| View report | See, Open, Show |

### 5.4 Banned phrases (never ship these)

- *"Powered by AI"*, *"AI-driven"*, *"Smart"* (vague)
- *"Industry-leading"*, *"World-class"*, *"Best-in-class"*
- *"Seamlessly"*, *"Effortlessly"*, *"Magically"*
- *"We're so excited to..."*, *"Get ready to..."*, *"Welcome to the future of..."*
- *"10x simpler than [competitor]"*, *"Everything [competitor] does, but..."* — and any variant
- *"Click here"* — link the actual verb instead
- *"Oops!"* / *"Uh oh!"* — talk to adults like adults
- *"Failed to X"* — replace with what/why/how (see section 8)

---

## 6. Visual identity

### 6.1 Color palette

#### Primary
| Token | Hex | Use |
|---|---|---|
| **Brand blue** | `#2563eb` (Tailwind `blue-600`) | Primary CTAs, links, focus rings, brand accent everywhere |

#### Neutrals — **slate scale only**
| Token | Hex | Use |
|---|---|---|
| `slate-50` | `#f8fafc` | Page background, subtle row hovers |
| `slate-100` | `#f1f5f9` | Card sub-sections, dividers |
| `slate-200` | `#e2e8f0` | Card borders, separators |
| `slate-400` | `#94a3b8` | Muted icons, helper text |
| `slate-500` | `#64748b` | Secondary text |
| `slate-700` | `#334155` | Body text |
| `slate-800` | `#1e293b` | Headings, primary text |
| `slate-900` | `#0f172a` | Top nav, strongest text |

**Hard rule**: NEVER use Tailwind `gray-*`. The brand uses `slate-*` only. Existing `gray-*` usages on auth pages are tech debt — listed in the [Brand Fix Backlog](.) for cleanup.

#### Secondary palette — the Pastel Category System
This is the brand's **distinctive visual asset**. Use these — and *only* these — wherever something needs category-color-coding (calendar, settings sections, onboarding cards, dashboard categories, marketing illustrations). Each pastel has a soft background + a strong edge color.

| Category color | Soft (bg) | Strong (edge / icon) | Used for |
|---|---|---|---|
| **Slate-blue** | `#e0e7ff` | `#6366f1` | Jobs (default), generic event |
| **Mint** | `#d1fae5` | `#10b981` | Meetings, completion, success |
| **Peach** | `#fed7aa` | `#f97316` | Calls, in-progress, attention |
| **Butter** | `#fef3c7` | `#f59e0b` | Reminders, warnings (soft) |
| **Lemon** | `#fef9c3` | `#eab308` | Tasks |
| **Lavender** | `#ddd6fe` | `#8b5cf6` | Material delivery, logistics |
| **Pink** | `#fce7f3` | `#ec4899` | Interviews, people-touching |
| **Slate-grey** | `#e2e8f0` | `#64748b` | Focus blocks, neutral category |

#### Status colors (semantic, not category)
| Status | Color |
|---|---|
| Scheduled | Blue (`#3b82f6`) |
| In progress | Yellow (`#eab308` / `#f59e0b`) |
| Completed / Paid | Green (`#22c55e` / `#10b981`) |
| On hold | Orange (`#f97316`) |
| Cancelled | Slate-grey (`#64748b`) |
| Draft | Slate-light (`#94a3b8`) |
| Urgent / Error | Red (`#ef4444`) |

### 6.2 Typography

| Surface | Font | Reason |
|---|---|---|
| Web app | **Geist Sans** (Vercel's geometric humanist sans) | Modern, minimal, calm — fits brand |
| Web app monospace | **Geist Mono** | Code/IDs/numbers when needed |
| PDF reports | **Helvetica / Helvetica-Bold** | Universal PDF-renderer compatibility |
| Email templates | **Helvetica, Arial, sans-serif** | Email-client safe |
| HTML drawing export | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial` | Native OS feel, offline-friendly |

**Type scale (web)**:
- Page titles (list pages): `text-3xl` (1.875rem) bold slate-900
- Page titles (detail/form pages): `text-2xl` (1.5rem) bold slate-900
- Section headings (in cards): `text-base` or `text-sm` semibold slate-800
- Body: `text-sm` (0.875rem) slate-700
- Helper / muted: `text-xs` slate-500
- All-caps section labels (sparingly): `text-xs uppercase tracking-wider` slate-400

### 6.3 Iconography

- **Lucide React only.** Never mix icon libraries.
- Default size: `w-4 h-4` for inline, `w-5 h-5` for buttons, `w-6 h-6` for headers/empty states
- Default stroke weight (1.5–2px). Never filled icons.
- Color: `text-slate-400` muted, `text-blue-600` primary, color matched to status pill or pastel category as needed
- **No emoji except** 👋 in worker mobile greeting only (one instance, intentional warmth)

### 6.4 Cards & layout

- **Default container**: `bg-white rounded-xl border border-slate-200`
- **Card padding**: `p-4` (compact) to `p-6` (spacious). NEVER edge-touching content.
- **Card sub-sections**: `divide-y divide-slate-100`
- **Page wrapper (admin)**: `w-full px-8 py-8` — never `max-w-*`
- **Page wrapper (worker mobile)**: `max-w-lg mx-auto px-4 py-6 pb-24` (clear bottom nav)
- **Top nav**: `bg-slate-900` (dark, strong contrast against light page)
- **Worker bottom nav**: `bg-white border-t border-slate-200`

---

## 7. UI copy patterns

### 7.1 Buttons & CTAs

- **Sentence case**, always. *"Start job"* not *"Start Job"*.
- **Specific verbs**: *"Save changes"*, *"Send invoice"*, *"Mark room done"* — not *"Submit"*, *"OK"*, *"Done"*.
- **Length**: 1–3 words ideal. 4 max.
- **Primary CTA**: blue-600 background, white text. One per screen ideally.
- **Secondary**: slate-800 background or outline.
- **Destructive**: red-600 background or red text only — never red default state for non-destructive actions.

### 7.2 Empty states (the 2-line pattern)

Always two lines: **state of the world** + **next step**.

```
No customers yet.
Add your first customer to get started.
```

```
No jobs scheduled today.
Check back later or create a new job.
```

```
No evidence logged yet.
Evidence will appear here once work begins.
```

### 7.3 Errors — what / why / how

Per [Actionable Error Messages memory](../.claude/...): every error answers *what failed*, *why*, *how to fix*. No "Failed to X". No "Something went wrong".

```
✓ Couldn't save changes — check your internet and try again.
✓ This invoice can't be deleted because payments are linked to it. Cancel the invoice instead.
✓ This job is already in progress, so it can't be deleted. Mark it cancelled or completed first.

✗ Failed to save.
✗ An error occurred.
✗ Error: 23503
```

### 7.4 Confirmations

State the **outcome**, then **Cancel / [verb]**.

```
Delete this invoice?
This can't be undone.
[Cancel]  [Delete invoice]
```

Never *"Are you sure?"* alone — always say what happens.

### 7.5 Toasts

- Bottom-right or bottom-center, 4–5 second auto-dismiss
- One sentence, sentence case
- ✅ Success: *"Invoice sent."* / *"Job started."* / *"Photo uploaded."*
- ⚠️ Warning: *"This worker is double-booked at 2pm."*
- ❌ Error: same what/why/how rule as section 7.3

### 7.6 Status pills

- **Visual**: rounded-full, small, soft-bg + strong-text combo
- **Text casing**: sentence case in UI, even when DB stores `in_progress` → display *"In progress"*
- Use the **status colors** from section 6.1, NOT the pastel category palette

### 7.7 Placeholders (input)

- Use Unicode ellipsis `…`, never ASCII `...`
- Sentence case
- Examples, not instructions: *"e.g. Acme Construction Pty Ltd"* not *"Type your company name here"*

### 7.8 Dates, times, currency

- **Dates**: en-AU, `8 May 2026` format, never `5/8/26` or US format
- **Times**: 12-hour with `am`/`pm` lowercase, AEST default (`Australia/Sydney`)
- **Currency**: `A$1,234.56` always — explicit AUD. Two decimals.
- **Numbers**: `1,234,567` (thousands separator)
- **Phone**: keep as entered (don't auto-format AU phone numbers — admins paste from various formats)

---

## 8. Email standards

### 8.1 Structure (every transactional email)

1. **Branded header** — company logo on primary color band
2. **Heading** — short, descriptive, sentence case
3. **Salutation** — *"Hi {first_name},"* (with trailing comma)
4. **Body** — one short paragraph + details table
5. **CTA button** — primary verb (*"View invoice"*, *"Open job"*)
6. **Sign-off** — *"Thanks,"* (transactional) or none (event notifications)
7. **Branded footer** — company contacts, ABN, credentials, **AUTONYX line**

### 8.2 AUTONYX visibility in email

**Subtle line in the footer**, muted text, above the company contact block:

> *"[App Name] is part of AUTONYX."*

Never in subject lines, never in headers, never in CTAs. Pattern matches Stripe/Atlas, Linear/ARC, Notion/Notion Labs.

### 8.3 Subject lines

- Sentence case
- No emoji
- Identifying detail in subject (job number, invoice number, customer name)
- Length: under 60 characters ideal

```
✓ "Invoice INV-2026-001 from Acme Fire"
✓ "Job J-204 has been completed"
✓ "Reminder: Site visit at 2pm"
✓ "Your day — Wednesday, 8 May"

✗ "🎉 You've got mail!"
✗ "Important: please read"
✗ "Re: re: re: invoice"
```

### 8.4 Email tone variants (already mapped in section 4)

Internal-warm, customer-polite, customer-overdue-apologetic. Refer to tone matrix.

---

## 9. PDF & document standards

### 9.1 Visual

- **Header**: company logo (left) + job number (right) on a 2px border-bottom in company **primary color** (default brand blue if not set)
- **Footer** (every page): company name + ABN + contact + credentials + page number
- **Body**: slate-800 text on white. Building → level → room hierarchy with dark-slate building headers
- **Pin overlays** on floor plan crops: red dot, white border, label

### 9.2 Voice for PDF

- Building-owner-presentable. The customer's customer might be reading.
- Factual, structured, dense-ok
- No marketing voice. No "We're proud to present..."
- Title format: *"Completion Report — J-204 — Acme Fire"*

### 9.3 NEVER

- Default to AUTONYX as company name fallback (currently a bug — listed in Brand Fix Backlog)
- Mix fonts within document (Helvetica only)
- Include internal codename "BORIS Killer" anywhere

---

## 10. Naming conventions — database vs UI

The database has perfect technical names. The UI should never expose them.

| Database term | UI translation |
|---|---|
| `evidence_subcategories` | "Type" (worker) / "Subcategory" → reconsider, prefer "Penetration type" |
| `evidence_template_fields` | "Default questions" |
| `job_evidence_fields` | "Custom questions" |
| `job_material_defaults` | "Default materials" |
| `field_values` | (never user-visible — internal only) |
| `floorplan_label` | "Pin" or "Pin label" |
| `industry_pack` / `work_type_pack` | "Trade preset" |
| `room_materials` | "Materials" |
| `evidence_categories` | "Job categories" (admin) |

**Rule**: any database term containing `_field`, `_template`, `_category`, `_subcategory`, `_default`, `_pack` is internal. Translate before showing to users.

---

## 11. AUTONYX visibility rules

| Surface | Show AUTONYX? | How |
|---|---|---|
| App top nav (logged-in user) | **No** | Show user's company name only. Never AUTONYX as fallback — empty if missing. |
| Customer portal footer | **Yes** | *"Powered by AUTONYX"* in muted text |
| Email footer | **Yes** | *"[App Name] is part of AUTONYX."* — muted line, single instance |
| Email subject / header | **No** | App name + company name only |
| PDF / document reports | **No** | Company-only branding (the buyer's brand, not parent's) |
| iCal feed `PRODID` | **Yes** (technical) | `PRODID:-//AUTONYX//[App Name]//EN` — invisible to most users |
| Marketing site | TBD | Decided in landing-page chat. Likely small footer mention. |
| Sign-up / login | **No** (initially) | App name only — keep parent invisible at first impression |

---

## 12. AI prompting block (copy-paste ready)

> Use this block as the SYSTEM prompt or the leading context paragraph whenever you ask any LLM to write copy, generate UI, or produce content for this product.

```
You are writing for [APP_NAME_TBD], an Australian SaaS for tradies running construction
and trade jobs. Year 1 audience: passive fire protection companies. Architecture
trade-agnostic; brand voice trade-agnostic too.

VOICE PRINCIPLES (apply to every line):
1. Plain English over jargon — except earned trade jargon (penetration, FRL, AS1851,
   evidence, fire collar are FINE; subcategory, template, pack, leverage, synergy
   are BANNED).
2. Short over long — every string passes "could this be 3 words shorter?"
3. Direct over hyped — never "We're so excited", "Amazing!", "🎉", or marketing puffery.
4. Peer-respectful — tradies are masters; software is the apprentice. Never patronize.
5. Australian, not American — "colour", "catalogue", "organise"; A$1,234.56; 8 May 2026.

VOCABULARY:
- People (AU customer-facing): "tradie" (field user), "team member" (admin context),
  "customer" (never "client"), "admin"/"manager" for buyers.
- Things: "job" (never ticket), "site" (never location), "building → level → room",
  "penetration" (kept), "evidence" (kept), "trade preset" (never "industry pack").
- Database terms NEVER appear in UI: subcategory, template, field, pack, default_value.

TONE BY SURFACE:
- Worker mobile: warm-casual, terse, single 👋 in greeting only, no other emoji.
- Admin desktop: warm-professional, factual, no emoji.
- Customer portal: clean, neutral, factual.
- Email transactional: polite, helpful, "Hi {name}," / "Thanks,".
- Errors: factual, never blamey, ALWAYS say what failed + why + how to fix.

UI RULES:
- CTAs are sentence case ("Start job", not "Start Job"). Specific verbs. 1-3 words.
- Status pills: sentence case display ("In progress", not "in_progress").
- Empty states: 2 lines — state of world + next step.
- Use Unicode "…" never ASCII "...".

NEVER:
- Reference "BORIS", "BORIS Killer", or compare to competitors.
- Use "AUTONYX" as a fallback for company name (use empty if missing).
- Use Title Case CTAs.
- Use "gray-*" Tailwind classes (use "slate-*").
- Write "Failed to X" or "An error occurred" or "Something went wrong".
- Use 🎉, 🚀, ✨, or similar hype emoji. The only allowed emoji is 👋 in worker greeting.
- Promise features that don't exist or use vague terms like "smart", "AI-driven",
  "industry-leading".

WHEN UNSURE:
Pick the option a non-technical Australian tradie would find clearer, calmer, and
less salesy. If still unsure, ask — don't guess.
```

---

## 13. Anti-patterns (the failure list)

These are the recurring brand mistakes flagged during the May 2026 audit. Every one of them currently exists somewhere in the codebase. The [Brand Fix Backlog memory](../.claude/...) tracks file paths.

### Brand-damaging (do not ship)
- AUTONYX as fallback identity for company name (5 file leaks)
- "Create Next App" in root layout metadata (browser tab)
- "BORIS Killer" public on landing page (handled separately by landing-page chat)
- Comparisons to BORIS in any customer-facing copy

### Consistency (drift)
- Mixing `gray-*` and `slate-*` Tailwind grayscales
- Title Case vs sentence case CTAs (mixed currently)
- ASCII `...` vs Unicode `…` in placeholders
- "Worker" in customer-facing copy (should be "tradie")
- "Industry pack" vs "trade preset" vs "work type" — three terms for one concept
- Random per-surface accent colors (settings page picks 8 different hue families)
- Heading size drift (text-2xl vs text-3xl on peer pages)

### Voice violations
- "Failed to X" / "An error occurred" / "Something went wrong" (banned phrasing)
- Database terms leaking into UI labels ("Template Fields", "Evidence Subcategory")
- 🎉 / 🚀 / "We're so excited" anywhere
- Title Case CTAs with generic verbs ("Submit", "OK")

---

## 14. How this file gets used

### By humans
- **Before designing a new screen**: read sections 4 (tone), 6 (visuals), 7 (microcopy)
- **Before writing marketing copy**: read sections 1 (positioning), 3 (voice), 5 (vocab)
- **Before adding a new button/empty state/error**: section 7 + 5.4 (banned phrases)
- **Before writing an email**: section 8

### By AI
- The block in section 12 is **copy-paste ready**. Drop it as the system prompt or context paragraph for any LLM call generating user-facing content.
- Future skill (`brand-discipline`) will reference this file directly.

### Maintenance
- Update this file when a brand decision is made
- Append to anti-patterns (section 13) when a new failure pattern is observed
- Move items from Brand Fix Backlog memory → `[fixed]` here once cleaned up

---

## 15. Open questions / future decisions

- [ ] **App name** — pending domain availability check (`.com` + `.com.au`)
- [ ] **Logo & wordmark** — depends on name
- [ ] **Favicon** — depends on logo
- [ ] **Social handles** — depends on name (Instagram, LinkedIn, Twitter/X)
- [ ] **Marketing site URL** — depends on name
- [ ] **Email signing domain** (DKIM/SPF) — depends on name
- [ ] **Should AUTONYX appear at all on the public marketing site?** — TBD (handled in landing-page chat)
- [ ] **Pricing tier visual treatment** — Starter/Pro/Business/Enterprise — should each have a pastel signature, or stay neutral?
- [ ] **In-app messaging tone** (deferred MVP feature) — likely warm-casual, but confirm when built
- [ ] **AI assistant persona** (deferred MVP feature) — voice should match this brand file; specific persona TBD

---

*This file + the rest of `CLAUDE_REFERENCE/` are the single source of truth for all Claude Code sessions and brand decisions. If anything in the codebase or marketing conflicts with this file, **flag it — do not silently override it.***
