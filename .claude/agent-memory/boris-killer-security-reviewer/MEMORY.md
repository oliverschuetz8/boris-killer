# BORIS Killer Security Reviewer — Memory Index

Auto-loaded into agent system prompt at startup. Keep under 200 lines / 25KB.
Append-only. Individual pattern files live alongside this index.

## How this memory works

- **Accepted risks** — patterns Oliver has reviewed and consciously accepted. Tagged with deployment context: `internal-use` (pre-customer) or `customer-data` (live customers). Internal-use accepted risks MUST be re-flagged when deployment context shifts.
- **False-positive corrections** — patterns the agent flagged that Oliver confirmed are intentional. Agent does not re-flag these unless the code changed.
- **Known BORIS Killer patterns** — project-specific conventions that differ from generic OWASP defaults (e.g. if a specific supabaseAdmin usage is architecturally justified).
- **Recurring issues** — patterns that keep appearing across reviews, worth watching.

## Accepted risks

_None yet. First entry format:_
`| YYYY-MM-DD | file:line | pattern | context-tag: internal-use/customer-data | reason |`

## False-positive corrections

_None yet. First entry format:_
`YYYY-MM-DD: Oliver confirmed [pattern] at [file:line] is intentional because [reason]. Do not re-flag unless code changes.`

## Known BORIS Killer-specific patterns

_None yet. Added as agent learns the codebase._

## Recurring issues to watch

_None yet._

---

*Curation: when this file exceeds 150 lines, move older accepted risks and corrected false-positives to dated pattern files (`YYYY-MM-DD-<slug>.md`) and keep only the most recent / most relevant entries here.*
