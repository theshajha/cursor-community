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
