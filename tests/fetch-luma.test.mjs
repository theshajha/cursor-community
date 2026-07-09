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
