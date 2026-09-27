import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { itemIcon, iconHtml, EQUIP_BASE } from '../src/ui/icons.js';
import { WEAPON_TYPES, ARMOR_TYPES, RARITIES } from '../src/data/items.js';

// Planche des équipements : 6 colonnes (raretés) × 27 lignes de 16 px.
const png = readFileSync(new URL('../assets/icons/equipment.png', import.meta.url));
const size = { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };

test('icônes d\'équipement : une icône par pièce, type et rareté, prise dans la planche dédiée', () => {
  assert.deepEqual(size, { w: 96, h: 432 });
  const rows = size.h / 16;
  const seen = new Set();
  const check = (item) => {
    const i = itemIcon(item) - EQUIP_BASE;
    assert.ok(i >= 0 && i < rows * 6, JSON.stringify(item));
    assert.ok(!seen.has(i), `icône en double : ${JSON.stringify(item)}`);
    seen.add(i);
  };
  const rarities = Object.keys(RARITIES);
  assert.equal(rarities.length, 6);
  for (const rarity of rarities) {
    for (const weaponType of Object.keys(WEAPON_TYPES)) check({ slotType: 'arme', weaponType, rarity });
    for (const armorType of Object.keys(ARMOR_TYPES)) for (const slotType of ['casque', 'epaulieres', 'plastron', 'gants', 'bottes']) check({ slotType, armorType, rarity });
    for (const slotType of ['anneau', 'collier', 'bouclier']) check({ slotType, rarity });
  }
  assert.equal(seen.size, rows * 6, 'toute la planche est utilisée');
  // La rareté change la colonne : commun à gauche, divin à droite.
  assert.equal(itemIcon({ slotType: 'anneau', rarity: 'divin' }) - itemIcon({ slotType: 'anneau', rarity: 'commun' }), 5);
  assert.match(iconHtml(itemIcon({ slotType: 'anneau', rarity: 'rare' }), 32), /class="ic eq/);
});
