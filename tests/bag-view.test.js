import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createHero } from '../src/game/party.js';
import { generateItem } from '../src/game/items.js';
import { bagItems, paginate } from '../src/ui/bagView.js';

beforeEach(() => setRandomSource(() => 0.5));

test('sac : onglets par catégorie, équipable par le héros, tri par rareté puis niveau', () => {
  const bag = [
    generateItem({ level: 5, rarity: 'commun', slotType: 'arme', weaponType: 'epee' }),
    generateItem({ level: 9, rarity: 'rare', slotType: 'arme', weaponType: 'arc' }),
    generateItem({ level: 3, rarity: 'epique', slotType: 'anneau' }),
    generateItem({ level: 7, rarity: 'rare', slotType: 'casque', armorType: 'legere' }),
    generateItem({ level: 2, rarity: 'rare', slotType: 'casque', armorType: 'lourde' }),
  ];
  const guerrier = createHero('guerrier');
  assert.deepEqual(bagItems(bag, 'weapons', guerrier).map((i) => i.weaponType), ['arc', 'epee']);
  assert.equal(bagItems(bag, 'jewels', guerrier).length, 1);
  assert.equal(bagItems(bag, 'armor', guerrier).length, 2);
  const all = bagItems(bag, 'all', guerrier);
  assert.equal(all[0].rarity, 'epique');
  assert.deepEqual(all.slice(1, 4).map((i) => i.level), [9, 7, 2], 'même rareté : niveau décroissant');
  const usable = bagItems(bag, 'usable', guerrier);
  assert.ok(!usable.some((i) => i.weaponType === 'arc'), "le guerrier ne manie pas l'arc");
});

test('pages de la grille : bornées, au moins une page', () => {
  const list = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(paginate(list, 0, 10), { items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], page: 0, pages: 3 });
  assert.deepEqual(paginate(list, 9, 10).items, [20, 21, 22], 'page trop grande : la dernière');
  assert.deepEqual(paginate([], 2, 10), { items: [], page: 0, pages: 1 });
});
