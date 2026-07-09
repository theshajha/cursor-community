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
