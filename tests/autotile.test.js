import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mvFloorQuarter, mvWallQuarter } from '../src/ui/autotile.js';

const quarters = (fn, same) => [0, 1, 2, 3].map((q) => fn(same, q));

test('autotile de sol MV : centre, coin intérieur, bords, case isolée', () => {
  assert.deepEqual(quarters(mvFloorQuarter, () => true), [[2, 4], [1, 4], [2, 3], [1, 3]], 'centre');
  const noDiag = (dx, dy) => !(dx === -1 && dy === -1);
  assert.deepEqual(mvFloorQuarter(noDiag, 0), [2, 0], 'coin intérieur haut-gauche');
  const none = (dx, dy) => dx === 0 && dy === 0;
  assert.deepEqual(quarters(mvFloorQuarter, none), [[0, 2], [3, 2], [0, 5], [3, 5]], 'case isolée : 4 coins extérieurs');
  const row = (dx, dy) => dy === 0; // bande horizontale
  assert.deepEqual(quarters(mvFloorQuarter, row), [[2, 2], [1, 2], [2, 5], [1, 5]], 'bords haut et bas');
  const col = (dx) => dx === 0; // bande verticale
  assert.deepEqual(quarters(mvFloorQuarter, col), [[0, 4], [3, 4], [0, 3], [3, 3]], 'bords gauche et droit');
});

test('autotile de mur MV : milieu, extrémités', () => {
  assert.deepEqual(quarters(mvWallQuarter, () => true), [[2, 2], [1, 2], [2, 1], [1, 1]], 'milieu');
  assert.deepEqual(quarters(mvWallQuarter, () => false), [[0, 0], [3, 0], [0, 3], [3, 3]], 'face seule');
  const row = (dx, dy) => dy === 0;
  assert.deepEqual(quarters(mvWallQuarter, row), [[2, 0], [1, 0], [2, 3], [1, 3]], 'une rangée : haut et bas');
});
