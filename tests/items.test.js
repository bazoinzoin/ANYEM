import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { generateItem, rollRarity, itemStats, itemStatLines } from '../src/game/items.js';
import { RARITIES, SECONDARY_STATS, LEGENDARIES, WEAPON_TYPES } from '../src/data/items.js';

beforeEach(() => setRandomSource(null));

test('chaque rareté a le bon nombre de stats secondaires, sans doublon', () => {
  for (const [rarity, def] of Object.entries(RARITIES)) {
    for (let i = 0; i < 50; i++) {
      const item = generateItem({ level: 5, rarity });
      const secondaries = Object.keys(item.bonus);
      assert.equal(secondaries.length, def.secondaries, `${rarity} : ${item.name}`);
      for (const k of secondaries) {
        assert.ok(k in SECONDARY_STATS);
        assert.ok(k !== item.primary);
        if (item.slotType !== 'bouclier') assert.ok(!item.mandatory.includes(k), `${item.name} : ${k} en double`);
      }
    }
  }
});

test('stat obligatoire : attaque pour une arme, défense pour une armure, défense magique pour un bijou', () => {
  assert.ok(generateItem({ slotType: 'arme', weaponType: 'hache', rarity: 'commun' }).stats.atq > 0);
  assert.ok(generateItem({ slotType: 'bottes', armorType: 'lourde', rarity: 'commun' }).stats.def > 0);
  const shield = generateItem({ slotType: 'bouclier', rarity: 'commun' });
  assert.deepEqual(shield.mandatory, ['def', 'blocage']);
  assert.ok(shield.stats.def > 0 && shield.stats.blocage > 0);
  assert.ok(generateItem({ slotType: 'anneau', rarity: 'commun' }).stats.defMag > 0);
});

test('un objet commun ne porte que ses stats obligatoire et principale', () => {
  const item = generateItem({ slotType: 'plastron', armorType: 'moyenne', primary: 'agilite', rarity: 'commun' });
  assert.deepEqual(Object.keys(item.stats).sort(), ['agilite', 'def']);
  const sword = generateItem({ slotType: 'arme', weaponType: 'epee', primary: 'agilite', rarity: 'commun' });
  assert.deepEqual(Object.keys(sword.stats).sort(), ['agilite', 'atq'], 'pas de vitesse sur une épée commune');
  // Toutes les bases possibles : obligatoire(s) + principale, rien d'autre.
  for (let i = 0; i < 300; i++) {
    const it = generateItem({ level: 1 + (i % 20), rarity: 'commun' });
    const expected = it.slotType === 'bouclier' ? 3 : 2; // bouclier : Défense + Blocage + principale
    assert.equal(Object.keys(it.stats).length, expected, `${it.name} : ${JSON.stringify(it.stats)}`);
    assert.deepEqual(it.bonus, {});
  }
});

test('bouclier : le Blocage peut ressortir en stat secondaire et se cumule', () => {
  let found = null;
  for (let i = 0; i < 400 && !found; i++) {
    const s = generateItem({ slotType: 'bouclier', rarity: 'epique', level: 5 });
    if ('blocage' in s.bonus) found = s;
  }
  assert.ok(found, 'un bouclier épique finit par tirer du Blocage en secondaire');
  assert.equal(itemStats(found).blocage, found.stats.blocage + found.bonus.blocage);
  const lines = itemStatLines(found).filter((l) => l.stat === 'blocage');
  assert.deepEqual(lines.map((l) => l.secondary), [false, true], 'affiché deux fois : obligatoire puis secondaire');
});

test('les stats secondaires apparaissent à partir de peu commun', () => {
  for (let i = 0; i < 100; i++) {
    const it = generateItem({ level: 5, rarity: 'peuCommun' });
    assert.equal(Object.keys(it.bonus).length, 1);
  }
});

test("la stat principale respecte le type d'armure ; une arme peut sortir dans les trois stats", () => {
  for (let i = 0; i < 100; i++) {
    const item = generateItem({ level: 3, rarity: 'commun' });
    if (item.armorType === 'lourde') assert.equal(item.primary, 'force');
    if (item.armorType === 'legere') assert.equal(item.primary, 'intelligence');
  }
  const primaries = [0.1, 0.5, 0.9].map((r) => {
    setRandomSource(() => r);
    return generateItem({ level: 3, rarity: 'commun', slotType: 'arme', weaponType: 'epee' }).primary;
  });
  assert.deepEqual(primaries.sort(), ['agilite', 'force', 'intelligence']);
  for (const w of Object.values(WEAPON_TYPES)) assert.deepEqual([...w.primaries].sort(), ['agilite', 'force', 'intelligence'], w.name);
});

test("vitesse d'attaque : des armes les plus lentes aux plus rapides, les lentes frappent plus fort", () => {
  const order = ['masse2m', 'hache2m', 'epee2m', 'baton', 'arc', 'masse', 'hache', 'epee', 'dague'];
  assert.deepEqual(Object.keys(WEAPON_TYPES), order);
  for (let i = 1; i < order.length; i++) {
    assert.ok(WEAPON_TYPES[order[i]].speed > WEAPON_TYPES[order[i - 1]].speed, order[i]);
    assert.ok(WEAPON_TYPES[order[i]].atqMult < WEAPON_TYPES[order[i - 1]].atqMult, order[i]);
  }
  assert.deepEqual(Object.keys(WEAPON_TYPES).filter((k) => WEAPON_TYPES[k].range === 'ranged'), ['arc']);
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
  assert.equal(Object.keys(item.bonus).length, 4);
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
