import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encodeGraph, decodeGraph, makeSave, applySave, SAVED_FIELDS } from '../src/game/save.js';
import { setupDebugGame } from '../src/game/debug.js';
import { startExpedition, floorCombat } from '../src/game/dungeon.js';
import { createCombat, nextTurn } from '../src/game/combat.js';
import { generateItem } from '../src/game/items.js';

const freshState = () => ({ screen: 'hub', party: [], reserve: [], bag: [], gold: 0, dungeons: {}, expedition: null, combat: null });

test('le graphe garde les objets partagés et les cycles', () => {
  const hero = { name: 'A', stats: [1, 2] };
  const root = { party: [hero], combat: { party: null, queue: [{ unit: hero }] }, n: Infinity, u: [undefined, 1] };
  root.combat.party = root.party;
  root.self = root;
  const back = decodeGraph(JSON.parse(JSON.stringify(encodeGraph(root))));
  assert.equal(back.combat.party, back.party);
  assert.equal(back.combat.queue[0].unit, back.party[0]);
  assert.equal(back.self, back);
  assert.equal(back.n, Infinity);
  assert.deepEqual(back.u, [undefined, 1]);
  assert.deepEqual(back.party[0].stats, [1, 2]);
});

test('sauvegarder en plein combat puis recharger : même partie, liens du combat intacts', () => {
  const game = freshState();
  setupDebugGame(game);
  startExpedition(game, 'foretMaudite', 1);
  game.expedition.engaged = game.expedition.map.mobs[0].id;
  game.combat = createCombat({ ...floorCombat(game), party: game.party, consumables: game.consumables });
  nextTurn(game.combat);
  game.screen = 'combat';
  const save = JSON.parse(JSON.stringify(makeSave(game, 123)));
  assert.equal(save.savedAt, 123);
  assert.equal(save.summary.party.length, 4);
  assert.match(save.summary.where, /Forêt Maudite, étage 1 \(en combat\)/);

  const loaded = freshState();
  assert.ok(applySave(loaded, save));
  for (const k of SAVED_FIELDS) assert.deepEqual(JSON.parse(JSON.stringify(loaded[k] ?? null)), JSON.parse(JSON.stringify(game[k] ?? null)), k);
  assert.equal(loaded.combat.party, loaded.party, 'le combat agit sur les héros de l\'équipe');
  assert.equal(loaded.combat.consumables, loaded.consumables);
  assert.ok(loaded.combat.queue.every((t) => loaded.party.includes(t.unit) || loaded.combat.enemies.includes(t.unit)));
});

test('après un chargement, un nouvel objet ne reprend pas un identifiant existant', () => {
  const game = freshState();
  setupDebugGame(game);
  const ids = new Set(game.bag.map((i) => i.id));
  const loaded = freshState();
  applySave(loaded, JSON.parse(JSON.stringify(makeSave(game))));
  assert.ok(!ids.has(generateItem({ level: 1 }).id));
});

test('une sauvegarde illisible ou d\'une autre version est refusée', () => {
  const game = freshState();
  assert.equal(applySave(game, null), false);
  assert.equal(applySave(game, { version: 99, data: {} }), false);
  assert.equal(applySave(game, { version: 1, data: { root: { $r: 0 }, nodes: [{ o: { party: 3 } }] } }), false);
  assert.equal(game.screen, 'hub', 'la partie en cours reste intacte');
});
