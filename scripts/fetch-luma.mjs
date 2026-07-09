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
