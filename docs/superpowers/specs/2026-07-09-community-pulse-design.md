# Community Pulse — Design Spec

**Date:** 2026-07-09
**Author:** Shashank Jha (with Claude)
**Status:** Approved pending user review
**Repo:** `~/Sites/theshajha/cursor-community/`

## Context & Goal

Cursor is hiring a **Community Engineer** (Sunita Rao's tweet, Jun 27 2026):
*"you'll own and execute the technical roadmap for community infrastructure
for existing programs (and new ones we're launching soon)."* The JD page is
currently down; insider scoop says the team wants an internal system that
gives them a **pulse of how community programs are running**.

Shashank — already a Cursor Ambassador (Dubai, selected Jun 22) — will apply
via the warm channel (spoke to Sunita Jul 8). Instead of describing what he'd
build, he sends a **working slice of the tool itself**: a live URL plus a
4–6 line email.

**Success criteria:** Sunita opens the link (likely on her phone), and within
30 seconds thinks *"this person already understands the job."* The demo must
read as a thoughtfully-crafted internal product — not an AI-generated
dashboard. Few details, each perfect.

## The Product

**"Community Pulse"** — a one-screen internal ops dashboard: the
Monday-morning view of the global community program. Visibly a concept by
Shashank Jha (footer attribution); borrows Cursor's aesthetic respectfully
without impersonating an official property.

### Screen anatomy (top to bottom)

1. **Header** — "Community Pulse" wordmark, week label ("Week of Jul 6, 2026"),
   data-freshness stamp ("synced 4 min ago").
2. **KPI strip** — four tiles, each with value, delta vs. prior 30 days, and a
   quiet sparkline:
   - Active programs (cities)
   - Events, last 30 days
   - Attendee → activated rate (30d)
   - New builders activated (30d)
3. **The map (hero)** — dark dot-grid world map (inline SVG). ~13 city dots,
   **sized** by community size, **colored** by computed health state:
   *thriving / steady / cooling / quiet*. Hover → tooltip (city, ambassador,
   last event, health). Click → drill-down panel. The map is the org chart of
   the program, not decoration.
4. **Drill-down panel** (slide-in right on desktop; full-screen sheet on
   mobile; Esc / swipe-down closes):
   - City header: ambassador name, member count, health badge + one-line
     "why this state" explainer.
   - Last-event card: name, date, venue, photo (Bangkok only), attendance
     vs. RSVPs.
   - **The funnel (centerpiece):** RSVP'd → attended → used redirect → new
     signup → activated wk 1 → still active wk 4 — **with the unattributed
     bucket shown explicitly.** Attribution honesty is a deliberate craft
     signal.
   - Compact event history (last 3–4 events, one row each).
5. **Needs-attention strip** — exactly three auto-surfaced signal cards, each
   with severity, why-flagged, and a suggested action:
   - "Ambassador in Florence quiet 6 weeks — no event scheduled"
   - "Bangalore waitlist overflowed 2× running — capacity signal"
   - "Forum activity spiking in Brazil — no program there yet"
6. **Footer** — attribution ("A concept by Shashank Jha for the Community
   Engineer role") + the honesty line: *"Cities and events are real, from
   the public Luma calendar. The attribution layer is illustrative — that's
   the part I'd build."*

### The health model (the "engineer" tell)

Health states are **computed, not painted**. An "ⓘ how health is computed"
popover shows the actual formula:

```
health = weighted(
  cadence_ratio,        # events last 60d vs. city's own trailing baseline
  attendance_trend,     # 3-event rolling attendance slope
  host_recency,         # days since last ambassador activity
  funnel_conversion     # attended → activated wk1, last event
)
→ thriving ≥ 0.75 · steady ≥ 0.5 · cooling ≥ 0.3 · quiet < 0.3
```

Exact weights are decided during implementation; the popover must show the
real formula the demo actually runs — no theater. Each city's health state in
`pulse.json` is derived by this function at build time, not hand-assigned.

## Data

### Sourcing

- **Real skeleton — the public Luma calendar.** The official
  `lu.ma/cursorcommunity` calendar lists 20+ real upcoming events across five
  continents (Cafe Cursor Barranquilla / Kampala / London / LA / Philadelphia
  / OKC / Tandil, hackathons in London, Berlin, Tallinn, Helsinki, Cairo,
  Guatemala City, meetups in Rio, Aracaju, Canela, Miami, Frankfurt, Yaoundé,
  Vadodara) with hosts and registration counts. A real ingest script
  (`scripts/fetch-luma.mjs`) snapshots this public data into the pipeline —
  the demo's cities, events, dates, hosts, and RSVP counts are REAL. Plus
  Dubai, Chiang Mai, Bangkok (known firsthand), and the four cities featured
  on cursor.com/ambassadors.
- **Synthetic layer — attribution only:** funnel conversion (redirect →
  signup → activation → retention), member counts, and therefore health
  states are illustrative — this is exactly the layer that requires internal
  data and that the Community Engineer role exists to build. The footer says
  so explicitly: *"Cities and events are real, from the public Luma calendar.
  The attribution layer is illustrative — that's the part I'd build."*
  Synthetic values must be plausible and internally consistent (funnels sum;
  trends match sparklines; health states follow from the formula), and
  anchored to real RSVP counts where known.
- **Bangkok is the fully-fleshed hero drill-down** — the real Cursor Sunday
  Bangkok event (Mar 29 2026, The Decaf, 129 attendees, Nick Miller Q&A —
  the community's 6th event in 3 months, i.e. genuinely "thriving" by the
  formula), with real photos Shashank has from the event (**OPEN: he drops
  them into the repo; include a photo credit line — the event page credits
  The Decaf**). Shashank attended and knows the ambassador firsthand.
- **Dubai stays real-anchored**: Cafe Cursor Dubai (Jun 18) with his real
  observed headcount (**OPEN, optional**) and his upcoming Builders Night v1
  as a scheduled event — no photos.
- Other cities get a deliberate "no media synced" empty state — no fake
  photos of strangers' events.

### Data model

Single file: `data/pulse.json`. Schema documented in the README, with each
field annotated with **its production source** (Luma API, redirect/link
service, product telemetry, ambassador Slack activity). The schema quietly
demonstrates the "technical roadmap for community infrastructure."

Top-level shape:

```
{
  generated_at, week_of,
  kpis: { active_programs, events_30d, activation_rate_30d, new_builders_30d,
          deltas, sparklines },
  cities: [ { id, name, lat, lng, ambassador, members,
              health: { state, score, factors },
              events: [ { name, date, venue, rsvps, attended,
                          funnel: { redirect_used, signed_up, activated_w1,
                                    active_w4, unattributed },
                          media } ] } ],
  signals: [ { severity, city_id?, title, why, suggested_action } ]
}
```

## Design language

A first-class deliverable: **`DESIGN.md`** — tokens + usage rules in the
style of `vercel.com/design.md` — authored *before* the UI is built, and
shipped publicly with the site (linkable at `/design.md`). The build must
follow it; drift between DESIGN.md and the page is a bug.

Grounded in tokens extracted from cursor.com production CSS (Jul 2026):

- **Surfaces (dark, warm):** bg `#14120b`, cards `#1b1913` / `#1d1b15` /
  `#201e18` / `#26241e` — layered warm steps, not gray.
- **Foreground:** `#edecec`; secondary/tertiary text via `color-mix` of fg at
  60% / 40%; borders = fg at 2.5–20%. (This fg-tinted layering system is what
  makes it feel like Cursor, not generic dark mode.)
- **Semantic:** green `#1f8a65`, red `#cf2d56`; accent `#f54e00` used at most
  once on the page.
- **Health scale (ours, harmonized to theirs):** thriving = `#1f8a65`-family,
  steady = fg-neutral, cooling = warm amber, quiet = `#cf2d56`-family at low
  saturation. Exact values fixed in DESIGN.md with contrast checks.
- **Type:** system-ui / Helvetica Neue stack (Cursor's own fallback for their
  private CursorGothic); `ui-monospace` stack for numbers and labels
  (fallback for their licensed Berkeley Mono); **EB Garamond** (free,
  self-hosted, subset) for at most one editorial accent (e.g. the header
  week label). No external font requests.
- Committed dark theme only. No light mode.
- Zero external requests of any kind; everything self-hosted/inline.

## Architecture

- **Static site, no framework, no build step for the page itself:**
  `index.html` + `styles.css` + `app.js` + `data/pulse.json` + `DESIGN.md`.
- **Map:** dot-grid world generated once by a small Node script
  (`scripts/gen-map.mjs`) from a public land/coastline dataset → inline SVG
  committed to the repo. City dots positioned by lat/lng → equirectangular
  projection. No map library, no tiles, no API keys.
- **Ingest:** `scripts/fetch-luma.mjs` snapshots the public
  `lu.ma/cursorcommunity` calendar (events, cities, hosts, RSVP counts) into
  `data/raw-events.json` — a real, re-runnable pipeline, committed with its
  snapshot date. Run manually; the site itself stays fully static.
- **Health computation:** `scripts/derive.mjs` merges the Luma snapshot with
  the curated city/attribution data, computes health scores and KPI
  aggregates → writes `pulse.json`. The formula in the UI popover and the
  script are the same source of truth.
- **Interactions:** hover tooltips, click → panel, Esc close, reduced-motion
  respected. Micro-transitions only (≤200ms); nothing animated for its own
  sake.
- **Responsive:** desktop-first composition, but the phone rendering is a
  first-class QA target (email → phone click is the likely first view).
- **Performance target:** single digit total requests, < 300 KB total,
  instant first paint on 4G.

## Delivery

1. Deploy to Vercel from the repo; domain decided at deploy time
   (e.g. `pulse.theshajha.com`) (**OPEN: confirm domain**).
2. QA pass (below), then draft the 4–6 line email to Sunita — voice per
   `akasha/identity/voice.md`, framed as: *"You mentioned needing a
   self-starter. Instead of describing what I'd build, I built a slice of
   it."* Email drafted for Shashank's review, never auto-sent.
3. Update the agents repo: new thread
   `akasha/threads/cursor-community-engineer.md` linking this repo and
   tracking the application (separate task, after the build).

## Out of scope (deliberate)

Auth · real API integrations · tabs or second screens · light theme · more
than one fully-fleshed city · event photo galleries · any admin/edit UI ·
analytics on the demo itself.

## QA plan

- Render → screenshot → critique loop (Playwright) at 390×844 (iPhone),
  1440×900, and 1920×1080; iterate until the screenshots pass a hostile
  "does this look AI-generated?" review.
- Copy pass: every label reads like a real internal tool (no lorem, no
  filler, no exclamation marks).
- Data-consistency check: funnels sum, sparklines match deltas, health states
  match the formula output.
- DESIGN.md conformance check: colors/type/spacing in the page match the
  tokens file.
- Lighthouse: performance ≥ 95 mobile; no console errors; reduced-motion and
  keyboard (Esc, tab order) verified.

## Open items (need Shashank)

1. Bangkok photos — drop his Cursor Sunday Bangkok (Mar 29) photos into the
   repo (`assets/photos/bangkok/`); confirm they're his own shots (the event
   page's album credits The Decaf — we only ship photos he took or has
   permission for, with a credit line).
2. Real Cafe Cursor Dubai headcount (Jun 18) — optional now; thread notes it
   was never filled in.
3. Deploy domain — `pulse.theshajha.com` or other.
