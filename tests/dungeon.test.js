import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty } from '../src/game/party.js';
import { createCombat, enemyAct } from '../src/game/combat.js';
import {
  progressOf, isUnlocked, floorLevel, isBossFloor, encounterFor, startFloors,
  startExpedition, floorCombat, loseExpedition, leaveExpedition,
  continueExpedition, canExplore, stepParty, takeLadder, engagedMob,
} from '../src/game/dungeon.js';
import { winNextFight, clearFloor } from './helpers.js';
import { DUNGEONS, DUNGEON_ORDER } from '../src/data/dungeons.js';
import { ENEMIES } from '../src/data/enemies.js';
import { createEnemies } from '../src/game/enemies.js';
import { getStats } from '../src/game/party.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 100, dungeonLvl: 1, dungeons: {}, expedition: null });

test("carte d'un étage ordinaire : 2 ou 3 groupes de monstres, une échelle ; étage du boss : le boss garde la fin", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const map = game.expedition.map;
  assert.ok(map.mobs.length >= 2 && map.mobs.length <= 3);
  assert.ok(map.mobs.every((m) => !m.boss));
  assert.ok(map.ladder);
  const r = winNextFight(game);
  assert.equal(r.boss, false);
  assert.equal(game.expedition.floor, 1, "vaincre un groupe ne fait pas changer d'étage");
  assert.equal(game.expedition.map.mobs.length, map.mobs.length);
  for (let f = 1; f <= 4; f++) clearFloor(game);
  assert.equal(game.expedition.floor, 5);
  const bossMap = game.expedition.map;
  assert.equal(bossMap.ladder, null);
  assert.equal(bossMap.mobs.filter((m) => m.boss).length, 1);
  assert.deepEqual(bossMap.mobs.find((m) => m.boss).enemies, ['chefGobelin']);
  game.expedition.engaged = bossMap.mobs.find((m) => m.boss).id;
  assert.match(floorCombat(game).title, /BOSS/);
});

test('données : chaque donjon a un boss par palier, et des ennemis existants', () => {
  for (const d of Object.values(DUNGEONS)) {
    assert.equal(d.bosses.length, d.floors / d.bossEvery);
    for (const k of [...d.pool, ...d.bosses]) assert.ok(ENEMIES[k], k);
    d.bosses.forEach((k) => assert.ok(ENEMIES[k].boss, `${k} doit être un boss`));
    d.pool.forEach((k) => assert.ok(!ENEMIES[k].boss, `${k} ne doit pas être un boss`));
  }
  for (const [k, e] of Object.entries(ENEMIES)) {
    for (const { chance, skill } of e.abilities ?? []) {
      assert.ok(chance > 0 && chance < 1, k);
      assert.ok(['hero', 'allHeroes', 'self', 'allAllies'].includes(skill.target), `${k} : ${skill.name}`);
    }
  }
});

test('niveaux : de minLevel au premier étage à maxLevel au dernier', () => {
  const d = DUNGEONS.foretMaudite;
  assert.equal(floorLevel('foretMaudite', 1), d.minLevel);
  assert.equal(floorLevel('foretMaudite', d.floors), d.maxLevel);
  for (let f = 2; f <= d.floors; f++) assert.ok(floorLevel('foretMaudite', f) >= floorLevel('foretMaudite', f - 1));
});

test('un boss tous les 5 étages, dans l\'ordre, avec des acolytes selon le palier', () => {
  assert.equal(isBossFloor('foretMaudite', 5), true);
  assert.equal(isBossFloor('foretMaudite', 6), false);
  assert.deepEqual(encounterFor('foretMaudite', 5).enemies, ['chefGobelin']);
  const e10 = encounterFor('foretMaudite', 10);
  assert.equal(e10.enemies[0], 'ogre');
  assert.equal(e10.enemies.length, 2);
  assert.equal(encounterFor('foretMaudite', 15).enemies[0], 'wendigo');
  assert.equal(encounterFor('foretMaudite', 15).final, true);
  assert.equal(encounterFor('foretMaudite', 10).final, false);
  assert.equal(encounterFor('foretMaudite', 3).enemies.length, 2);
  assert.equal(encounterFor('foretMaudite', 13).enemies.length, 3);
});

test('seul le premier donjon est ouvert ; le terminer ouvre le suivant', () => {
  const game = newGame();
  assert.equal(isUnlocked(game, DUNGEON_ORDER[0]), true);
  assert.equal(isUnlocked(game, 'catacombes'), false);
  assert.equal(startExpedition(game, 'catacombes'), false);
  progressOf(game, 'foretMaudite').cleared = true;
  assert.equal(isUnlocked(game, 'catacombes'), true);
});

test('expédition : on ne peut partir qu\'au départ ou juste après un boss', () => {
  const game = newGame();
  assert.ok(startExpedition(game, 'foretMaudite'));
  assert.equal(game.expedition.canLeave, true);
  for (let f = 1; f <= 4; f++) {
    clearFloor(game);
    assert.equal(game.expedition.canLeave, false, `après l'étage ${f}`);
    assert.equal(leaveExpedition(game), false);
  }
  const r5 = clearFloor(game);
  assert.equal(r5.boss, true);
  assert.equal(game.expedition.floor, 6);
  assert.equal(game.expedition.canLeave, true);
  assert.equal(progressOf(game, 'foretMaudite').checkpoint, 5);
  assert.ok(leaveExpedition(game));
  assert.equal(game.expedition, null);
});

test('points de départ : l\'étage qui suit chaque boss vaincu', () => {
  const game = newGame();
  assert.deepEqual(startFloors(game, 'foretMaudite'), [1]);
  progressOf(game, 'foretMaudite').checkpoint = 10;
  assert.deepEqual(startFloors(game, 'foretMaudite'), [1, 6, 11]);
  assert.equal(startExpedition(game, 'foretMaudite', 16), false);
  assert.ok(startExpedition(game, 'foretMaudite', 11));
  assert.equal(game.expedition.floor, 11);
});

test('défaite : fin de l\'expédition, progression conservée au dernier boss', () => {
  const game = newGame();
  progressOf(game, 'foretMaudite').checkpoint = 5;
  startExpedition(game, 'foretMaudite', 6);
  clearFloor(game);
  clearFloor(game);
  loseExpedition(game);
  assert.equal(game.expedition, null);
  assert.equal(progressOf(game, 'foretMaudite').checkpoint, 5);
  assert.equal(game.gold < 100 + 1000, true);
});

test('dernier étage : donjon terminé, expédition finie, donjon suivant annoncé', () => {
  const game = newGame();
  progressOf(game, 'foretMaudite').checkpoint = 10;
  startExpedition(game, 'foretMaudite', 11);
  let r;
  for (let f = 11; f <= 15; f++) r = clearFloor(game);
  assert.equal(r.cleared, true);
  assert.equal(r.unlocked, 'catacombes');
  assert.equal(game.expedition, null);
  assert.equal(progressOf(game, 'foretMaudite').cleared, true);
  assert.equal(game.dungeonLvl, DUNGEONS.foretMaudite.maxLevel);
});

test('capacités ennemies : une abomination peut empoisonner toute l\'équipe', () => {
  setRandomSource(() => 0.1); // sous la chance de la première capacité
  const party = createParty();
  const cb = createCombat({ party, enemies: ['abomination'], level: 15 });
  const boss = cb.enemies[0];
  cb.acting = { side: 'enemy', unit: boss };
  const hp = party.map((h) => h.hp);
  enemyAct(cb);
  party.forEach((h, i) => {
    assert.ok(h.hp < hp[i], h.name);
    assert.ok(h.statuses.some((s) => s.key === 'poison'), h.name);
  });
  assert.match(cb.log[0].text, /Vomi putride/);
});

test('capacités ennemies : les acolytes d\'un boss sont renforcés par son cri', () => {
  setRandomSource(() => 0.1);
  const cb = createCombat({ party: createParty(), enemies: ['chefGobelin', 'gobelin'], level: 5 });
  cb.acting = { side: 'enemy', unit: cb.enemies[0] };
  enemyAct(cb);
  cb.enemies.forEach((e) => assert.ok(e.statuses.some((s) => s.key === 'puissance'), e.name));
  assert.deepEqual(createEnemies(['loup', 'loup', 'gobelin'], 1).map((e) => e.name), ['Loup 1', 'Loup 2', 'Gobelin']);
});

test("après un boss : choix obligatoire entre rentrer et continuer ; continuer régénère à 40 %", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  for (let f = 1; f <= 4; f++) clearFloor(game);
  const [g, v, p] = game.party;
  g.hp = 10;
  g.res = 0;
  v.alive = false;
  v.hp = 0;
  const missingBefore = getStats(g).pv - g.hp;
  const hpBefore = p.hp;
  clearFloor(game); // boss de l'étage 5
  // Une montée de niveau ajoute les PV gagnés, mais les PV manquants ne changent pas.
  assert.equal(getStats(g).pv - g.hp, missingBefore, 'la victoire contre le boss ne soigne pas');
  const hpAfterBoss = g.hp;
  const pAfterBoss = p.hp;
  assert.equal(game.expedition.bossChoice, true);
  assert.equal(canExplore(game), false, "il faut d'abord choisir");
  assert.ok(continueExpedition(game));
  const s = getStats(g);
  assert.equal(g.hp, hpAfterBoss + Math.round(s.pv * 0.4));
  assert.equal(g.res, Math.round(s.resMax * 0.4));
  assert.equal(p.hp, Math.min(getStats(p).pv, pAfterBoss + Math.round(getStats(p).pv * 0.4)));
  assert.ok(hpBefore <= pAfterBoss);
  assert.equal(v.alive, false, 'les héros tombés ne sont pas relevés');
  assert.equal(game.expedition.canLeave, false, 'après avoir choisi de continuer, impossible de rentrer');
  assert.equal(leaveExpedition(game), false);
  assert.equal(canExplore(game), true);
  assert.equal(continueExpedition(game), false, 'une seule régénération par boss');
});

test("entre deux étages ordinaires : ni soin, ni choix", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const [g] = game.party;
  g.hp = 10;
  clearFloor(game);
  assert.equal(g.hp, 10);
  assert.equal(game.expedition.bossChoice, false);
  assert.equal(continueExpedition(game), false);
});

test('zones : 3 sous-zones de 5 étages par zone, niveaux 1 à 50 sans trou', () => {
  let expected = 1;
  for (const key of DUNGEON_ORDER) {
    const d = DUNGEONS[key];
    assert.equal(d.subzones.length, 3, key);
    assert.equal(d.floors, 15, key);
    for (const sub of d.subzones) {
      assert.equal(sub.minLevel, expected, `${key} · ${sub.name}`);
      assert.ok(sub.maxLevel > sub.minLevel);
      expected = sub.maxLevel + 1;
      for (const k of [...sub.pool, ...(sub.elites ?? [])]) assert.ok(ENEMIES[k] && !ENEMIES[k].boss, k);
      assert.ok(ENEMIES[sub.boss].boss, sub.boss);
    }
  }
  assert.equal(expected - 1, 50, 'la dernière zone finit au niveau 50');
  assert.deepEqual(DUNGEONS.foretMaudite.subzones.map((s) => [s.minLevel, s.maxLevel]), [[1, 3], [4, 6], [7, 10]]);
});

test("niveau des étages : de min à max dans chaque sous-zone, boss au niveau max", () => {
  const levels = Array.from({ length: 15 }, (_, i) => floorLevel('foretMaudite', i + 1));
  assert.deepEqual(levels, [1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 8, 9, 9, 10]);
  assert.equal(floorLevel('abimeInfernal', 15), 50);
  const game = newGame();
  progressOf(game, 'foretMaudite').checkpoint = 5;
  startExpedition(game, 'foretMaudite', 6);
  clearFloor(game);
  game.expedition.engaged = game.expedition.map.mobs[0].id;
  assert.match(floorCombat(game).title, /Sous-bois — étage 2\/5/);
});

test('élites : ennemis renforcés, seulement là où la sous-zone en prévoit', () => {
  setRandomSource(() => 0.01); // sous la chance d'élite
  assert.ok(encounterFor('foretMaudite', 12).enemies.every((k) => ENEMIES[k].elite));
  assert.ok(encounterFor('foretMaudite', 2).enemies.every((k) => !ENEMIES[k].elite), 'pas d\'élite dans la première sous-zone');
  setRandomSource(() => 0.5);
  assert.ok(encounterFor('foretMaudite', 12).enemies.every((k) => !ENEMIES[k].elite));
});

test("butin : le niveau des objets est celui des ennemis vaincus", () => {
  const game = newGame();
  progressOf(game, 'foretMaudite').checkpoint = 10;
  startExpedition(game, 'foretMaudite', 11);
  setRandomSource(() => 0.01);
  const r = winNextFight(game);
  assert.ok(r.loot.length > 0);
  r.loot.forEach((item) => assert.equal(item.level, floorLevel('foretMaudite', 11)));
});

test("déplacement : un pas par case de sol, les murs bloquent, le brouillard se lève", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const map = game.expedition.map;
  map.mobs = [];
  const { x, y } = map.party;
  assert.equal(stepParty(game, 1, 1).moved, false, 'pas de diagonale');
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => map.tiles[(y + dy) * map.w + x + dx] === 1);
  const [dx, dy] = dirs[0];
  const seenBefore = map.seen.reduce((a, b) => a + b, 0);
  assert.ok(stepParty(game, dx, dy).moved);
  assert.deepEqual(map.party, { x: x + dx, y: y + dy });
  assert.ok(map.seen.reduce((a, b) => a + b, 0) >= seenBefore);
  assert.ok(map.seen[map.party.y * map.w + map.party.x]);
  // Un mur bloque.
  map.tiles[map.party.y * map.w + map.party.x + 1] = 0;
  assert.equal(stepParty(game, 1, 0).moved, false);
});

test("monstres : marcher sur un groupe l'engage ; un groupe qui voit l'équipe la poursuit", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const map = game.expedition.map;
  const { x, y } = map.party;
  // Couloir horizontal dégagé autour du groupe.
  for (let i = x - 3; i <= x + 6; i++) map.tiles[y * map.w + i] = 1;
  const mob = map.mobs[0];
  map.mobs = [mob];
  Object.assign(mob, { x: x + 1, y });
  const r = stepParty(game, 1, 0);
  assert.equal(r.moved, false);
  assert.equal(r.encounter, mob);
  assert.equal(engagedMob(game), mob);
  assert.equal(canExplore(game), false, 'combat en cours');

  game.expedition.engaged = null;
  Object.assign(mob, { x: x + 4, y, chasing: false });
  stepParty(game, -1, 0); // le groupe s'éloigne d'un pas ; le monstre (à 5 cases) le voit et avance
  assert.equal(mob.chasing, true);
  assert.equal(mob.x, x + 3);
  // En revenant vers lui, le combat se déclenche (le groupe marche dessus ou le monstre l'atteint).
  let caught = null;
  for (let n = 0; n < 6 && !caught; n++) caught = stepParty(game, 1, 0).encounter;
  assert.equal(caught, mob);
});

test("échelle : il faut être dessus ; on peut descendre sans combattre", () => {
  const game = newGame();
  startExpedition(game, 'foretMaudite');
  const exp = game.expedition;
  assert.equal(takeLadder(game), false);
  exp.map.party = { ...exp.map.ladder };
  const mobs = exp.map.mobs.length;
  assert.ok(mobs > 0);
  assert.ok(takeLadder(game));
  assert.equal(exp.floor, 2);
  assert.equal(exp.canLeave, false);
});

test("génération : tout le sol est relié, monstres et événements hors de la salle de départ", () => {
  for (let i = 0; i < 30; i++) {
    setRandomSource(() => i / 30);
    const game = newGame();
    progressOf(game, 'foretMaudite').checkpoint = 10;
    startExpedition(game, 'foretMaudite', 11);
    const map = game.expedition.map;
    const start = map.party;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length) {
      const p = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (map.tiles[q.y * map.w + q.x] === 1 && !seen.has(`${q.x},${q.y}`)) { seen.add(`${q.x},${q.y}`); queue.push(q); }
      }
    }
    const floors = map.tiles.filter((t) => t === 1).length;
    assert.equal(seen.size, floors, 'un seul bloc de sol');
    assert.ok(map.rooms.length >= 4);
    for (const m of [...map.mobs, ...map.events]) assert.notDeepEqual({ x: m.x, y: m.y }, start);
    assert.ok(seen.has(`${map.ladder.x},${map.ladder.y}`));
  }
});
