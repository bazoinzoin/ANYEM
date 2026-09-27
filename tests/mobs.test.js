import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../src/data/enemies.js';
import { DUNGEONS } from '../src/data/dungeons.js';
import { ENEMY_LOOKS, mobTier, mobScale, TIER_FACTOR } from '../src/ui/mobSprites.js';
import { MOB_SHEETS } from '../src/ui/mobSheets.js';
import { ASSET_DATA } from '../src/ui/assetData.js';

test('bestiaire : chaque créature a une planche du pack de monstres, et chaque créature apparaît', () => {
  for (const key of Object.keys(ENEMIES)) {
    const look = ENEMY_LOOKS[key];
    assert.ok(look, key);
    const meta = MOB_SHEETS[look.sheet];
    assert.ok(meta, `${key} → ${look.sheet}`);
    for (const anim of ['idle', 'walk', 'attack', 'hit', 'die']) {
      assert.ok(meta[anim] > 0, `${look.sheet} ${anim}`);
      assert.ok(ASSET_DATA[`mobs/${look.sheet}_${anim}`], `image mobs/${look.sheet}_${anim}`);
    }
  }
  const used = new Set(Object.values(DUNGEONS).flatMap((d) => d.subzones.flatMap((s) => [...s.pool, ...(s.elites ?? []), s.boss])));
  for (const key of Object.keys(ENEMIES)) assert.ok(used.has(key), `${key} n'apparaît dans aucune zone`);
  // Toutes les planches du pack sont utilisées.
  const sheets = new Set(Object.values(ENEMY_LOOKS).map((l) => l.sheet));
  for (const sheet of Object.keys(MOB_SHEETS)) assert.ok(sheets.has(sheet), sheet);
});

test('tailles : normal < élite < boss, en agrandissements entiers limités par la hauteur', () => {
  assert.ok(TIER_FACTOR.normal < TIER_FACTOR.elite && TIER_FACTOR.elite < TIER_FACTOR.boss);
  assert.equal(mobTier('gobelin'), 'normal');
  assert.equal(mobTier('loupAlpha'), 'elite');
  assert.equal(mobTier('chefGobelin'), 'boss');
  assert.equal(mobScale('gobelin', 3), 3);
  assert.equal(mobScale('loupAlpha', 3), 5);
  assert.equal(mobScale('ogre', 3), 6);
  // Un grand dragon est réduit pour tenir dans la scène.
  const s = mobScale('seigneurDeLAbime', 3, 190);
  assert.ok(Number.isInteger(s) && s * MOB_SHEETS.AncientBlackDragon.body[3] <= 190);
});
