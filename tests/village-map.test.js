import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VILLAGE, VILLAGE_SERVICES } from '../src/data/village.js';
import { INTERIORS } from '../src/data/interiors.js';
import {
  sceneOf, canWalk, villageStep, talkTarget, spotsNextTo, npcAt, rollResidents, doorstep, entryOf, npcsIn,
} from '../src/game/village.js';
import { setRandomSource } from '../src/game/rng.js';

// Cases atteignables depuis `start` dans une scène.
function reachable(scene, start) {
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (canWalk(q.x, q.y, scene) && !seen.has(`${q.x},${q.y}`)) { seen.add(`${q.x},${q.y}`); queue.push(q); }
    }
  }
  return seen;
}
const has = (seen, p) => seen.has(`${p.x},${p.y}`);
const everyoneOut = Object.fromEntries(VILLAGE.npcs.map((n) => [n.id, 'out']));
const everyoneHome = Object.fromEntries(VILLAGE.npcs.map((n) => [n.id, 'home']));

test('village : une maison par habitant, avec porte, panneau et intérieur', () => {
  for (const npc of VILLAGE.npcs) {
    const house = VILLAGE.buildings.find((b) => b.id === npc.home);
    assert.ok(house, `${npc.name} : maison`);
    assert.ok(INTERIORS[house.id], `${house.id} : intérieur`);
    assert.ok(VILLAGE.signs.some((s) => s.house === house.id), `${house.id} : panneau`);
    assert.ok(house.decor.length, `${house.id} : porte dessinée`);
  }
  for (const s of Object.keys(VILLAGE_SERVICES)) assert.ok(VILLAGE.npcs.some((n) => n.service === s), s);
});

test('village : chaque porte, chaque habitant (dehors) et la porte du village sont accessibles', () => {
  const scene = sceneOf('village', everyoneOut);
  assert.ok(canWalk(VILLAGE.spawn.x, VILLAGE.spawn.y, scene));
  const seen = reachable(scene, VILLAGE.spawn);
  for (const b of VILLAGE.buildings) assert.ok(has(seen, doorstep(b.id)), `devant la porte de ${b.id}`);
  for (const npc of scene.npcs) {
    assert.ok(npc.service ? VILLAGE_SERVICES[npc.service] : npc.line, npc.id);
    assert.ok(spotsNextTo(npc, scene).some((p) => has(seen, p)), `${npc.name} inaccessible`);
    assert.equal(scene.grid.tiles[npc.y * VILLAGE.w + npc.x], 1, `${npc.name} sur une case bloquée`);
  }
  assert.ok(VILLAGE.gateExit.some((p) => has(seen, { x: p.x, y: p.y - 1 })), 'porte du village accessible');
});

test('intérieurs : chaque habitant (chez lui) est accessible depuis la porte', () => {
  for (const [id, room] of Object.entries(INTERIORS)) {
    const scene = sceneOf(id, everyoneHome);
    const entry = entryOf(id);
    assert.ok(canWalk(entry.x, entry.y, scene), `${id} : entrée libre`);
    const seen = reachable(scene, entry);
    assert.ok(has(seen, { x: room.exit, y: room.h - 1 }), `${id} : sortie`);
    for (const npc of scene.npcs) {
      assert.equal(scene.grid.tiles[npc.y * room.w + npc.x], 1, `${npc.id} sur une case bloquée dans ${id}`);
      assert.ok(spotsNextTo(npc, scene).some((p) => has(seen, p)), `${npc.id} inaccessible dans ${id}`);
    }
    assert.equal(scene.npcs.length, VILLAGE.npcs.filter((n) => n.home === id).length, `${id} : habitants`);
  }
});

test('village : entrer dans une maison par sa porte, en ressortir devant', () => {
  const scene = sceneOf('village', everyoneOut);
  const step = doorstep('forge');
  const r = villageStep(step, 0, -1, scene);
  assert.equal(r.enter, 'forge');
  assert.equal(r.moved, false);
  const inside = sceneOf('forge', everyoneOut);
  const entry = entryOf('forge');
  const out = villageStep(entry, 0, 1, inside);
  assert.ok(out.moved && out.leave, 'marcher sur la porte fait sortir');
});

test('habitants : chez eux ou devant leur porte, tiré à chaque retour ; jamais aux deux endroits', () => {
  setRandomSource(() => 0.2);
  const home = rollResidents();
  assert.ok(Object.values(home).every((v) => v === 'home'));
  setRandomSource(() => 0.8);
  const out = rollResidents();
  assert.ok(Object.values(out).every((v) => v === 'out'));
  setRandomSource(Math.random);
  assert.equal(npcsIn('village', home).length, 0);
  assert.equal(npcsIn('inn', home).length, 1);
  assert.equal(npcsIn('inn', out).length, 0);
  assert.equal(npcsIn('village', out).length, VILLAGE.npcs.length);
});

test('village : on ne traverse ni les bâtiments ni les habitants ; parler à un voisin ; la porte du village ouvre les portails', () => {
  const scene = sceneOf('village', everyoneOut);
  const inn = VILLAGE.buildings.find((b) => b.id === 'inn');
  assert.equal(canWalk(inn.x + 6, inn.bottom, scene), false, "le mur de l'auberge bloque");
  const guard = scene.npcs.find((n) => n.service === 'portals');
  const next = spotsNextTo(guard, scene)[0];
  const r = villageStep(next, guard.x - next.x, guard.y - next.y, scene);
  assert.equal(r.moved, false);
  assert.equal(r.npc, guard);
  assert.equal(talkTarget(next, null, scene), guard);
  assert.equal(npcAt(guard.x, guard.y, scene), guard);
  const exit = VILLAGE.gateExit[0];
  const g = villageStep({ x: exit.x, y: exit.y - 1 }, 0, 1, scene);
  assert.equal(g.moved, true);
  assert.equal(g.exit, true);
});
