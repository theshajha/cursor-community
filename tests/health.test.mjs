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
