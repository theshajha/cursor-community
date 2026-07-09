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
