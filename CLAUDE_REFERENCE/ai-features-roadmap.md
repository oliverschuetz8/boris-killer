# AUTONYX — AI Features Roadmap

> Last updated: April 2026
> Status: Agreed and locked. Building in priority order.
> GO-TO-MARKET STRATEGY: Launching for passive fire protection companies first.
> All features are built with AS1851 compliance and penetration logging as the primary use case.
> The architecture supports other trades (electrical, plumbing, HVAC) — we are NOT deleting
> that capability — but we are not marketing to those industries until we have ~10 fire
> protection clients onboarded. Trade expansion is planned, just not yet.

---

## Philosophy

Our only limit is creativity. Every AI feature must:
- Be built for passive fire protection first, with architecture that supports other trades later
- Make the admin's life easier without removing their control
- Make the worker's life easier without making them feel tracked or trapped
- Make the customer feel looked after without requiring extra admin effort

---

## PRE-LAUNCH FEATURES (Build before or alongside MVP)

---

### 1. Voice-First Field Data Entry
**Priority: #1**

Workers don't type. They're on site with dirty gloves. This is the single biggest friction point in every field service app — and nobody has solved it properly.

**How it works:**
- Worker holds up phone and speaks: *"Two fire collars, one box of mastic, penetration through concrete wall, room 3B, level 2, building A, rated FRL 120"*
- AI transcribes, parses, and fills every field automatically
- Worker reviews and hits confirm

**Why it wins:**
- Every worker who uses a competing app will want ours
- Built for fire protection terminology first — FRL ratings, penetration types, AS1851 language
- Architecture supports extension to other trade vocabularies when we expand (capability kept — not marketing yet)
- Zero hardware cost — just the phone they already have

---

### 2. Photo Compliance Checker
**Priority: #2**

AI scans every uploaded photo in the background and flags **objective, obvious problems only** — before the evidence report goes to the customer.

**What it flags (objective issues only):**
- A room is marked complete but has zero photos attached
- Materials logged say "black mastic" but photo shows white mastic
- A photo is too blurry to be usable as evidence
- FRL rating logged doesn't match the product visible in the photo
- A penetration is logged but no after-photo exists (only a before)

**Rules for building this (non-negotiable):**
- Maximum ONE alert per room — not per photo
- Never flag subjective or technique-based issues
- Never be "picky" — if it's not clearly wrong, don't flag it
- Admin can dismiss any alert with one tap
- Flagging too much = admins ignore everything = feature is useless

**Why it wins:**
- Compliance failures before they reach the customer = massive liability protection
- Fire protection companies have never had systematic photo QA — this is new
- Built around AS1851 compliance logic first — expandable to other trade standards later (capability kept in architecture, not marketed yet)

---

### 3. Natural Language Business Intelligence
**Priority: #3**

Admin types a plain-English question. AI answers instantly. No filters, no reports, no exports.

**Example queries:**
- *"Which jobs last quarter cost more than we quoted?"*
- *"Show me all jobs where we used more than 10 fire collars"*
- *"Which worker has the most overtime this month?"*
- *"What's our average margin on electrical jobs vs plumbing jobs?"*

**Why it wins:**
- Business owners don't want pivot tables — they want answers
- Replaces the entire reporting module with something a non-technical person can actually use
- Huge demo moment — you type a question live and the answer appears

---

### 4. Defect-to-Quote Pipeline
**Priority: #4**

Turns inspection defects into revenue automatically.

**How it works:**
1. Inspector taps "defect" on each problem during inspection, adds a photo
2. When inspection is complete, AI automatically drafts the defect report in the correct format for that trade
3. AI simultaneously generates a remediation quote with correct line items
4. Customer receives both through the portal in one notification
5. Customer clicks approve → job is created → no admin effort required

**Example (fire protection):**
Annual AS1851 inspection finds 3 deteriorated seals + 1 unsealed new penetration. AI drafts the defect report and quotes for all 4 repairs. Customer approves same day. Job booked.

<!-- FUTURE TRADES: This pipeline will work for electrical fault reports, plumbing compliance defects etc. when we expand. Architecture supports it — not marketing it yet. -->

**Why it wins:**
- Turns every inspection into an automated revenue opportunity
- Competitors make customers wait days for follow-up quotes
- You do it in minutes with zero extra effort

---

## POST-LAUNCH FEATURES (Build after launch / during growth phase)

---

### 5. AI Customer Portal Assistant
**Priority: #5**

Customers get their magic link portal. Instead of just scrolling through photos, they can chat with their job data.

**Example interactions:**
- *"Is room 3B complete?"* → "Yes, completed April 3rd. Evidence photo attached."
- *"How many penetrations were sealed on level 4?"* → "12 penetrations, all sealed."
- *"What materials were used in the east wing?"* → Full breakdown.

**Why it wins:**
- Customers who aren't tech-savvy or construction-familiar get instant answers
- Zero extra admin effort — AI handles the questions
- Feels like a dedicated account manager at no cost

---

### 6. Predictive Materials Ordering
**Priority: #6**

Before a job starts, AI predicts what materials you'll need based on job type, building size, and historical usage across all past similar jobs.

**Example:**
*"Based on 47 similar jobs, you'll likely need: 8 fire collars, 3 boxes of mastic, 2 tubes of acoustic sealant. Want to pre-order?"*

Can generate a PDF purchase order or connect to supplier API.

**Why it wins:**
- No more mid-job truck runs
- No more over-ordering
- Direct, visible cost savings on every job

---

### 7. AI Job Profitability Coach
**Priority: #7**

After every completed job, AI gives the admin a plain-English debrief with a recommendation — not just numbers.

**Example:**
*"This job was 23% less profitable than similar jobs. Main reason: 4 hours unplanned overtime. This has happened on 6 of your last 10 jobs with this crew. Suggest reviewing site briefing process or adjusting your quote template for jobs of this type."*

**Why it wins:**
- Competitors show you numbers. We show you answers.
- Business owners act on recommendations, not spreadsheets.
- Sticky retention feature — customers won't leave software that makes their business more profitable.

---

### 8. Smart Scheduling AI
**Priority: #8**

**IMPORTANT: Assistant mode only. Admin always makes the final decision.**

AI surfaces useful information to help the admin schedule better — it never auto-assigns, never tracks worker location in real time, and never removes the admin's freedom to pick whoever they want.

**What it shows:**
- Worker availability and current workload
- Overtime risk warnings before they happen
- Which workers are certified for this job type
- Travel distance as useful context

**What it never does:**
- Auto-assign without admin approval
- Track real-time worker location
- Remove admin control
- Make workers feel surveilled or trapped

**Why it wins:**
- Prevents overtime surprises before they happen
- Saves money on scheduling mistakes
- Workers feel respected — no surveillance, no pressure

---

### 9. Compliance Risk Score + Auto-Outreach
**Priority: #9**

Every building in the system gets a live AI-calculated risk score. When a building hits a threshold, the system automatically sends the customer a booking reminder.

**Risk score factors:**
- Days since last inspection
- Open/unfixed defects
- Documentation completeness
- Upcoming compliance due date

**Trigger example:**
Building hits 60-days-to-inspection threshold → Customer portal notification: *"Your annual inspection at 42 Collins Street is due in 58 days. Click here to book."*

**Why it wins:**
- Automated recurring revenue — you never have to chase customers for annual work
- Built around AS1851 for fire protection first — expandable to electrical safety checks, plumbing compliance etc. on trade expansion (capability kept, not marketed yet)
- Built on data only your app holds — competitors can't replicate this without years of job history

---

### 10. AI Site Walk Scoping
**Priority: #10 (biggest demo moment)**

Worker opens app, hits "Scope Job", records a 60-second video walkthrough. AI:
- Analyses video frame by frame
- Counts and identifies penetrations
<!-- FUTURE TRADES: Will extend to electrical points, plumbing connections etc. on trade expansion — not removing from roadmap, just not built yet -->
- Maps them to building → level → room automatically
- Generates a draft job scope and quote in seconds
- Worker can review and adjust anything AI missed

**Why it wins:**
- Job scoping currently takes hours of skilled labour on site
- This compresses it to 60 seconds
- Customer gets a quote the same day as the site walk
- Competitors' customers wait days
- This is the demo that makes investors and competitors say "how do we buy this"

---

## One-Sentence Pitch

> *"We don't just manage jobs. We make every job smarter — from the moment you walk a site to the moment a customer pays an invoice — using AI that the entire industry is still too slow to build."*
