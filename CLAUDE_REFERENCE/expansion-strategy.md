# Expansion Strategy — Trade Sequencing Post-PFP

> Last updated: 2026-05-08 | Source of truth for go-to-market sequencing and milestones.

This file documents which trade we expand into after Passive Fire Protection, in what order, and at what milestones. Earlier reference files said "PFP → HVAC → plumbing/electrical → general construction" — that ordering is **superseded by this document**. Any other file that references the expansion order should defer to this one.

---

## Current focus: Passive Fire Protection (PFP) only

100% of GTM, marketing, sales, and feature defaults are tuned for passive fire protection contractors in Australia. Everything else is dormant.

**Why PFP first:**
- Real industry experience and existing personal contacts
- AS1851 compliance workflows are deep enough that generic FSM tools (simPRO, AroFlo, Tradify, ServiceM8) can't compete
- Tight industry — PFP contractors talk to each other, so referrals compound fast
- Estimated AU market: ~200-400 specialised PFP contractors, ~80-200 are the "right size" target (small enough to need software, big enough to pay)

---

## PFP milestones — do not expand prematurely

| Milestone | What it means | What you do next |
|---|---|---|
| **~10 paying clients** | Validated. Product works. Referral engine starting. Case studies usable. | Keep selling PFP only. Hire/contract first sales help if Oliver's bandwidth is the bottleneck. |
| **~30 paying clients** | Category leader for PFP in AU. Word-of-mouth dominant. Reference customers in every state. | Keep selling PFP only. Start *building* the next pack quietly in parallel. Hire dedicated salesperson. |
| **~50 paying clients** | Category dominance. Saturation of "easy" PFP wins. | **Now expand — and only now.** Launch Active Fire Services (next pack). Don't dilute PFP focus until you've earned the right. |

**Common founder mistake to avoid:** expanding at 10-15 clients because growth feels stalled. Premature expansion dilutes positioning, the new segment doesn't believe in you yet, and your existing base feels neglected. Stay narrow.

---

## Expansion sequence (after ~50 PFP clients)

Ordered by: workflow overlap with PFP, referral channel from existing PFP base, SaaS competitive density, moat continuity. Not by raw market size.

### 1. Active Fire Services (sprinklers, alarms, hydrants, fire doors active side) — obvious next move

- **Workflow overlap:** ~85% of what's already built. Same buildings, same compliance regime (AS1851 IS the inspection standard for active fire too), same evidence-per-location pattern, same floor plan markup.
- **Buyer overlap:** PFP companies and AFS companies cross-quote on the same commercial sites every day. They refer each other. Your existing 50 PFP clients are your AFS pipeline.
- **Rebuild required:** ~10-15% — new evidence subcategories, asset register (AFS is more asset-tracking-heavy than PFP), recurring inspection scheduling tweaks.
- **Estimated AU market:** ~300-500 specialised AFS contractors.
- **SaaS competitive density:** Low-medium. Some compliance-focused tools exist but nothing that does both passive AND active fire well.

### 2. Asbestos / hazardous materials remediation — the side expansion

- **Workflow overlap:** Workflow twin of PFP. Sample-mapped on floor plans, evidence-per-location, material logs, compliance reports — almost identical shape.
- **Buyer overlap:** Less direct than AFS, but some commercial demolition/refurbishment overlap.
- **Rebuild required:** Minimal. Mostly evidence subcategories and report templates.
- **Estimated AU market:** ~100-150 specialist contractors (smaller than AFS).
- **SaaS competitive density:** Very low. Almost no quality tooling exists for this niche.
- **Why side expansion not main:** smaller market, less cash than AFS, but huge moat. Treat it as "while we're here" once AFS is shipping.

### 3. HVAC commercial service — third, not first

- **Workflow overlap:** Asset-based recurring service is well-supported by what we've built, but the evidence-per-location pattern is overkill for most HVAC work. More about asset history than per-location compliance.
- **Buyer overlap:** Some — commercial HVAC contractors share clients with fire contractors.
- **Rebuild required:** Bigger than AFS — different evidence patterns, more asset-history-centric, recurring schedule patterns differ.
- **SaaS competitive density:** Medium. Less crowded than electrical/plumbing.

### 4. Electrical / plumbing — eventually, not next

- **Workflow overlap:** Generic FSM workflow, less compliance-photo-heavy than fire. Our moat narrows here.
- **SaaS competitive density:** **Very high.** simPRO, AroFlo, Tradify, ServiceM8, FieldPulse, Fergus all fight hard for these trades. Knife fight.
- **When to attack:** Only after you have brand, cash, and clear differentiation. Lead with "compliance-grade evidence + reporting" angle (the moat from fire days) — that's what differentiates from generic job management.
- **Why "biggest market" is a trap:** larger market = more entrenched incumbents = harder wedge. Bigger TAM doesn't help if you can't take share.

---

## What stays dormant in code (and why)

The `work_type_packs` table currently contains 7 packs: Passive Fire Protection, HVAC, Electrical, Plumbing, Fire Services - Active, General Construction, Custom. Only PFP is shown in onboarding (post-overhaul).

**Do not delete the dormant packs.** They exist in code and DB intentionally:
- `seedMaterialsFromPack()` already knows how to seed a new company with trade-appropriate materials
- `work_types` arrays per pack inform job categorisation
- Architecture stays trade-agnostic so adding a new trade is a content change, not a rebuild

When expanding to AFS, the work is: enable the existing "Fire Services - Active" pack in onboarding UI, populate proper evidence_categories/subcategories for AFS, build report templates, marketing site update.

---

## Architecture principle (do not violate)

**Never build PFP-specific features that can't work for other trades.** Building/level/room/penetration is an abstraction over `site → location → location → evidence_record`. Keep it that way. The PFP-specific tuning lives in:
- Default evidence categories (Certification + Inspection)
- Default evidence subcategories (Penetration Sealing, Fire Collar, Fire Door)
- Default work type pack
- Marketing copy and onboarding language

Everything else stays generic enough that turning on the AFS pack is a content swap.
