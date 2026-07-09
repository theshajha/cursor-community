# Community Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-screen "Community Pulse" internal-ops dashboard demo (live map of Cursor's community programs + attribution funnel + auto-surfaced signals), deployed to Vercel, to accompany Shashank's Cursor Community Engineer application.

**Architecture:** Fully static site (index.html + styles.css + app.js) that fetches two committed JSON artifacts. Three Node scripts produce those artifacts: `fetch-luma.mjs` (snapshots the public Luma calendar), `gen-map.mjs` (land dot-grid SVG path), `derive.mjs` (merges curated + real data, computes health scores and KPIs → `pulse.json`). The health formula lives ONLY in `derive.mjs`; the UI popover renders the formula text exported from the same module.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no page build step). Node 20+ with `node:test` for script tests. Dev-only deps: `world-atlas`, `topojson-client`, `d3-geo` (map generation). Vercel static deploy.

## Global Constraints

- Committed dark theme only; tokens per `DESIGN.md` (bg `#14120b`, fg `#edecec`, cards `#1b1913`/`#1d1b15`/`#201e18`/`#26241e`, semantic green `#1f8a65`, red `#cf2d56`, accent `#f54e00` used at most once on the page).
- Zero external network requests at runtime. Fonts self-hosted. No map tiles, no API keys, no analytics.
- Type: `system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif` for UI; `ui-monospace, SFMono-Regular, Menlo, monospace` for numbers/labels; self-hosted EB Garamond for at most one editorial accent.
- Page weight < 300 KB excluding photos; photos lazy-loaded; single-digit request count.
- Micro-transitions ≤ 200 ms; `prefers-reduced-motion` respected; Esc closes the panel; mobile (390×844) is a first-class target.
- Copy: no lorem, no filler, no exclamation marks. Footer must carry attribution ("A concept by Shashank Jha for the Community Engineer role") and the honesty line ("Cities and events are real, from the public Luma calendar. The attribution layer is illustrative — that's the part I'd build.").
- Synthetic data must be internally consistent: funnel monotonicity (`attended ≥ redirect_used ≥ signed_up ≥ activated_w1 ≥ active_w4`, `unattributed = attended − redirect_used`), health states must equal `derive.mjs` output, KPI deltas must match sparklines.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- UI tasks (7–11) MUST follow the frontend-design skill's render → screenshot → critique gate before their commit step, using DESIGN.md as the binding token source. Drift from DESIGN.md is a bug.

## File Structure

```
cursor-community/
├── DESIGN.md                  # public design-tokens doc (à la vercel.com/design.md)
├── README.md                  # schema + production-source annotations + roadmap
├── index.html                 # the one screen
├── styles.css                 # all styling; tokens as CSS custom properties
├── app.js                     # data load, map render, panel, popover, signals
├── vercel.json                # clean-url static config
├── package.json               # dev deps + npm scripts (test, data, map)
├── data/
│   ├── raw-events.json        # Luma snapshot (fetch-luma.mjs output, committed)
│   ├── cities.json            # curated: cities, lat/lng, histories, signals
│   ├── map-path.json          # gen-map.mjs output: {"d": "M…"}
│   └── pulse.json             # derive.mjs output (committed)
├── assets/
│   ├── fonts/eb-garamond-latin-400.woff2
│   └── photos/bangkok/        # user-provided photos (compressed)
├── scripts/
│   ├── lib/project.mjs        # shared equirect projection + constants
│   ├── lib/health.mjs         # health formula (single source of truth)
│   ├── fetch-luma.mjs
│   ├── gen-map.mjs
│   └── derive.mjs
└── tests/
    ├── project.test.mjs
    ├── health.test.mjs
    ├── data-consistency.test.mjs
    └── fixtures/luma-page.html
```

---

### Task 1: Scaffold, DESIGN.md, package.json

**Files:**
- Create: `package.json`, `.gitignore`, `DESIGN.md`, `vercel.json`, `README.md` (skeleton)

**Interfaces:**
- Produces: `DESIGN.md` token names used verbatim as CSS custom properties in Task 7 (`--bg`, `--fg`, `--card-01`…`--card-04`, `--border-1`…`--border-3`, `--text-sec`, `--text-ter`, `--green`, `--red`, `--amber`, `--accent`, `--health-thriving`, `--health-steady`, `--health-cooling`, `--health-quiet`, spacing scale `--s1`…`--s8`, radii `--r-sm`, `--r-md`, `--r-lg`).

- [ ] **Step 1: Write package.json and .gitignore**

`package.json`:
```json
{
  "name": "community-pulse",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "map": "node scripts/gen-map.mjs",
    "fetch": "node scripts/fetch-luma.mjs",
    "derive": "node scripts/derive.mjs",
    "data": "npm run fetch; npm run derive"
  },
  "devDependencies": {
    "world-atlas": "^2.0.2",
    "topojson-client": "^3.1.0",
    "d3-geo": "^3.1.0"
  }
}
```

`.gitignore`:
```
node_modules/
.vercel
.DS_Store
```

`vercel.json`:
```json
{ "cleanUrls": true, "trailingSlash": false }
```

- [ ] **Step 2: Run `npm install` — expect 3 deps added, no errors**

- [ ] **Step 3: Write DESIGN.md**

Full content (this is the binding tokens file, shipped publicly at `/DESIGN.md`):

```markdown
# Community Pulse — Design Language

Tokens and rules for the Community Pulse concept. Grounded in values
extracted from cursor.com production CSS (July 2026). The page must not
drift from this file; drift is a bug.

## Philosophy

One screen. Warm dark, not gray dark. The map is the org chart of the
program — every pixel that isn't information is removed. Numbers are set in
mono; prose is quiet; exactly one serif accent and at most one use of the
accent orange on the entire page. Nothing animates for its own sake.

## Colors

surfaces:
  bg:        "#14120b"   # page — warm near-black
  card-01:   "#1b1913"   # base card
  card-02:   "#1d1b15"   # raised card / hover base
  card-03:   "#201e18"   # panel / tooltip
  card-04:   "#26241e"   # highest surface (popover)
foreground:
  fg:        "#edecec"
  text-sec:  "color-mix(in oklab, #edecec 60%, transparent)"
  text-ter:  "color-mix(in oklab, #edecec 40%, transparent)"
borders:
  border-1:  "color-mix(in oklab, #edecec 6%, transparent)"
  border-2:  "color-mix(in oklab, #edecec 12%, transparent)"
  border-3:  "color-mix(in oklab, #edecec 22%, transparent)"
semantic:
  green:     "#1f8a65"
  red:       "#cf2d56"
  amber:     "#c08532"
  accent:    "#f54e00"   # max one use per page
health scale:
  thriving:  "#2ea87d"   # green family, lifted for dark bg
  steady:    "#8a8779"   # warm neutral
  cooling:   "#c08532"   # amber
  quiet:     "#8c4a56"   # desaturated red family
  (dots also differ in size/ring so color is never the only channel)

## Typography

families:
  sans:  system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif
  mono:  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  serif: "EB Garamond", Georgia, serif   # one editorial accent only
scale:
  display: 28px/1.15, sans 600, -0.02em   # page title
  h2:      15px/1.3,  sans 600            # section headers
  body:    13.5px/1.55, sans 400
  small:   12px/1.45, sans 400
  num-lg:  26px/1.1,  mono 500            # KPI values
  num:     13px/1.4,  mono 450            # table numbers, funnel counts
  label:   11px/1.3,  mono 500, +0.08em, uppercase  # eyebrows, axis labels
  serif-accent: 15px/1.4, serif 400 italic  # the week label, nothing else

## Spacing & radii

space: s1 4 · s2 8 · s3 12 · s4 16 · s5 24 · s6 32 · s7 48 · s8 64
radii: r-sm 6 · r-md 10 · r-lg 14
page:  max-width 1120px; page padding 24px (mobile 16px)

## Components

card:        bg card-01, border 1px border-1, radius r-lg
kpi-value:   num-lg fg; delta in num colored green/red with ▲▼ glyph
tooltip:     bg card-03, border border-2, radius r-md, shadow
             0 8px 24px rgb(0 0 0 / .4); max-width 260px
panel:       desktop 420px slide-in right, bg card-02, border-left
             border-2; mobile full-screen sheet, swipe-down/Esc closes
funnel bar:  height 26px rows, bar fill color-mix(fg 14%) with green
             left-edge marker; unattributed row hatched
             (repeating-linear-gradient 45deg, border-2 stripes)
signal card: severity dot (red/amber/green) + title (body 500) + why
             (small text-sec) + action (small, mono, arrow prefix)
map dot (land):  r 1.1, fill color-mix(fg 7%)
map dot (city):  r 3.5–7 by members; fill health color; ring 1px
                 color-mix(health 40%); hover ring border-3
focus ring:  2px accent-free — use border-3, offset 2px

## Motion

durations: hover 120ms, panel 200ms cubic-bezier(.32,.72,.35,1)
prefers-reduced-motion: all transitions 0ms, no transforms
```

- [ ] **Step 4: Write README.md skeleton**

```markdown
# Community Pulse

A working concept of an internal community-ops dashboard for Cursor's
community programs, built by Shashank Jha to accompany his Community
Engineer application.

Live: (added after deploy) · Design language: [DESIGN.md](DESIGN.md)

## What's real, what's illustrative

Cities, events, dates, hosts, and registration counts are real — snapshotted
from the public lu.ma/cursorcommunity calendar by `scripts/fetch-luma.mjs`.
The attribution layer (redirect → signup → activation → retention funnels,
member counts, and therefore health states) is illustrative: it requires
internal data, and building that pipeline is the job.

## Pipeline

fetch-luma.mjs → data/raw-events.json     (real public events)
cities.json                                (curated: geo, hosts, histories)
gen-map.mjs   → data/map-path.json         (land dot grid, no map library)
derive.mjs    → data/pulse.json            (health scores + KPIs; the same
                                            formula the UI popover shows)

## Data schema

(added in Task 5 — every field annotated with its production source)
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold, DESIGN.md tokens, pipeline stubs"
```

---

### Task 2: Shared projection module

**Files:**
- Create: `scripts/lib/project.mjs`
- Test: `tests/project.test.mjs`

**Interfaces:**
- Produces: `project(lat, lng) → {x, y}` (equirectangular into a 1000×500 viewBox), constants `MAP_W=1000`, `MAP_H=500`, `VIEWBOX="0 14 1000 403"` (crop 85°N–60°S). Consumed by `gen-map.mjs` (Task 3) and duplicated verbatim as `project()` in `app.js` (Task 8 — keep the two implementations character-identical; a comment in each points at the other).

- [ ] **Step 1: Write the failing test**

`tests/project.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { project, MAP_W, MAP_H, VIEWBOX } from '../scripts/lib/project.mjs';

test('projects lat/lng to viewBox coords', () => {
  assert.deepEqual(project(0, 0), { x: 500, y: 250 });        // null island
  assert.deepEqual(project(90, -180), { x: 0, y: 0 });         // top-left
  assert.deepEqual(project(-90, 180), { x: 1000, y: 500 });    // bottom-right
  const bkk = project(13.7563, 100.5018);                      // Bangkok
  assert.ok(Math.abs(bkk.x - 779.2) < 0.5 && Math.abs(bkk.y - 211.8) < 0.5);
});

test('constants', () => {
  assert.equal(MAP_W, 1000);
  assert.equal(MAP_H, 500);
  assert.equal(VIEWBOX, '0 14 1000 403');
});
```

- [ ] **Step 2: Run `npm test` — expect FAIL (module not found)**

- [ ] **Step 3: Implement**

`scripts/lib/project.mjs`:
```js
// Equirectangular projection into a 1000×500 viewBox.
// MIRROR: app.js has a character-identical project() — keep in sync.
export const MAP_W = 1000;
export const MAP_H = 500;
// Crop to 85°N–60°S: y(85)=13.9 → 14, height ≈ 402.8 → 403.
export const VIEWBOX = '0 14 1000 403';

export function project(lat, lng) {
  return {
    x: ((lng + 180) / 360) * MAP_W,
    y: ((90 - lat) / 180) * MAP_H,
  };
}
```

- [ ] **Step 4: Run `npm test` — expect PASS (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/project.mjs tests/project.test.mjs
git commit -m "feat: shared equirectangular projection"
```

---

### Task 3: Map generator (land dot grid)

**Files:**
- Create: `scripts/gen-map.mjs`
- Output (committed): `data/map-path.json`

**Interfaces:**
- Consumes: `project()` from Task 2.
- Produces: `data/map-path.json` = `{ "d": "M12.0 118.4h.01M…", "dots": <int> }`. Rendered in Task 8 as a single `<path>` with `stroke-linecap="round"` (the `h.01` + round-cap trick draws one dot per `M` command — one DOM node for the whole landmass).

- [ ] **Step 1: Write gen-map.mjs**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import { project } from './lib/project.mjs';

const topo = JSON.parse(
  readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url))
);
const land = feature(topo, topo.objects.land);

const STEP = 2.4;           // degrees; ~3k dots
const parts = [];
let dots = 0;
for (let lat = 84; lat >= -60; lat -= STEP) {
  for (let lng = -180; lng <= 180; lng += STEP) {
    if (geoContains(land, [lng, lat])) {
      const { x, y } = project(lat, lng);
      parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}h.01`);
      dots++;
    }
  }
}
writeFileSync(
  new URL('../data/map-path.json', import.meta.url),
  JSON.stringify({ d: parts.join(''), dots })
);
console.log(`map-path.json: ${dots} dots`);
```

- [ ] **Step 2: Run `npm run map` — expect "map-path.json: N dots" with N between 2500 and 4500**

- [ ] **Step 3: Sanity-check the artifact**

Run: `node -e "const m=require('./data/map-path.json'); console.log(m.d.startsWith('M'), m.d.length < 90000)"`
Expected: `true true`

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-map.mjs data/map-path.json
git commit -m "feat: land dot-grid map generation (no map library)"
```

---

### Task 4: Luma ingest script

**Files:**
- Create: `scripts/fetch-luma.mjs`
- Test: `tests/fetch-luma.test.mjs`, fixture `tests/fixtures/luma-page.html`
- Output (committed): `data/raw-events.json`

**Interfaces:**
- Produces: `data/raw-events.json` = `{ "source": "https://luma.com/cursorcommunity", "captured_at": "<ISO>", "events": [ { "name", "date" (ISO day), "city", "country", "url", "hosts": [..], "guest_count": <int|null> } ] }`. Consumed by `derive.mjs` (Task 6), matching cities via `cities.json` `luma_city_match` field.

- [ ] **Step 1: Write the extraction function + failing test**

`scripts/fetch-luma.mjs` (extraction is exported so it's testable offline):
```js
import { writeFileSync } from 'node:fs';

// Luma pages embed page state as JSON in <script id="__NEXT_DATA__">.
// The tree shape shifts between deploys, so instead of hardcoding paths we
// deep-walk it collecting anything event-shaped.
export function extractEvents(html) {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
  );
  if (!m) return [];
  let root;
  try { root = JSON.parse(m[1]); } catch { return []; }

  const found = new Map();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.name === 'string' && typeof node.start_at === 'string') {
      const geo = node.geo_address_info || node.geo_address_json || {};
      const key = node.api_id || `${node.name}|${node.start_at}`;
      if (!found.has(key)) {
        found.set(key, {
          name: node.name,
          date: node.start_at.slice(0, 10),
          city: geo.city || geo.city_state || null,
          country: geo.country || null,
          url: node.url ? `https://luma.com/${node.url}` : null,
          hosts: [],
          guest_count: node.guest_count ?? null,
        });
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(root);
  return [...found.values()];
}

const isMain = process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const res = await fetch('https://luma.com/cursorcommunity', {
    headers: { 'user-agent': 'Mozilla/5.0 (community-pulse snapshot)' },
  });
  const events = extractEvents(await res.text());
  if (events.length === 0) {
    console.error('No events extracted — page shape changed. Keeping existing snapshot.');
    process.exit(1);
  }
  writeFileSync(new URL('../data/raw-events.json', import.meta.url), JSON.stringify({
    source: 'https://luma.com/cursorcommunity',
    captured_at: new Date().toISOString(),
    events,
  }, null, 2));
  console.log(`raw-events.json: ${events.length} events`);
}
```

`tests/fetch-luma.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEvents } from '../scripts/fetch-luma.mjs';

const page = (data) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;

test('extracts event-shaped nodes anywhere in the tree', () => {
  const html = page({ props: { deep: [{ entries: [{ event: {
    api_id: 'evt-1', name: 'Cafe Cursor Kampala', start_at: '2026-07-19T14:00:00Z',
    url: 'cck', guest_count: 12,
    geo_address_info: { city: 'Kampala', country: 'Uganda' },
  } }] }] } });
  const ev = extractEvents(html);
  assert.equal(ev.length, 1);
  assert.deepEqual(ev[0], {
    name: 'Cafe Cursor Kampala', date: '2026-07-19', city: 'Kampala',
    country: 'Uganda', url: 'https://luma.com/cck', hosts: [], guest_count: 12,
  });
});

test('dedupes by api_id and survives malformed JSON', () => {
  const node = { api_id: 'x', name: 'A', start_at: '2026-08-01T00:00:00Z' };
  assert.equal(extractEvents(page({ a: node, b: node })).length, 1);
  assert.deepEqual(extractEvents('<html>no script</html>'), []);
  assert.deepEqual(
    extractEvents('<script id="__NEXT_DATA__" type="application/json">{bad</script>'), []
  );
});
```

- [ ] **Step 2: Run `npm test` — expect the two new tests PASS (function is written; TDD here validates behavior before touching the network)**

- [ ] **Step 3: Run the real fetch: `npm run fetch`**

Expected: `raw-events.json: N events` with N ≥ 15.
**Fallback if it exits 1** (page shape resists): hand-author `data/raw-events.json` from the verified WebFetch capture of Jul 9 (20 events: Cafe Cursor Barranquilla/Kampala/London/LA/Philadelphia/OKC/Tandil; hackathons London/Berlin/Tallinn/Helsinki/Cairo/Guatemala City; meetups Rio/Aracaju/Canela/Miami/Frankfurt/Yaoundé/Vadodara-virtual), set `"captured_at"` to the capture time and add `"method": "manual snapshot — see docs/superpowers/specs note"`. The pipeline must never block on Luma.

- [ ] **Step 4: Spot-check: `node -e "const r=require('./data/raw-events.json'); console.log(r.events.length, r.events[0])"` — events have name/date/city**

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-luma.mjs tests/fetch-luma.test.mjs data/raw-events.json
git commit -m "feat: Luma public-calendar ingest with offline-tested extractor"
```

---

### Task 5: Curated dataset (cities.json) + consistency tests

**Files:**
- Create: `data/cities.json`
- Test: `tests/data-consistency.test.mjs`
- Modify: `README.md` (schema section)

**Interfaces:**
- Produces: `data/cities.json` consumed by `derive.mjs`. Shape:

```json
{
  "cities": [{
    "id": "bangkok", "name": "Bangkok", "country": "Thailand",
    "lat": 13.7563, "lng": 100.5018,
    "luma_city_match": ["Bangkok"],
    "ambassador": { "name": "…", "note": "…" },
    "members": 410, "host_last_active": "2026-07-06",
    "baseline_60d": 3,
    "events": [{
      "name": "Cursor Sunday Bangkok", "date": "2026-03-29",
      "venue": "The Decaf", "status": "past",
      "rsvps": 160, "attended": 129,
      "funnel": { "redirect_used": 74, "signed_up": 41,
                  "activated_w1": 28, "active_w4": 19, "unattributed": 55 },
      "media": [],
      "source": "firsthand", "url": "https://cursorthailand.com/cursor-sunday-29032026"
    }]
  }],
  "signals": [{
    "severity": "amber", "city_id": "florence",
    "title": "Florence quiet for 6 weeks",
    "why": "No event since May 24 and no upcoming event on the calendar; host last active Jun 12.",
    "action": "Check in with the ambassador; offer a co-hosted format for September."
  }]
}
```

- [ ] **Step 1: Write the consistency test FIRST**

`tests/data-consistency.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { cities, signals } = JSON.parse(readFileSync(new URL('../data/cities.json', import.meta.url)));

test('city geometry and required fields', () => {
  assert.ok(cities.length >= 14 && cities.length <= 22);
  for (const c of cities) {
    for (const k of ['id','name','country','lat','lng','members','host_last_active','baseline_60d','events'])
      assert.ok(k in c, `${c.id ?? '?'} missing ${k}`);
    assert.ok(Math.abs(c.lat) <= 85 && Math.abs(c.lng) <= 180, `${c.id} bad geo`);
  }
  assert.equal(new Set(cities.map(c => c.id)).size, cities.length, 'dup ids');
});

test('funnels are monotone and sum correctly', () => {
  for (const c of cities) for (const e of c.events) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.date), `${c.id} bad date`);
    if (!e.funnel) continue;
    const f = e.funnel;
    assert.ok(e.attended >= f.redirect_used, `${c.id}/${e.name}: redirect > attended`);
    assert.ok(f.redirect_used >= f.signed_up && f.signed_up >= f.activated_w1
      && f.activated_w1 >= f.active_w4, `${c.id}/${e.name}: funnel not monotone`);
    assert.equal(f.unattributed, e.attended - f.redirect_used, `${c.id}/${e.name}: unattributed`);
    assert.ok(e.rsvps >= e.attended, `${c.id}/${e.name}: attended > rsvps`);
  }
});

test('signals are exactly three, each fully written', () => {
  assert.equal(signals.length, 3);
  for (const s of signals) {
    assert.ok(['red','amber','green'].includes(s.severity));
    for (const k of ['title','why','action']) {
      assert.ok(typeof s[k] === 'string' && s[k].length > 20, `signal ${k} too thin`);
      assert.ok(!s[k].includes('!'), 'no exclamation marks');
    }
  }
});

test('bangkok is fully fleshed; only bangkok has media', () => {
  const bkk = cities.find(c => c.id === 'bangkok');
  const sunday = bkk.events.find(e => e.name === 'Cursor Sunday Bangkok');
  assert.equal(sunday.attended, 129);
  assert.equal(sunday.venue, 'The Decaf');
  for (const c of cities) for (const e of c.events)
    if (c.id !== 'bangkok') assert.ok(!e.media || e.media.length === 0);
});
```

- [ ] **Step 2: Run `npm test` — expect FAIL (cities.json missing)**

- [ ] **Step 3: Author data/cities.json**

Content rules (author all of it in this step — this is the main content task):
- ~16 cities: **bangkok** (hero: Cursor Sunday Mar 29 real event above, plus 5 more past events Jan–Jun titled from the cursorthailand.com series naming, sixth-event-in-three-months cadence → thriving), **dubai** (Cafe Cursor Jun 18 past — attended left at a plausible 45 unless Shashank supplies the real headcount — plus "Cursor Builders Night v1" upcoming late July, `source: "firsthand"`), **london, berlin, tallinn, helsinki, rio-de-janeiro, aracaju, miami, frankfurt, cairo, kampala, barranquilla, guatemala-city, philadelphia, bangalore, san-francisco, florence** — geo + names from the Luma snapshot and cursor.com/ambassadors; real upcoming events land via `luma_city_match` in derive, so `events` here holds only *curated past histories* (2–4 per city, dates Feb–Jul 2026, attendance 15–120 scaled to the real RSVP counts where known).
- Health-state variety must emerge from the data (Task 6 formula, not hand-labels): make Bangkok/London/Rio thriving-grade (dense cadence, rising attendance, recent host activity, strong funnels), Bangalore/Berlin/SF/Miami steady, Tallinn/Philadelphia/Barranquilla cooling (slipping cadence), Florence quiet (nothing since May 24 — matches the signal).
- Ambassadors: real names ONLY where public on Luma as event hosts (e.g. Hugo Doria — Aracaju, Josh Birdwell — OKC if OKC included, Mari Luukkainen — Helsinki); otherwise `"ambassador": { "name": null, "note": "host not yet mapped" }` — never invent a person.
- The 3 signals from the spec: Florence quiet (amber), Bangalore waitlist overflow 2× (amber), Brazil forum spike / no program in Belo Horizonte (green, opportunity).
- Funnel realism: redirect_used ≈ 45–60% of attended; signed_up ≈ 50–60% of redirect_used; activated_w1 ≈ 60–75% of signed_up; active_w4 ≈ 60–70% of activated_w1.

- [ ] **Step 4: Run `npm test` — expect all data-consistency tests PASS**

- [ ] **Step 5: Write the README schema section**

Replace the `(added in Task 5…)` placeholder with a table of every `cities.json` + `pulse.json` field → production source, e.g.:

```markdown
| Field | In demo | Production source |
|---|---|---|
| events.name/date/venue/rsvps | Luma snapshot (real) | Luma API (calendar webhook) |
| funnel.redirect_used | illustrative | link-redirect service (per-event short links) |
| funnel.signed_up / activated_w1 / active_w4 | illustrative | product telemetry joined on signup attribution |
| members | illustrative | community CRM / Slack + forum identity join |
| host_last_active | illustrative | ambassador Slack activity + Luma host actions |
| health.* | computed | derive.mjs — same formula, real inputs |
```

- [ ] **Step 6: Commit**

```bash
git add data/cities.json tests/data-consistency.test.mjs README.md
git commit -m "feat: curated city dataset with consistency tests + schema docs"
```

---

### Task 6: Health formula + derive pipeline

**Files:**
- Create: `scripts/lib/health.mjs`, `scripts/derive.mjs`
- Test: `tests/health.test.mjs`
- Output (committed): `data/pulse.json`

**Interfaces:**
- Consumes: `data/cities.json`, `data/raw-events.json`.
- Produces: `scripts/lib/health.mjs` exports `healthScore(city, today) → {score, state, factors}` and `FORMULA_TEXT` (the exact human-readable formula string the UI popover renders — single source of truth). `scripts/derive.mjs` writes `data/pulse.json`:

```json
{
  "generated_at": "…", "week_of": "2026-07-06",
  "formula": "<FORMULA_TEXT verbatim>",
  "kpis": {
    "active_programs": { "value": 16, "delta": 2, "spark": [/*12 weekly ints*/] },
    "events_30d": { "value": 9, "delta": 3, "spark": [] },
    "activation_rate_30d": { "value": 0.21, "delta": 0.03, "spark": [] },
    "new_builders_30d": { "value": 118, "delta": 24, "spark": [] }
  },
  "cities": [ { "id", "name", "country", "lat", "lng", "ambassador", "members",
                "health": { "state", "score", "factors": { "cadence", "trend", "recency", "funnel" } },
                "next_event": {"name","date","rsvps","url"} | null,
                "events": [ …past, newest first, with funnels… ] } ],
  "signals": [ …verbatim from cities.json… ]
}
```

- [ ] **Step 1: Write failing health tests**

`tests/health.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { healthScore, FORMULA_TEXT } from '../scripts/lib/health.mjs';

const TODAY = '2026-07-09';
const mk = (over) => ({
  baseline_60d: 2, host_last_active: '2026-07-01',
  events: [
    { date: '2026-06-20', status: 'past', attended: 60, rsvps: 70,
      funnel: { redirect_used: 30, signed_up: 18, activated_w1: 12, active_w4: 8, unattributed: 30 } },
    { date: '2026-05-25', status: 'past', attended: 50, rsvps: 60 },
    { date: '2026-04-28', status: 'past', attended: 40, rsvps: 55 },
  ], ...over,
});

test('dense recent cadence + rising attendance + fresh host + solid funnel → thriving', () => {
  const h = healthScore(mk({}), TODAY);
  assert.equal(h.state, 'thriving');
  assert.ok(h.score >= 0.75 && h.score <= 1);
});

test('no events in 60d and stale host → quiet', () => {
  const h = healthScore(mk({
    host_last_active: '2026-04-01',
    events: [{ date: '2026-03-10', status: 'past', attended: 30, rsvps: 40 }],
  }), TODAY);
  assert.equal(h.state, 'quiet');
});

test('factors are all in [0,1] and state matches score bands', () => {
  for (const over of [{}, { baseline_60d: 6 }, { host_last_active: '2026-05-01' }]) {
    const h = healthScore(mk(over), TODAY);
    Object.values(h.factors).forEach(v => assert.ok(v >= 0 && v <= 1));
    const s = h.score;
    const want = s >= 0.75 ? 'thriving' : s >= 0.5 ? 'steady' : s >= 0.3 ? 'cooling' : 'quiet';
    assert.equal(h.state, want);
  }
});

test('formula text names the real weights', () => {
  for (const frag of ['0.35', '0.25', '0.20', 'cadence', 'trend', 'recency', 'funnel'])
    assert.ok(FORMULA_TEXT.includes(frag), `missing ${frag}`);
});
```

- [ ] **Step 2: Run `npm test` — expect FAIL (health.mjs missing)**

- [ ] **Step 3: Implement health.mjs**

```js
// The one health formula. The UI popover renders FORMULA_TEXT verbatim —
// if you change the code, change the text in the same commit.
const DAY = 86400000;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const days = (a, b) => (new Date(a) - new Date(b)) / DAY;

export const FORMULA_TEXT =
  'health = 0.35·cadence + 0.25·trend + 0.20·recency + 0.20·funnel\n' +
  'cadence  events last 60d vs the city’s own trailing baseline\n' +
  'trend    slope of the last 3 events’ attendance\n' +
  'recency  days since the host was last active (60d floor)\n' +
  'funnel   attended → activated-week-1, most recent measured event\n' +
  'thriving ≥ .75 · steady ≥ .50 · cooling ≥ .30 · quiet < .30';

export function healthScore(city, today) {
  const past = city.events.filter(e => e.status === 'past')
    .sort((a, b) => b.date.localeCompare(a.date));

  const in60 = past.filter(e => days(today, e.date) <= 60).length;
  const cadence = clamp(in60 / Math.max(city.baseline_60d, 1));

  const last3 = past.slice(0, 3).reverse();
  let trend = 0.5;
  if (last3.length >= 2) {
    const rel = (last3.at(-1).attended - last3[0].attended) / Math.max(last3[0].attended, 1);
    trend = clamp((rel + 0.5) / 1.0);           // -50%→0, flat→0.5, +50%→1
  }

  const recency = clamp(1 - days(today, city.host_last_active) / 60);

  const measured = past.find(e => e.funnel);
  const funnel = measured
    ? clamp((measured.funnel.activated_w1 / Math.max(measured.attended, 1)) / 0.4)
    : 0.5;                                       // unmeasured: neutral, not penalized

  const score = +(0.35 * cadence + 0.25 * trend + 0.20 * recency + 0.20 * funnel).toFixed(3);
  const state = score >= 0.75 ? 'thriving' : score >= 0.5 ? 'steady'
    : score >= 0.3 ? 'cooling' : 'quiet';
  return { score, state, factors: { cadence: +cadence.toFixed(2), trend: +trend.toFixed(2),
    recency: +recency.toFixed(2), funnel: +funnel.toFixed(2) } };
}
```

- [ ] **Step 4: Run `npm test` — expect health tests PASS. If the thriving fixture lands below .75, tune the fixture's dates (cadence) — NOT the weights — and re-run.**

- [ ] **Step 5: Write derive.mjs**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { healthScore, FORMULA_TEXT } from './lib/health.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const { cities, signals } = read('cities.json');
const raw = read('raw-events.json');

const today = new Date().toISOString().slice(0, 10);
const monday = (d => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); })(today);
const DAY = 86400000;
const daysAgo = (date) => (Date.now() - new Date(date)) / DAY;

// Attach real upcoming Luma events to their city.
for (const c of cities) {
  const match = (raw.events || []).filter(e =>
    e.city && (c.luma_city_match || [c.name]).some(m => e.city.toLowerCase().includes(m.toLowerCase()))
  ).filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  c.next_event = match[0]
    ? { name: match[0].name, date: match[0].date, rsvps: match[0].guest_count, url: match[0].url }
    : (c.events.find(e => e.status === 'upcoming')
        ? (({ name, date, rsvps }) => ({ name, date, rsvps, url: null }))(c.events.find(e => e.status === 'upcoming'))
        : null);
}

const past = (c) => c.events.filter(e => e.status === 'past');
const inWindow = (e, from, to) => daysAgo(e.date) <= from && daysAgo(e.date) > to;
const sumF = (evs, k) => evs.reduce((s, e) => s + (e.funnel?.[k] ?? 0), 0);

const win = cities.flatMap(c => past(c).filter(e => inWindow(e, 30, 0)));
const prev = cities.flatMap(c => past(c).filter(e => inWindow(e, 60, 30)));
const attended = (evs) => evs.reduce((s, e) => s + e.attended, 0);
const rate = (evs) => { const a = attended(evs.filter(e => e.funnel)); return a ? +(sumF(evs, 'activated_w1') / a).toFixed(2) : 0; };

// 12 weekly buckets for sparklines (events per week; builders per week).
const spark = (fn) => Array.from({ length: 12 }, (_, i) => {
  const evs = cities.flatMap(c => past(c).filter(e => inWindow(e, (12 - i) * 7, (11 - i) * 7)));
  return fn(evs);
});

const active = (list) => list.filter(c =>
  past(c).some(e => daysAgo(e.date) <= 90) || c.next_event).length;

const pulse = {
  generated_at: new Date().toISOString(),
  week_of: monday,
  formula: FORMULA_TEXT,
  kpis: {
    active_programs: { value: active(cities), delta: 2, spark: spark(evs => new Set(evs.map(e => e.name)).size) },
    events_30d: { value: win.length, delta: win.length - prev.length, spark: spark(evs => evs.length) },
    activation_rate_30d: { value: rate(win), delta: +(rate(win) - rate(prev)).toFixed(2), spark: spark(rate) },
    new_builders_30d: { value: sumF(win, 'signed_up'), delta: sumF(win, 'signed_up') - sumF(prev, 'signed_up'), spark: spark(evs => sumF(evs, 'signed_up')) },
  },
  cities: cities.map(c => ({
    id: c.id, name: c.name, country: c.country, lat: c.lat, lng: c.lng,
    ambassador: c.ambassador, members: c.members,
    health: healthScore(c, today),
    next_event: c.next_event,
    events: past(c).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
  })),
  signals,
};

writeFileSync(new URL('../data/pulse.json', import.meta.url), JSON.stringify(pulse, null, 2));
const states = pulse.cities.reduce((m, c) => (m[c.health.state] = (m[c.health.state] || 0) + 1, m), {});
console.log('pulse.json:', pulse.cities.length, 'cities', states);
```

Note: `active_programs.delta: 2` is the one hand-set delta (program count history doesn't exist in the dataset); it stays plausible and small.

- [ ] **Step 6: Run `npm run derive` — expect e.g. `pulse.json: 16 cities { thriving: 3, steady: 6, cooling: 4, quiet: 3 }`. Verify Bangkok is thriving and Florence quiet: `node -e "const p=require('./data/pulse.json'); for (const c of p.cities) console.log(c.id, c.health.state, c.health.score)"`. If the distribution is off, adjust cities.json histories (dates/attendance), re-run derive and `npm test` — never the weights.**

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/health.mjs scripts/derive.mjs tests/health.test.mjs data/pulse.json
git commit -m "feat: health formula (tested) + derive pipeline producing pulse.json"
```

---

### Task 7: Static shell — header, KPI strip, map frame, footer

**Files:**
- Create: `index.html`, `styles.css`
- Reference: `DESIGN.md` (binding), `assets/fonts/`

**Interfaces:**
- Produces: DOM ids consumed by Task 8–10 JS: `#map` (svg container), `#kpis` (4 `.kpi` articles with `data-kpi="active_programs|events_30d|activation_rate_30d|new_builders_30d"`), `#signals`, `#panel`, `#panel-backdrop`, `#tooltip`, `#formula-popover`, `#freshness`.

- [ ] **Step 1: Self-host the font**

```bash
mkdir -p assets/fonts assets/photos/bangkok
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@1,400&display=swap" \
  | grep -o 'https://[^)]*\.woff2' | head -1 \
  | xargs -I{} curl -s {} -o assets/fonts/eb-garamond-latin-i400.woff2
ls -la assets/fonts/   # expect one woff2, 20–90 KB
```

- [ ] **Step 2: Write index.html**

Structure (complete file; copy is final, no filler):
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Community Pulse — a concept for Cursor</title>
<meta name="description" content="A working concept of an internal community-ops dashboard for Cursor's community programs.">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="top">
  <div>
    <p class="label">Community Pulse</p>
    <h1>The community, this week</h1>
  </div>
  <div class="top-meta">
    <p class="serif-accent" id="week-label">Week of —</p>
    <p class="small" id="freshness">synced —</p>
  </div>
</header>

<section id="kpis" aria-label="Program KPIs">
  <article class="kpi" data-kpi="active_programs"><p class="label">Active programs</p><p class="num-lg">—</p><p class="delta small">—</p><svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"></svg></article>
  <article class="kpi" data-kpi="events_30d"><p class="label">Events · last 30d</p><p class="num-lg">—</p><p class="delta small">—</p><svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"></svg></article>
  <article class="kpi" data-kpi="activation_rate_30d"><p class="label">Attendee → activated</p><p class="num-lg">—</p><p class="delta small">—</p><svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"></svg></article>
  <article class="kpi" data-kpi="new_builders_30d"><p class="label">New builders · 30d</p><p class="num-lg">—</p><p class="delta small">—</p><svg class="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"></svg></article>
</section>

<section class="map-card" aria-label="Program map">
  <div class="map-head">
    <div class="legend" aria-hidden="true">
      <span><i class="dot thriving"></i>thriving</span><span><i class="dot steady"></i>steady</span>
      <span><i class="dot cooling"></i>cooling</span><span><i class="dot quiet"></i>quiet</span>
    </div>
    <button id="formula-btn" class="small" aria-expanded="false" aria-controls="formula-popover">ⓘ how health is computed</button>
  </div>
  <div id="map" role="img" aria-label="World map of community programs, colored by health"></div>
  <div id="formula-popover" class="popover" hidden><pre class="num"></pre></div>
  <div id="tooltip" class="tooltip" hidden></div>
</section>

<section id="signals" aria-label="Needs attention">
  <h2>Needs attention</h2>
  <div class="signal-row"></div>
</section>

<aside id="panel" aria-label="City detail" hidden></aside>
<div id="panel-backdrop" hidden></div>

<footer>
  <p class="small">A concept by <a href="https://theshajha.com">Shashank Jha</a> for the Community Engineer role.</p>
  <p class="small sec">Cities and events are real, from the public <a href="https://luma.com/cursorcommunity">Luma calendar</a>. The attribution layer is illustrative — that's the part I'd build. <a href="DESIGN.md">Design language</a> · <a href="https://github.com/theshajha">Source</a></p>
</footer>

<script src="app.js" type="module"></script>
</body>
</html>
```

- [ ] **Step 3: Write styles.css**

Token block copied from DESIGN.md verbatim, then components. Opening section (the rest of the file implements the DESIGN.md components table exactly):
```css
/* Tokens — source of truth: DESIGN.md. Drift is a bug. */
:root {
  --bg:#14120b; --card-01:#1b1913; --card-02:#1d1b15; --card-03:#201e18; --card-04:#26241e;
  --fg:#edecec;
  --text-sec:color-mix(in oklab, var(--fg) 60%, transparent);
  --text-ter:color-mix(in oklab, var(--fg) 40%, transparent);
  --border-1:color-mix(in oklab, var(--fg) 6%, transparent);
  --border-2:color-mix(in oklab, var(--fg) 12%, transparent);
  --border-3:color-mix(in oklab, var(--fg) 22%, transparent);
  --green:#1f8a65; --red:#cf2d56; --amber:#c08532; --accent:#f54e00;
  --health-thriving:#2ea87d; --health-steady:#8a8779;
  --health-cooling:#c08532; --health-quiet:#8c4a56;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px; --s8:64px;
  --r-sm:6px; --r-md:10px; --r-lg:14px;
  --sans:system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
  --serif:"EB Garamond",Georgia,serif;
}
@font-face { font-family:"EB Garamond"; font-style:italic; font-weight:400;
  src:url(assets/fonts/eb-garamond-latin-i400.woff2) format("woff2"); font-display:swap; }
```
Layout: page `max-width:1120px; margin-inline:auto; padding:var(--s5)` (16px mobile); `#kpis` = `grid-template-columns:repeat(4,1fr)` → `repeat(2,1fr)` under 720px; `.map-card` fills width, `#map svg` `width:100%; height:auto`; `#panel` fixed right 420px desktop / `inset:0` sheet under 720px with `transform` slide + 200ms `cubic-bezier(.32,.72,.35,1)`; `@media (prefers-reduced-motion: reduce){ *{transition:none !important; animation:none !important} }`. Funnel bars, signal cards, tooltip, popover per DESIGN.md components table.

- [ ] **Step 4: Render gate (REQUIRED — frontend-design skill)**

Serve locally (`python3 -m http.server 4173`), screenshot 390×844 and 1440×900 via Playwright, critique against DESIGN.md (spacing rhythm, border subtlety, mono/sans mix, warm blacks — must NOT read as generic dark dashboard), fix, repeat until it passes a hostile "does this look AI-generated?" read.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css assets/fonts/
git commit -m "feat: static shell — header, KPI strip, map frame, signals, footer"
```

---

### Task 8: app.js — data load + map render + tooltip

**Files:**
- Create: `app.js`
- Modify: none (uses ids from Task 7)

**Interfaces:**
- Consumes: `data/pulse.json`, `data/map-path.json`, DOM ids from Task 7.
- Produces: `renderMap(pulse, mapPath)`, `project()` (mirror of Task 2), `fmt` helpers; `selectCity(id)` stub that Task 9 fills. City dots are `<circle class="city" data-id tabindex="0" role="button" aria-label="…">`.

- [ ] **Step 1: Implement load + map + tooltip**

Core of `app.js` (complete the obvious wiring; keep functions small):
```js
const $ = (s, el = document) => el.querySelector(s);

// MIRROR of scripts/lib/project.mjs — keep character-identical.
const MAP_W = 1000, MAP_H = 500, VIEWBOX = '0 14 1000 403';
function project(lat, lng) {
  return { x: ((lng + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H };
}

const [pulse, mapPath] = await Promise.all([
  fetch('data/pulse.json').then(r => r.json()),
  fetch('data/map-path.json').then(r => r.json()),
]);

const fmtDate = (iso) => new Date(iso + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const rel = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 60 ? `synced ${m} min ago` : `synced ${Math.round(m / 60)} h ago`; };

$('#week-label').textContent = `Week of ${fmtDate(pulse.week_of)}`;
$('#freshness').textContent = rel(pulse.generated_at);
$('#formula-popover pre').textContent = pulse.formula;

function renderMap() {
  const r = (c) => 3.5 + 3.5 * Math.min(c.members / 500, 1);
  const dots = pulse.cities.map(c => {
    const { x, y } = project(c.lat, c.lng);
    return `<circle class="city ${c.health.state}" data-id="${c.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r(c).toFixed(1)}" tabindex="0" role="button" aria-label="${c.name} — ${c.health.state}"/>`;
  }).join('');
  $('#map').innerHTML =
    `<svg viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg">
       <path class="land" d="${mapPath.d}"/>${dots}</svg>`;
}
renderMap();
```
Tooltip: `pointerenter/focus` on `.city` fills `#tooltip` (name+country, ambassador or "host not yet mapped", next event or last event + date, health state word) and positions it clamped to the map box; `pointerleave/blur` hides. Land path styling in CSS: `.land { stroke: color-mix(in oklab, var(--fg) 7%, transparent); stroke-width: 2.2; stroke-linecap: round; fill: none; }`. Health classes color city dots via CSS (`.city.thriving { fill: var(--health-thriving); }` etc. + 1px ring via `stroke`).

- [ ] **Step 2: Verify in browser**

Serve, screenshot 1440×900: every city from pulse.json visible at sane coordinates (Bangkok in SE Asia, Rio in Brazil — spot-check against a real map), tooltips appear on hover AND keyboard focus, no console errors.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: map render with computed health states + tooltips"
```

---

### Task 9: Drill-down panel + health popover

**Files:**
- Modify: `app.js`, `styles.css`

**Interfaces:**
- Consumes: `selectCity(id)` wiring from Task 8 (click + Enter/Space on `.city`).
- Produces: complete panel per spec §Screen-anatomy-4; `#formula-btn` toggles the popover (rendered from `pulse.formula` — never a second copy of the formula text).

- [ ] **Step 1: Implement selectCity(id)**

Renders into `#panel` (template literal; all values from `pulse.cities`):
- Header: city + country, health badge (state word, colored dot), one-line explainer built from the weakest/strongest factors, e.g. `Thriving — 6 events in 90 days, attendance rising, host active this week.` Generate: pick top factor and bottom factor from `health.factors` with a phrase map (`cadence`: "N events in 90 days" / "no recent events", `trend`: "attendance rising/slipping", `recency`: "host active recently/quiet N weeks", `funnel`: "strong/weak activation") — real numbers, not adjectives, wherever the data has them.
- Ambassador row: name, or `Host not yet mapped` in `--text-ter` when null.
- Next event (if any): name, date, RSVP count, small `↗` link when `url` exists.
- Last-event card: name, date, venue, `attended / rsvps` in mono; Bangkok additionally renders `media` as a 3-up lazy-loaded photo row (`loading="lazy"`, `alt` text naming the event) with credit line `Photos: Shashank Jha — Cursor Sunday Bangkok`.
- Funnel: 6 rows (RSVP'd, Attended, Used redirect, New signup, Activated wk 1, Active wk 4) — bar width % of RSVP'd, count right-aligned in mono; then the hatched `Unattributed` row with a one-line note: `attended but never used an event link — the gap attribution infrastructure closes`. Cities with no measured funnel render the empty state: `No attribution data — no instrumented links at this event yet.`
- Event history: up to 4 compact rows (date · name · attended).
- Open/close: backdrop click, `Esc`, mobile swipe-down (pointer events, 60px threshold). Focus management: panel gets `focus()` on open, returns to the originating dot on close.

- [ ] **Step 2: Implement the popover** — `#formula-btn` toggles `hidden` + `aria-expanded`; `Esc` and outside-click close.

- [ ] **Step 3: Render gate (REQUIRED — frontend-design skill):** screenshots of the open panel (Bangkok, Florence, a no-funnel city) at 390×844 and 1440×900; hostile critique against DESIGN.md; iterate.

- [ ] **Step 4: Commit**

```bash
git add app.js styles.css
git commit -m "feat: drill-down panel with attribution funnel + formula popover"
```

---

### Task 10: KPIs, sparklines, signals

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `pulse.kpis`, `pulse.signals`, DOM from Task 7.

- [ ] **Step 1: Fill KPIs** — value (`activation_rate_30d` as `21%`), delta with `▲`/`▼` colored `--green`/`--red` (a negative delta on activation reads red; zero delta renders `—` in `--text-ter`), sparkline as one `<polyline>` per `.spark` svg normalized to its own min/max, stroke `--border-3`, last point marked with a 1.5px circle in `--fg`.

- [ ] **Step 2: Render signals** — three cards per DESIGN.md signal-card spec, severity dot colored, action line prefixed `→` in mono. Clicking a signal with `city_id` calls `selectCity(city_id)`.

- [ ] **Step 3: Verify** — screenshot: KPI numbers match `pulse.json` exactly (`node -e "console.log(require('./data/pulse.json').kpis)"` side-by-side), three signal cards, no console errors.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: KPI strip with sparklines + needs-attention signals"
```

---

### Task 11: Bangkok photos

**Files:**
- Create: `assets/photos/bangkok/01.jpg` … (3 photos)
- Modify: `data/cities.json` (media paths), re-run `npm run derive`

**Blocked on:** Shashank dropping his own Cursor Sunday Bangkok photos into `assets/photos/bangkok/raw/`. **If absent at execution time:** skip compression, keep `media: []` (as authored in Task 5 — media stays empty until photos physically exist), and let the Bangkok panel use the standard no-media state — the build must not wait.

- [ ] **Step 1: Compress (if photos present)**

```bash
cd assets/photos/bangkok
for f in raw/*.jpg raw/*.jpeg raw/*.png; do [ -e "$f" ] || continue;
  sips -Z 1200 --setProperty formatOptions 72 -s format jpeg "$f" --out "$(basename "${f%.*}").jpg"; done
ls -la   # pick the best 3, name them 01.jpg 02.jpg 03.jpg, delete the rest; total ≤ 400 KB
rm -rf raw
```

- [ ] **Step 2: Set `media` on the Cursor Sunday Bangkok event in cities.json, run `npm run derive && npm test` — all PASS**

- [ ] **Step 3: Verify in browser: photo row renders lazily with credit line; page weight excluding photos still < 300 KB (check DevTools network)**

- [ ] **Step 4: Commit**

```bash
git add assets/photos data/cities.json data/pulse.json
git commit -m "feat: Cursor Sunday Bangkok photos in city drill-down"
```

---

### Task 12: QA loop + deploy

**Files:**
- Modify: whatever QA surfaces; `README.md` (live URL)

- [ ] **Step 1: Full test suite: `npm test` — all PASS**

- [ ] **Step 2: Hostile visual QA (frontend-design skill gate, final round)**

Playwright screenshots at 390×844, 1440×900, 1920×1080: closed state, tooltip visible, Bangkok panel open, popover open, mobile sheet open. Critique each against DESIGN.md line by line (colors sampled, spacing measured). Fix and repeat until no finding.

- [ ] **Step 3: Mechanical checks**

- Console: zero errors/warnings on load and through a full interaction pass.
- Keyboard: tab reaches every city dot, Enter opens panel, Esc closes, focus returns.
- Reduced motion: emulate `prefers-reduced-motion` — no transitions.
- Copy pass: read every visible string aloud; no filler, no exclamation marks.
- Data honesty: footer line present; formula popover text === `FORMULA_TEXT`.
- Weight: `find . -not -path './node_modules/*' -not -path './.git/*' -not -path './assets/photos/*' \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.json' -o -name '*.woff2' \) -not -path './tests/*' -not -path './docs/*' -not -name 'cities.json' -not -name 'raw-events.json' -not -name 'package*.json' | xargs wc -c` → total < 300 KB.
- Lighthouse (Chrome DevTools, mobile): Performance ≥ 95, Accessibility ≥ 95.

- [ ] **Step 4: Deploy**

```bash
npx vercel deploy --prod --yes   # project name: community-pulse
```
Expected: production URL. Open it, click through once on desktop + phone-width. Add the URL to README.md. Custom domain (pulse.theshajha.com) only if Shashank has confirmed it — otherwise ship the vercel.app URL and note the domain as a follow-up.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: QA pass + production deploy"
```

---

## Not in this plan (follow-ups handled in the agents repo after deploy)

- `akasha/threads/cursor-community-engineer.md` thread + status updates.
- The 4–6 line email draft to Sunita (draft-email skill, voice calibration, never auto-sent).
- Custom-domain DNS if Shashank picks `pulse.theshajha.com`.
