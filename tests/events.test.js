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
  event = rollEvent(5, 'marchand');
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

test('les événements de la carte sont connus dès la génération et ont une apparence', async () => {
  const { buildFloorMap } = await import('../src/game/dungeon.js');
  const { TOPS, HAIR_STYLES } = await import('../src/data/appearance.js');
  let n = 0;
  setRandomSource(() => ((n = (n * 16807 + 11) % 2147483647) / 2147483647));
  for (let i = 0; i < 20; i++) {
    for (const e of buildFloorMap('foretMaudite', 2).events) assert.ok(EVENTS[e.key], `événement ${e.key}`);
  }
  for (const [key, e] of Object.entries(EVENTS)) {
    assert.ok(e.look?.hero || e.look?.object, `${key} : apparence sur la carte`);
    if (e.look.hero) assert.ok(TOPS[e.look.hero.top] && HAIR_STYLES[e.look.hero.hair], key);
  }
  // Marcher dessus déclenche l'événement annoncé.
  const game = inDungeon();
  const map = game.expedition.map;
  const { x, y } = map.party;
  const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => map.tiles[(y + dy) * map.w + x + dx]);
  map.mobs = [];
  map.events = [{ id: 'e1', key: 'cadavre', x: x + spot[0], y: y + spot[1] }];
  assert.equal(stepParty(game, ...spot).event.key, 'cadavre');
});

test('Dépouille d\'aventurier : la maladie affaiblit un héros (effet qui reste)', () => {
  const game = withEvent(inDungeon(), 'cadavre');
  setRandomSource(() => 0.99); // dernière issue : la maladie
  const r = chooseEvent(game, 0);
  assert.ok(r.ok);
  assert.ok(game.party.some((h) => h.statuses.some((s) => s.key === 'affaibli')));
});

test('chaque événement (hors marchand) est un dilemme : au moins deux choix ; bénédictions et malédictions viennent du catalogue', async () => {
  const { EFFECTS } = await import('../src/data/effects.js');
  for (const [key, e] of Object.entries(EVENTS)) {
    if (e.kind === 'merchant') continue;
    assert.ok(e.choices.length >= 2, `${key} : un seul choix`);
    for (const c of e.choices) {
      for (const o of c.outcomes) {
        for (const b of o.effects.blessAll ?? []) assert.ok(EFFECTS[b.id]?.kind === 'buff' && !EFFECTS[b.id].value, `${key} : bénédiction ${b.id}`);
        for (const curse of [o.effects.curseAll, o.effects.curseRandom].filter(Boolean)) assert.equal(EFFECTS[curse.id]?.kind, 'debuff', `${key} : ${curse.id}`);
      }
    }
  }
});

test('coûts en PV, en matéria et en objet du sac ; bénédiction posée au prochain combat ; XP et purification', () => {
  const game = withEvent(inDungeon(), 'autel');
  game.party.forEach((h) => { h.hp = getStats(h).pv; });
  // Offrir son sang : chaque héros perd 20 % de ses PV max, une matéria rare.
  assert.ok(chooseEvent(game, 1).ok);
  game.party.forEach((h) => assert.equal(h.hp, getStats(h).pv - Math.round(getStats(h).pv * 0.2)));
  assert.equal(Object.values(game.materia).reduce((s, m) => s + m.rare, 0), 1);

  // Forgeron : 3 matéria peu communes, sinon impossible.
  withEvent(game, 'forgeron');
  assert.match(cannotChooseReason(game, 0), /matéria/);
  game.materia.arme.peuCommun = 2;
  game.materia.armure.peuCommun = 1;
  assert.ok(chooseEvent(game, 0).ok);
  assert.equal(game.materia.arme.peuCommun + game.materia.armure.peuCommun, 0);
  assert.equal(game.bag.length, 1, 'une pièce forgée');

  // Gouffre : un objet du sac au hasard.
  withEvent(game, 'gouffre');
  game.bag = [];
  assert.match(cannotChooseReason(game, 0), /sac/);

  // Sépulture : Protection posée au début du prochain combat, puis consommée.
  withEvent(game, 'cadavre');
  assert.ok(chooseEvent(game, 1).ok);
  const cb = createCombat({ party: game.party, enemies: ['gobelin'], level: 1 });
  assert.ok(game.party.every((h) => h.statuses.some((s) => s.key === 'protection')));
  assert.ok(game.party.every((h) => !h.pendingEffects.length));
  assert.ok(cb);

  // Grimoire : de l'XP, mais toute l'équipe est confuse ; le brûler purifie.
  withEvent(game, 'grimoire');
  const xp = game.party.map((h) => h.xp + h.level * 1e6);
  assert.ok(chooseEvent(game, 0).ok);
  game.party.forEach((h, i) => assert.ok(h.xp + h.level * 1e6 > xp[i]));
  assert.ok(game.party.every((h) => h.statuses.some((s) => s.key === 'confus')));
  withEvent(game, 'grimoire');
  assert.ok(chooseEvent(game, 1).ok);
  assert.ok(game.party.every((h) => !h.statuses.some((s) => s.kind === 'debuff')));
});
