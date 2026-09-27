import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pickNext, nearest, padDirection } from '../src/ui/gamepadNav.js';

const r = (x, y, w = 40, h = 40) => ({ x, y, w, h });

test('manette : le curseur va au voisin le plus proche dans la direction, aligné de préférence', () => {
  const from = r(100, 100);
  const rects = [r(200, 100), r(160, 300), r(100, 200), r(0, 100), r(100, 0), r(150, 180)];
  assert.equal(pickNext(from, rects, { dx: 1, dy: 0 }), 0, 'à droite, sur la même ligne');
  assert.equal(pickNext(from, rects, { dx: -1, dy: 0 }), 3);
  assert.equal(pickNext(from, rects, { dx: 0, dy: -1 }), 4);
  assert.equal(pickNext(from, rects, { dx: 0, dy: 1 }), 2, 'en dessous, aligné plutôt que plus proche en diagonale');
  assert.equal(pickNext(from, [r(0, 0)], { dx: 1, dy: 0 }), -1, 'rien de ce côté');
  assert.equal(nearest({ x: 115, y: 215 }, rects), 2);
});

test('manette : direction de la croix ou du stick gauche (axe dominant, zone morte)', () => {
  const btn = (i) => Array.from({ length: 17 }, (_, k) => ({ pressed: k === i }));
  assert.deepEqual(padDirection(btn(12), [0, 0]), { dx: 0, dy: -1 });
  assert.deepEqual(padDirection(btn(15), [0, 0]), { dx: 1, dy: 0 });
  assert.equal(padDirection(btn(-1), [0.3, -0.2]), null, 'zone morte');
  assert.deepEqual(padDirection(btn(-1), [0.2, 0.9]), { dx: 0, dy: 1 });
  assert.deepEqual(padDirection(btn(-1), [-0.8, 0.6]), { dx: -1, dy: 0 });
});
