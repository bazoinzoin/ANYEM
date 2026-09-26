import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VILLAGE, VILLAGE_SERVICES } from '../src/data/village.js';
import { villageGrid, canWalk, villageStep, talkTarget, spotsNextTo, npcAt } from '../src/game/village.js';

// Cases atteignables depuis l'arrivée.
function reachable() {
  const seen = new Set([`${VILLAGE.spawn.x},${VILLAGE.spawn.y}`]);
  const queue = [VILLAGE.spawn];
  while (queue.length) {
    const p = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (canWalk(q.x, q.y) && !seen.has(`${q.x},${q.y}`)) { seen.add(`${q.x},${q.y}`); queue.push(q); }
    }
  }
  return seen;
}

test('village : chaque habitant est accessible depuis l\'arrivée, et chaque service a un habitant', () => {
  assert.ok(canWalk(VILLAGE.spawn.x, VILLAGE.spawn.y));
  const seen = reachable();
  for (const npc of VILLAGE.npcs) {
    assert.ok(VILLAGE_SERVICES[npc.service], npc.id);
    assert.ok(spotsNextTo(npc).some((p) => seen.has(`${p.x},${p.y}`)), `${npc.name} inaccessible`);
    assert.equal(villageGrid().tiles[npc.y * VILLAGE.w + npc.x], 1, `${npc.name} sur une case bloquée`);
  }
  for (const s of Object.keys(VILLAGE_SERVICES)) assert.ok(VILLAGE.npcs.some((n) => n.service === s), s);
  assert.ok(VILLAGE.gateExit.some((p) => seen.has(`${p.x},${p.y}`)), 'porte accessible');
});

test('village : on ne traverse ni les bâtiments ni les habitants ; parler à un voisin', () => {
  const inn = VILLAGE.buildings.find((b) => b.id === 'inn');
  assert.equal(canWalk(inn.x + 2, inn.bottom), false, "le mur de l'auberge bloque");
  const guard = VILLAGE.npcs.find((n) => n.service === 'portals');
  const next = spotsNextTo(guard)[0];
  const r = villageStep(next, guard.x - next.x, guard.y - next.y);
  assert.equal(r.moved, false);
  assert.equal(r.npc, guard);
  assert.equal(talkTarget(next), guard);
  assert.equal(talkTarget(VILLAGE.spawn, { dx: 0, dy: -1 }), npcAt(VILLAGE.spawn.x, VILLAGE.spawn.y - 1));
});

test('village : passer sous la porte ouvre les portails', () => {
  const exit = VILLAGE.gateExit[1];
  const r = villageStep({ x: exit.x, y: exit.y - 1 }, 0, 1);
  assert.equal(r.moved, true);
  assert.equal(r.exit, true);
});
