import { test } from 'node:test';
import assert from 'node:assert/strict';

import { blobTile } from '../src/ui/autotile.js';

// Grille de test : '#' = terrain.
function at(rows) {
  return (x, y) => (dx, dy) => rows[y + dy]?.[x + dx] === '#';
}

test('tuiles blob : 48 formes distinctes, coins seulement si les deux côtés sont pleins', () => {
  const g = at([
    '.....',
    '.###.',
    '.###.',
    '.###.',
    '.....',
  ]);
  assert.deepEqual(blobTile(g(2, 2)), [2, 1], 'centre plein');
  assert.deepEqual(blobTile(g(1, 1)), [1, 0], 'coin haut-gauche');
  assert.deepEqual(blobTile(g(3, 3)), [3, 2], 'coin bas-droite');
  assert.deepEqual(blobTile(g(0, 0)), [5, 7], 'hors terrain : tuile vide');
  const iso = at(['...', '.#.', '...']);
  assert.deepEqual(blobTile(iso(1, 1)), [0, 3], 'case isolée');
  // Un coin sans ses deux côtés ne compte pas : même tuile qu'une case isolée.
  const diag = at(['#..', '.#.', '...']);
  assert.deepEqual(blobTile(diag(1, 1)), [0, 3]);
});

test('autotiles RPG Maker : centre, coin intérieur, bords et coins extérieurs', async () => {
  const { rmQuarter } = await import('../src/ui/autotile.js');
  const all = () => true;
  assert.deepEqual([0, 1, 2, 3].map((q) => rmQuarter(all, q)), [[1, 2], [1, 2], [1, 2], [1, 2]]);
  const noDiag = (dx, dy) => !(dx === -1 && dy === -1);
  assert.deepEqual(rmQuarter(noDiag, 0), [2, 0], 'coin intérieur haut-gauche');
  const none = (dx, dy) => dx === 0 && dy === 0;
  assert.deepEqual([0, 1, 2, 3].map((q) => rmQuarter(none, q)), [[0, 1], [2, 1], [0, 3], [2, 3]], 'case isolée : 4 coins extérieurs');
  const row = (dx, dy) => dy === 0; // bande horizontale
  assert.deepEqual([rmQuarter(row, 0), rmQuarter(row, 3)], [[1, 1], [1, 3]], 'bords haut et bas');
});
