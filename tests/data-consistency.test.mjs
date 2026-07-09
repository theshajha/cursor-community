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
