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
