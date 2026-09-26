import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { addStatus } from '../src/game/statuses.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseItem, targetsFor } from '../src/game/combat.js';
import { useOnMap, isValidTarget } from '../src/game/consumables.js';
import { startExpedition } from '../src/game/dungeon.js';
import { CONSUMABLES, DEBUFF_KEYS } from '../src/data/consumables.js';
import { EFFECTS } from '../src/data/effects.js';
import { ENEMIES } from '../src/data/enemies.js';
import { TALENTS } from '../src/data/talents.js';
import { CLASSES } from '../src/data/classes.js';

beforeEach(() => setRandomSource(() => 0.5));

const poison = { key: 'poison', name: 'Poison', kind: 'debuff', turns: 3, dot: 5 };
const bleed = { key: 'saignement', name: 'Saignement', kind: 'debuff', turns: 3, dot: 5 };

// Tous les effets appliqués par les compétences (classes, talents, ennemis).
function effectEntries() {
  const entries = [];
  const visit = (skill, where) => {
    if (!skill) return;
    for (const e of [...(skill.effects ?? []), ...(skill.selfEffects ?? []), ...(skill.addEffects ?? []), ...(skill.addSelfEffects ?? [])]) entries.push({ ...e, where });
    for (const old of ['dot', 'hot', 'shield', 'status', 'selfStatus', 'set']) {
      assert.equal(skill[old], undefined, `${where} définit encore un effet à la main (${old}) : utiliser le catalogue`);
    }
  };
  Object.values(CLASSES).forEach((c) => c.starterSkills.forEach((s) => visit(s, s.name)));
  Object.values(TALENTS).flat().forEach((b) => b.nodes.forEach((n) => { visit(n.skill, n.id); [].concat(n.skillMod ?? []).forEach((m) => visit(m, n.id)); }));
  Object.values(ENEMIES).forEach((e) => (e.abilities ?? []).forEach((a) => visit(a.skill, `${e.name} : ${a.skill.name}`)));
  return entries;
}

function debuffKeysInData() {
  return new Set(effectEntries().filter((e) => EFFECTS[e.id]?.kind === 'debuff').map((e) => e.id));
}

test('chaque effet vient du catalogue, et les effets à valeur précisent leur puissance', () => {
  for (const e of effectEntries()) {
    assert.ok(EFFECTS[e.id], `${e.where} : effet inconnu « ${e.id} »`);
    assert.ok(e.turns >= 1, `${e.where} : durée manquante`);
    if (EFFECTS[e.id].value) assert.ok(e.power > 0, `${e.where} : puissance manquante pour ${e.id}`);
  }
});

test('chaque effet négatif du jeu a un remède dédié, et le Remède universel les guérit tous', () => {
  for (const key of debuffKeysInData()) assert.ok(DEBUFF_KEYS.includes(key), `effet négatif non répertorié : ${key}`);
  for (const key of DEBUFF_KEYS) {
    const cures = Object.values(CONSUMABLES).filter((c) => c.effect.cure?.includes(key));
    assert.ok(cures.length >= 1, `aucun remède dédié pour ${key}`);
    cures.forEach((c) => assert.ok(c.price < CONSUMABLES.remede.price, `${c.name} doit coûter moins que le Remède universel`));
  }
  assert.equal(CONSUMABLES.remede.effect.cleanse, true);
});

test('un remède ne vise que les héros qui ont l\'effet qu\'il guérit, et ne retire que celui-là', () => {
  const [g] = createParty();
  assert.equal(isValidTarget('antidote', g), false);
  addStatus(g, poison);
  addStatus(g, bleed);
  assert.equal(isValidTarget('antidote', g), true);
  assert.equal(isValidTarget('onguent', g), false);
  const cb = createCombat({ party: [g], enemies: ['gobelin'], level: 1, consumables: { antidote: 1, remede: 1 } });
  nextTurn(cb);
  while (cb.acting.side !== 'hero') { enemyAct(cb); nextTurn(cb); }
  addStatus(g, poison);
  addStatus(g, bleed);
  assert.deepEqual(targetsFor(cb, { type: 'item', item: 'antidote' }).units, [g]);
  assert.ok(heroAct(cb, { type: 'item', item: 'antidote', target: 0 }));
  assert.deepEqual(g.statuses.map((s) => s.key), ['saignement']);
  assert.ok(cb.log.some((l) => /Poison retiré/.test(l.text)));
});

test('le Remède universel retire tous les effets négatifs', () => {
  const party = createParty();
  const cb = createCombat({ party, enemies: ['gobelin'], level: 1, consumables: { remede: 1 } });
  let t = nextTurn(cb);
  while (t.side !== 'hero') { enemyAct(cb); t = nextTurn(cb); }
  const [g] = party;
  addStatus(g, poison);
  addStatus(g, bleed);
  addStatus(g, { key: 'beni', name: 'Béni', kind: 'buff', turns: 3 });
  assert.ok(heroAct(cb, { type: 'item', item: 'remede', target: 0 }));
  assert.deepEqual(g.statuses.map((s) => s.key), ['beni']);
});

test("un héros confus peut frapper un allié à la place de son tour", () => {
  const party = createParty();
  const cb = createCombat({ party, enemies: ['gobelin'], level: 1 });
  party.forEach((h) => addStatus(h, { key: 'confus', name: 'Confus', kind: 'debuff', turns: 2, confuse: true }));
  setRandomSource(() => 0.1); // < 0,5 : le héros confus frappe un allié
  const before = party.map((h) => h.hp);
  const turn = nextTurn(cb);
  assert.equal(turn.side, 'enemy', 'les héros confus ont tous perdu leur tour');
  assert.ok(party.some((h, i) => h.hp < before[i]));
  assert.ok(cb.log.some((l) => /confus, frappe/.test(l.text)));
});

test("Corde d'évasion en combat : l'équipe s'échappe, le combat se termine", () => {
  const party = createParty();
  const cb = createCombat({ party, enemies: ['gobelin'], level: 1, consumables: { corde: 1 } });
  let t = nextTurn(cb);
  while (t.side !== 'hero') { enemyAct(cb); t = nextTurn(cb); }
  assert.equal(canUseItem(cb, 'corde'), true);
  assert.equal(targetsFor(cb, { type: 'item', item: 'corde' }), null, 'pas de cible à choisir');
  assert.ok(heroAct(cb, { type: 'item', item: 'corde' }));
  assert.equal(cb.result, 'escape');
  assert.equal(nextTurn(cb), null);
  assert.equal(cb.consumables.corde, 0);
});

test('la Tente ne s\'utilise pas en combat', () => {
  const cb = createCombat({ party: createParty(), enemies: ['gobelin'], level: 1, consumables: { tente: 1 } });
  assert.equal(canUseItem(cb, 'tente'), false);
});

function inDungeon(consumables) {
  const game = { party: createParty(), bag: [], gold: 0, dungeonLvl: 1, dungeons: {}, expedition: null, consumables };
  startExpedition(game, 'foretMaudite', 1);
  return game;
}

test('entre deux étages : la Tente rend 30 % aux héros en vie, une seule fois par palier', () => {
  const game = inDungeon({ tente: 3 });
  const [g, v] = game.party;
  g.hp = 5;
  g.res = 0;
  v.alive = false;
  v.hp = 0;
  const r = useOnMap(game, 'tente');
  assert.ok(r.ok);
  assert.equal(g.hp, 5 + Math.round(getStats(g).pv * 0.3));
  assert.equal(g.res, Math.round(getStats(g).resMax * 0.3));
  assert.equal(v.alive, false);
  assert.equal(game.consumables.tente, 2);
  assert.equal(useOnMap(game, 'tente').ok, false, 'déjà utilisée dans ce palier');
  assert.equal(game.consumables.tente, 2);
  game.expedition.floor = 6; // palier suivant (étages 6 à 10)
  assert.ok(useOnMap(game, 'tente').ok);
});

test("entre deux étages : la Corde termine l'expédition ; potions, plume et remèdes utilisables", () => {
  const game = inDungeon({ corde: 1, potion: 1, plumeDePhenix: 1, antidote: 1 });
  const [g, v] = game.party;
  g.hp = 10;
  assert.ok(useOnMap(game, 'potion', 0).ok);
  assert.ok(g.hp > 10);
  v.alive = false;
  assert.equal(useOnMap(game, 'plumeDePhenix', 0).ok, false, 'Guerrier est en vie');
  assert.ok(useOnMap(game, 'plumeDePhenix', 1).ok);
  assert.equal(v.alive, true);
  assert.equal(useOnMap(game, 'antidote', 0).ok, false, "pas d'empoisonnement à soigner");
  addStatus(g, poison);
  assert.ok(useOnMap(game, 'antidote', 0).ok);
  assert.deepEqual(g.statuses, []);
  const r = useOnMap(game, 'corde');
  assert.ok(r.ok && r.escaped);
  assert.equal(game.expedition, null);
  assert.equal(useOnMap(game, 'potion', 0).ok, false, "hors d'un donjon");
});
