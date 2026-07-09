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

Every field in `data/cities.json` and (once Task 6 lands) `data/pulse.json`,
annotated with its production source:

| Field | In demo | Production source |
|---|---|---|
| cities[].id/name/country/lat/lng | real (public Luma calendar + known geo) | Luma API (calendar webhook) + geocoding on first sync |
| cities[].luma_city_match | curated (alias list for fuzzy join) | same — maintained as new Luma city-string variants appear |
| events[].name/date/venue/rsvps | real where sourced from Luma (Bangkok's Cursor Sunday); curated elsewhere | Luma API (calendar webhook) |
| events[].attended | illustrative, anchored to real RSVPs where known | check-in scan or host-reported headcount |
| events[].status | derived | past vs. upcoming, from event date at build time |
| events[].media | real (Bangkok only) or empty | ambassador-submitted photos, credited |
| events[].source/url | firsthand where Shashank attended/hosted; omitted elsewhere | event page URL from the Luma API |
| funnel.redirect_used | illustrative | link-redirect service (per-event short links) |
| funnel.signed_up / activated_w1 / active_w4 | illustrative | product telemetry joined on signup attribution |
| funnel.unattributed | computed (attended − redirect_used) | same — computed, not measured |
| members | illustrative | community CRM / Slack + forum identity join |
| ambassador.name/note | real where publicly listed as a Luma host; null + "host not yet mapped" otherwise | ambassador directory (cursor.com/ambassadors) + Luma host field |
| host_last_active | illustrative | ambassador Slack activity + Luma host actions |
| baseline_60d | curated (seeds the cadence factor) | trailing 6-month rolling average, computed at build time |
| signals[] | curated (3 hand-picked, matching the spec) | auto-surfaced by threshold rules over `health.*` and forum/CRM signals |
| health.* | computed | `derive.mjs` — same formula, real inputs |
