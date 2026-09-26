import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { startExpedition, stepParty, canExplore } from '../src/game/dungeon.js';
import { createCombat } from '../src/game/combat.js';
import {
  rollEvent, chooseEvent, skipEvent, cannotChooseReason, choiceCost, buyEventItem, buyEventConsumable, eventItemPrice,
} from '../src/game/events.js';
import { EVENTS } from '../src/data/events.js';
import { RARITY_ORDER } from '../src/data/items.js';
import { emptyMateria } from '../src/game/forge.js';
import { MERCHANT } from '../src/config.js';

beforeEach(() => setRandomSource(() => 0.5));

const inDungeon = () => {
  const game = { party: createParty(), reserve: [], bag: [], gold: 500, dungeonLvl: 1, dungeons: {}, expedition: null, consumables: { potion: 2 }, materia: emptyMateria() };
  startExpedition(game, 'foretMaudite', 1);
  return game;
};
const withEvent = (game, key, extra = {}) => { game.expedition.event = { key, level: 5, ...extra }; return game; };

test('chaque événement du catalogue est bien formé (chances à 100 %)', () => {
  for (const [key, e] of Object.entries(EVENTS)) {
    assert.ok(e.name && e.text && e.weight > 0, key);
    if (e.kind === 'merchant') continue;
    for (const c of e.choices) assert.equal(c.outcomes.reduce((s, o) => s + o.chance, 0), 100, `${key} : ${c.label}`);
  }
});

test("un événement posé sur la carte se déclenche quand on marche dessus et bloque l'exploration", () => {
  const game = inDungeon();
  const map = game.expedition.map;
  map.mobs = []; // rien ne vient gêner
  // Place un événement juste à droite du groupe (sur du sol).
  const { x, y } = map.party;
  map.tiles[y * map.w + x + 1] = 1;
  map.events = [{ id: 'e1', x: x + 1, y }];
  const r = stepParty(game, 1, 0);
  assert.ok(r.moved && r.event);
  assert.equal(map.events.length, 0, "l'événement est consommé");
  assert.equal(canExplore(game), false);
  assert.equal(stepParty(game, -1, 0).moved, false);
  assert.ok(skipEvent(game));
  assert.equal(canExplore(game), true);
});

test('la sorcière : 50 % objet au moins peu commun, 50 % deux héros blessés (jamais tués)', () => {
  const game = withEvent(inDungeon(), 'sorciere');
  setRandomSource(() => 0.2); // première issue
  let r = chooseEvent(game, 0);
  assert.ok(r.ok);
  assert.equal(r.loot.length, 1);
  assert.ok(RARITY_ORDER.indexOf(r.loot[0].rarity) >= RARITY_ORDER.indexOf('peuCommun'));
  assert.equal(game.expedition.event, null);

  withEvent(game, 'sorciere');
  game.party.forEach((h) => { h.hp = 5; });
  setRandomSource(() => 0.7); // seconde issue
  r = chooseEvent(game, 0);
  assert.equal(game.party.filter((h) => h.hp === 1).length, 2, 'deux héros touchés, à 1 PV minimum');
  assert.ok(game.party.every((h) => h.alive));
});

test("un choix payant n'est possible que si l'on peut payer ; le coût est prélevé", () => {
  const game = withEvent(inDungeon(), 'joueur');
  const cost = choiceCost(EVENTS.joueur.choices[0], 5).gold;
  game.gold = cost - 1;
  assert.match(cannotChooseReason(game, 0), /or/);
  assert.equal(chooseEvent(game, 0).ok, false);
  game.gold = cost;
  setRandomSource(() => 0.9); // perte de la mise
  assert.ok(chooseEvent(game, 0).ok);
  assert.equal(game.gold, 0);

  withEvent(game, 'voyageur');
  game.consumables.potion = 0;
  assert.ok(cannotChooseReason(game, 0));
  game.consumables.potion = 1;
  const rare = game.materia.arme.rare + game.materia.armure.rare + game.materia.bijou.rare;
  assert.ok(chooseEvent(game, 0).ok);
  assert.equal(game.consumables.potion, 0);
  assert.equal(game.materia.arme.rare + game.materia.armure.rare + game.materia.bijou.rare, rare + 1);
});

test('source : soin des héros en vie', () => {
  const game = withEvent(inDungeon(), 'source');
  game.party.forEach((h) => { h.hp = 1; });
  setRandomSource(() => 0.1);
  chooseEvent(game, 0);
  game.party.forEach((h) => assert.equal(h.hp, 1 + Math.round(getStats(h).pv * 0.5)));
});

test('marchand ambulant : meilleures raretés, moins cher qu\'au village', () => {
  const game = inDungeon();
  setRandomSource(() => 0.99);
  let event;
  do { event = rollEvent(5); } while (event.key !== 'marchand');
  game.expedition.event = event;
  assert.ok(event.stock.every((it) => it.rarity !== 'commun'));
  const item = event.stock[0];
  assert.ok(eventItemPrice(item) < (item.level * 2 + 5) * 16 * MERCHANT.buyMarkup);
  const gold = game.gold = 100000;
  assert.ok(buyEventItem(game, item.id));
  assert.ok(game.bag.includes(item));
  assert.equal(game.gold, gold - eventItemPrice(item));
  const offer = event.consumables[0];
  assert.ok(offer.price < 1000);
  assert.ok(buyEventConsumable(game, 0));
  assert.ok(skipEvent(game));
});
