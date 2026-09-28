import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { setRandomSource } from '../src/game/rng.js';
import { createParty, getStats } from '../src/game/party.js';
import { generateItem } from '../src/game/items.js';
import { sellPrice, buyPrice, sell, ensureStock, buyItem, buyConsumable, canBuyConsumable, consumablePrice } from '../src/game/merchant.js';
import { startingConsumables } from '../src/game/consumables.js';
import { addStatus } from '../src/game/statuses.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseItem, targetsFor } from '../src/game/combat.js';
import { MERCHANT } from '../src/config.js';
import { CONSUMABLES } from '../src/data/consumables.js';

beforeEach(() => setRandomSource(() => 0.5));

const newGame = () => ({ party: createParty(), bag: [], gold: 1000, dungeonLvl: 3, consumables: startingConsumables(), shop: null });

test('le prix de revente monte avec le niveau, la rareté et l\'amélioration', () => {
  const base = { slotType: 'casque', armorType: 'lourde', primary: 'force' };
  const c1 = generateItem({ ...base, level: 1, rarity: 'commun' });
  const c10 = generateItem({ ...base, level: 10, rarity: 'commun' });
  const r10 = generateItem({ ...base, level: 10, rarity: 'rare' });
  assert.equal(sellPrice(c1), MERCHANT.sellBase + MERCHANT.sellPerLevel);
  assert.ok(sellPrice(c10) > sellPrice(c1));
  assert.equal(sellPrice(r10), sellPrice(c10) * 4);
  const plus = { ...r10, plus: 5 };
  assert.equal(sellPrice(plus), Math.round(sellPrice(r10) * 2));
  assert.equal(buyPrice(c1), sellPrice(c1) * MERCHANT.buyMarkup);
});

test('vendre : uniquement un objet du sac, contre de l\'or', () => {
  const game = newGame();
  const item = generateItem({ level: 3 });
  game.bag.push(item);
  assert.ok(sell(game, item));
  assert.equal(game.gold, 1000 + sellPrice(item));
  assert.deepEqual(game.bag, []);
  assert.equal(sell(game, game.party[0].equipment.mainDroite), false, 'un objet porté ne se vend pas');
});

test('le stock d\'équipement est au niveau du donjon et se renouvelle quand il change', () => {
  const game = newGame();
  const stock = ensureStock(game);
  assert.equal(stock.length, MERCHANT.stockSize);
  stock.forEach((i) => {
    assert.equal(i.level, 3);
    assert.ok(['commun', 'peuCommun', 'rare'].includes(i.rarity));
  });
  assert.equal(ensureStock(game), stock, 'même niveau : même stock');
  game.dungeonLvl = 4;
  assert.notEqual(ensureStock(game), stock);
});

test('acheter un objet : payé au prix d\'achat, rangé dans le sac, retiré du stock', () => {
  const game = newGame();
  const [item] = ensureStock(game);
  assert.ok(buyItem(game, item));
  assert.equal(game.gold, 1000 - buyPrice(item));
  assert.deepEqual(game.bag, [item]);
  assert.equal(game.shop.stock.includes(item), false);
  game.gold = 0;
  assert.equal(buyItem(game, game.shop.stock[0]), false, 'pas assez d\'or');
});

test('acheter des consommables : prix, et limite de stock transporté', () => {
  const game = newGame();
  assert.equal(game.consumables.potion, 2, 'on part avec 2 potions');
  assert.ok(buyConsumable(game, 'potion'));
  assert.equal(game.consumables.potion, 3);
  assert.equal(game.gold, 1000 - consumablePrice(game, 'potion'));
  game.consumables.potion = MERCHANT.maxConsumable;
  assert.equal(canBuyConsumable(game, 'potion'), false);
  game.gold = 0;
  assert.equal(buyConsumable(game, 'elixir'), false);
});

function combatAtHero(game, heroIndex) {
  const cb = createCombat({ enemies: ['gobelin', 'gobelin'], level: 1, party: game.party, consumables: game.consumables });
  for (let i = 0; i < 50; i++) {
    const turn = nextTurn(cb);
    if (turn.unit === game.party[heroIndex]) return cb;
    if (turn.side === 'hero') { heroAct(cb, { type: 'defend' }); if (cb.acting) heroAct(cb, { type: 'endTurn' }); }
    else enemyAct(cb);
  }
  throw new Error('héros jamais actif');
}

test('combat : une potion soigne un allié et est retirée de l\'inventaire', () => {
  const game = newGame();
  const cb = combatAtHero(game, 1);
  const mage = game.party[3];
  mage.hp = 10;
  assert.ok(heroAct(cb, { type: 'item', item: 'potion', target: 3 }));
  assert.equal(mage.hp, 10 + Math.round(getStats(mage).pv * 0.3));
  assert.equal(game.consumables.potion, 1);
});

test('combat : la plume de phénix ne vise que les alliés tombés', () => {
  const game = newGame();
  game.consumables.plumeDePhenix = 1;
  const cb = combatAtHero(game, 1);
  assert.equal(canUseItem(cb, 'plumeDePhenix'), false, 'personne à relever');
  const [g] = game.party;
  g.alive = false;
  g.hp = 0;
  assert.deepEqual(targetsFor(cb, { type: 'item', item: 'plumeDePhenix' }).units, [g]);
  assert.equal(heroAct(cb, { type: 'item', item: 'plumeDePhenix', target: 2 }), false, 'allié vivant refusé');
  assert.ok(heroAct(cb, { type: 'item', item: 'plumeDePhenix', target: 0 }));
  assert.equal(g.alive, true);
  assert.equal(g.hp, Math.round(getStats(g).pv * 0.3));
  assert.equal(game.consumables.plumeDePhenix, 0);
});

test('combat : le remède retire les effets négatifs ; pas d\'objet = action refusée', () => {
  const game = newGame();
  game.consumables.remede = 1;
  const cb = combatAtHero(game, 1);
  const [g] = game.party;
  addStatus(g, { key: 'poison', name: 'Poison', kind: 'debuff', turns: 3, dot: 5 });
  addStatus(g, { key: 'beni', name: 'Béni', kind: 'buff', turns: 3, mods: { physPower: 20 } });
  assert.ok(heroAct(cb, { type: 'item', item: 'remede', target: 0 }));
  assert.deepEqual(g.statuses.map((s) => s.key), ['beni']);
  const cb2 = combatAtHero(newGame(), 1);
  assert.equal(heroAct(cb2, { type: 'item', item: 'elixir', target: 0 }), false);
});

test('les consommables coûtent plus cher que leur prix de base, et plus encore à haut niveau', () => {
  const game = newGame();
  const low = consumablePrice(game, 'potion');
  assert.ok(low > CONSUMABLES.potion.price);
  game.party.forEach((h) => { h.level = 30; });
  assert.ok(consumablePrice(game, 'potion') > low);
});
