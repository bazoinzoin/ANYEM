import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { generateItem, rollRarity } from '../src/game/items.js';
import { RARITIES, SECONDARY_STATS, LEGENDARIES } from '../src/data/items.js';

beforeEach(() => setRandomSource(null));

test('chaque rareté a le bon nombre de stats secondaires, sans doublon', () => {
  for (const [rarity, def] of Object.entries(RARITIES)) {
    for (let i = 0; i < 50; i++) {
      const item = generateItem({ level: 5, rarity });
      assert.equal(item.secondaries.length, def.secondaries, `${rarity} : ${item.name}`);
      assert.equal(new Set(item.secondaries).size, item.secondaries.length);
      for (const k of item.secondaries) {
        assert.ok(k in SECONDARY_STATS);
        assert.ok(!item.mandatory.includes(k) && k !== item.primary);
      }
    }
  }
});

test('stat obligatoire : attaque pour une arme, défense pour une armure, défense magique pour un bijou', () => {
  assert.ok(generateItem({ slotType: 'arme', weaponType: 'hache', rarity: 'commun' }).stats.atq > 0);
  assert.ok(generateItem({ slotType: 'bottes', armorType: 'lourde', rarity: 'commun' }).stats.def > 0);
  const shield = generateItem({ slotType: 'bouclier', rarity: 'commun' });
  assert.ok(shield.stats.def > 0 && shield.stats.blocage > 0);
  assert.ok(generateItem({ slotType: 'anneau', rarity: 'commun' }).stats.defMag > 0);
});

test('un objet commun ne porte que ses stats obligatoire et principale', () => {
  const item = generateItem({ slotType: 'plastron', armorType: 'moyenne', primary: 'agilite', rarity: 'commun' });
  assert.deepEqual(Object.keys(item.stats).sort(), ['agilite', 'def']);
});

test("la stat principale respecte le type d'objet (pas d'armure lourde d'intelligence)", () => {
  for (let i = 0; i < 100; i++) {
    const item = generateItem({ level: 3, rarity: 'commun' });
    if (item.armorType === 'lourde') assert.equal(item.primary, 'force');
    if (item.armorType === 'legere' || item.weaponType === 'baton') assert.equal(item.primary, 'intelligence');
  }
});

test("le niveau et la rareté augmentent les stats de l'objet", () => {
  const base = { slotType: 'arme', weaponType: 'epee', primary: 'force' };
  const low = generateItem({ ...base, level: 1, rarity: 'commun' });
  const high = generateItem({ ...base, level: 20, rarity: 'commun' });
  const rare = generateItem({ ...base, level: 20, rarity: 'epique' });
  assert.ok(high.stats.atq > low.stats.atq);
  assert.ok(rare.stats.atq > high.stats.atq);
  assert.equal(high.level, 20);
});

test('un légendaire est lié à une classe et porte un passif', () => {
  const item = generateItem({ level: 4, legendary: 'crocSanglant' });
  assert.equal(item.rarity, 'legendaire');
  assert.equal(item.name, LEGENDARIES.crocSanglant.name);
  assert.equal(item.legendary.classKey, 'voleur');
  assert.equal(item.weaponType, 'dague');
  assert.equal(item.secondaries.length, 4);
  const random = generateItem({ rarity: 'legendaire' });
  assert.ok(random.legendary);
});

test('le tirage de rareté suit les poids (commun le plus fréquent)', () => {
  let seed = 1;
  setRandomSource(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
  const counts = {};
  for (let i = 0; i < 5000; i++) {
    const rarity = rollRarity();
    counts[rarity] = (counts[rarity] ?? 0) + 1;
  }
  assert.ok(counts.commun > counts.peuCommun && counts.peuCommun > counts.rare && counts.rare > counts.epique);
});
