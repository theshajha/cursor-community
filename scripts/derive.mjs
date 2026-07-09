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
