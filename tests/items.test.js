import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { generateItem, rollRarity, itemStats, itemStatLines } from '../src/game/items.js';
import { RARITIES, SECONDARY_STATS, LEGENDARIES, WEAPON_TYPES, ARMOR_PIECES, SLOTS } from '../src/data/items.js';

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

test('stat obligatoire : attaque pour une arme, Armure pour une armure, aucune pour un bijou', () => {
  assert.ok(generateItem({ slotType: 'arme', weaponType: 'hache', rarity: 'commun' }).stats.atq > 0);
  const boots = generateItem({ slotType: 'bottes', armorType: 'lourde', rarity: 'commun' });
  assert.ok(boots.stats.armure > 0);
  assert.deepEqual(boots.mandatory, ['armure']);
  const shield = generateItem({ slotType: 'bouclier', rarity: 'commun' });
  assert.deepEqual(shield.mandatory, ['armure', 'blocage']);
  assert.ok(shield.stats.armure > 0 && shield.stats.blocage > 0);
  const ring = generateItem({ slotType: 'anneau', rarity: 'commun', primary: 'agilite' });
  assert.deepEqual(ring.mandatory, []);
  assert.deepEqual(Object.keys(ring.stats), ['agilite'], 'bijou commun : uniquement la stat principale');
  const chest = generateItem({ slotType: 'plastron', armorType: 'moyenne', rarity: 'commun', primary: 'agilite' });
  const sword2h = generateItem({ slotType: 'arme', weaponType: 'epee2m', rarity: 'commun', primary: 'agilite' });
  assert.ok(ring.stats.agilite > chest.stats.agilite && ring.stats.agilite > sword2h.stats.agilite, 'stat principale plus forte sur un bijou');
  const rareRing = generateItem({ slotType: 'collier', rarity: 'rare' });
  assert.equal(Object.keys(rareRing.bonus).length, 2, 'secondaires selon la rareté');
});

test('un objet commun ne porte que ses stats obligatoire et principale', () => {
  const item = generateItem({ slotType: 'plastron', armorType: 'moyenne', primary: 'agilite', rarity: 'commun' });
  assert.deepEqual(Object.keys(item.stats).sort(), ['agilite', 'armure']);
  const sword = generateItem({ slotType: 'arme', weaponType: 'epee', primary: 'agilite', rarity: 'commun' });
  assert.deepEqual(Object.keys(sword.stats).sort(), ['agilite', 'atq'], 'pas de vitesse sur une épée commune');
  // Toutes les bases possibles : obligatoire(s) + principale, rien d'autre.
  for (let i = 0; i < 300; i++) {
    const it = generateItem({ level: 1 + (i % 20), rarity: 'commun' });
    // bouclier : Défense + Blocage + principale ; bijou : principale seule
    const expected = it.slotType === 'bouclier' ? 3 : ['anneau', 'collier'].includes(it.slotType) ? 1 : 2;
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

test('armes, armures et bijoux peuvent sortir en Force, Agilité ou Intelligence', () => {
  const primariesOf = (base) => [0.1, 0.5, 0.9].map((r) => {
    setRandomSource(() => r);
    return generateItem({ level: 3, rarity: 'commun', ...base }).primary;
  }).sort();
  const all = ['agilite', 'force', 'intelligence'];
  for (const weaponType of Object.keys(WEAPON_TYPES)) assert.deepEqual(primariesOf({ slotType: 'arme', weaponType }), all, weaponType);
  for (const armorType of ['lourde', 'moyenne', 'legere']) assert.deepEqual(primariesOf({ slotType: 'casque', armorType }), all, armorType);
  for (const slotType of ['anneau', 'collier']) assert.deepEqual(primariesOf({ slotType }), all, slotType);
});

test('pièces d\'armure : casque, épaulières, plastron, gants, bottes (plus de ceinture)', () => {
  assert.deepEqual(Object.keys(ARMOR_PIECES), ['casque', 'epaulieres', 'plastron', 'gants', 'bottes']);
  assert.ok(!('ceinture' in SLOTS));
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

test("l'Armure compte à la fois comme Défense et comme Défense magique ; Défense et Défense magique restent des secondaires", () => {
  const [guerrier] = createParty();
  guerrier.equipment = {};
  const naked = getStats(guerrier);
  const helm = generateItem({ slotType: 'casque', armorType: 'lourde', rarity: 'commun', primary: 'force', level: 10 });
  guerrier.equipment.casque = helm;
  const worn = getStats(guerrier);
  assert.equal(worn.def - naked.def, helm.stats.armure);
  assert.equal(worn.defMag - naked.defMag, helm.stats.armure);
  helm.bonus = { defMag: 5 };
  assert.equal(getStats(guerrier).defMag - naked.defMag, helm.stats.armure + 5);
  assert.ok('def' in SECONDARY_STATS && 'defMag' in SECONDARY_STATS);
});

test("esquive et blocage : même chance de sortir en secondaire, mais l'esquive vaut moins", () => {
  const seen = { esquive: 0, blocage: 0 };
  let n = 0;
  setRandomSource(() => ((n++ * 0.6180339) % 1));
  for (let i = 0; i < 600; i++) {
    const it = generateItem({ level: 20, rarity: 'rare', slotType: 'casque', armorType: 'moyenne', primary: 'force' });
    for (const k of Object.keys(seen)) if (it.bonus[k]) seen[k]++;
  }
  assert.ok(Math.abs(seen.esquive - seen.blocage) < 60, JSON.stringify(seen));
  const { esquive, blocage } = SECONDARY_STATS;
  for (const level of [1, 10, 30, 50]) {
    assert.ok(esquive.base + esquive.perLevel * level < blocage.base + blocage.perLevel * level, `niveau ${level}`);
  }
});

test('chaque stat secondaire indique sa fourchette possible (niveau, rareté, amélioration)', () => {
  const item = generateItem({ level: 20, rarity: 'epique', slotType: 'casque', armorType: 'lourde', primary: 'force' });
  const lines = itemStatLines(item).filter((l) => l.secondary);
  assert.equal(lines.length, 3);
  for (const l of lines) {
    assert.ok(l.range.lo <= l.value && l.value <= l.range.hi, `${l.stat} ${l.value} ∉ [${l.range.lo}, ${l.range.hi}]`);
  }
  const before = lines[0].range.hi;
  item.plus = 5;
  const boosted = itemStatLines(item).filter((l) => l.secondary)[0];
  assert.ok(boosted.range.hi >= before && boosted.range.lo <= boosted.value && boosted.value <= boosted.range.hi);
  assert.ok(itemStatLines(item).filter((l) => !l.secondary).every((l) => !l.range), 'pas de fourchette sur les stats fixes');
});
