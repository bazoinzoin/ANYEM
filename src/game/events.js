// Événements d'expédition (données : data/events.js).
//
// Les événements sont posés sur la carte de l'étage (DUNGEON.mapEventChances) et se
// déclenchent quand le groupe marche dessus (stepParty, game/dungeon.js) :
// game.expedition.event = { key, level, stock?, consumables? }. Tant qu'il n'est
// pas réglé (un choix, ou « passer son chemin »), le groupe ne peut plus bouger.

import { EVENT_RULES, LOOT, MERCHANT } from '../config.js';
import { EVENTS } from '../data/events.js';
import { EFFECTS } from '../data/effects.js';
import { addStatus, makeStatus } from './statuses.js';
import { CONSUMABLES } from '../data/consumables.js';
import { RARITY_ORDER, MATERIA_KINDS, RARITIES } from '../data/items.js';
import { generateItem, weightedPick } from './items.js';
import { sellPrice } from './merchant.js';
import { addConsumable, countOf, restoreParty } from './consumables.js';
import { CONSUMABLE_DROP_WEIGHTS } from './loot.js';
import { getStats, gainXp, xpToNext } from './party.js';
import { random, pick } from './rng.js';

const scaled = (v, level) => Math.round((v.base ?? 0) + (v.perLevel ?? 0) * level);

// Tire le type d'un événement (selon les poids).
export function rollEventKey() {
  return weightedPick(Object.fromEntries(Object.entries(EVENTS).map(([k, e]) => [k, e.weight])));
}

// Événement d'une rencontre de niveau `level` : celui annoncé sur la carte (`key`), ou tiré
// au hasard (stock tiré pour un marchand).
export function rollEvent(level, key = rollEventKey()) {
  const event = { key, level };
  if (EVENTS[key].kind === 'merchant') {
    event.stock = Array.from({ length: EVENT_RULES.merchantItems }, () =>
      generateItem({ level, rarity: weightedPick(EVENT_RULES.merchantRarityWeights) }));
    event.consumables = Array.from({ length: EVENT_RULES.merchantConsumables }, () => {
      const k = weightedPick(CONSUMABLE_DROP_WEIGHTS);
      return { key: k, price: Math.max(1, Math.round(CONSUMABLES[k].price * EVENT_RULES.merchantConsumablePct / 100)) };
    });
  }
  return event;
}

// Après une victoire : peut-être un événement.

export function currentEvent(game) {
  return game.expedition?.event ?? null;
}

// Coût d'un choix : { gold, consumable, hpPct, materia, bagItem } (or à l'échelle du niveau).
export function choiceCost(choice, level) {
  return {
    gold: choice.cost?.gold ? scaled(choice.cost.gold, level) : 0,
    consumable: choice.cost?.consumable ?? null,
    hpPct: choice.cost?.hpPct ?? 0,
    materia: choice.cost?.materia ?? null,
    bagItem: !!choice.cost?.bagItem,
  };
}

// Matéria d'une rareté, toutes sortes confondues.
function materiaCount(game, rarity) {
  return Object.values(game.materia ?? {}).reduce((sum, byRarity) => sum + (byRarity[rarity] ?? 0), 0);
}

// Raison pour laquelle le choix est impossible (coût non payable), ou null.
export function cannotChooseReason(game, index) {
  const event = currentEvent(game);
  const choice = event && EVENTS[event.key].choices?.[index];
  if (!choice) return 'Choix inconnu';
  const cost = choiceCost(choice, event.level);
  if (game.gold < cost.gold) return `Il faut ${cost.gold} pièces d'or.`;
  if (cost.consumable && countOf(game.consumables, cost.consumable) < 1) return `Il faut : ${CONSUMABLES[cost.consumable].name}.`;
  if (cost.materia && materiaCount(game, cost.materia.rarity) < cost.materia.amount) return `Il faut ${cost.materia.amount} matéria ${RARITIES[cost.materia.rarity].label.toLowerCase()}.`;
  if (cost.bagItem && !(game.bag ?? []).length) return 'Il faut un objet dans le sac.';
  return null;
}

// Rareté tirée comme un butin normal, mais au moins `minRarity`.
function rarityAtLeast(minRarity) {
  const min = RARITY_ORDER.indexOf(minRarity);
  return weightedPick(Object.fromEntries(Object.entries(LOOT.rarityWeights).filter(([r]) => RARITY_ORDER.indexOf(r) >= min)));
}

function hurt(hero, pct) {
  const amount = Math.round(getStats(hero).pv * pct / 100);
  const before = hero.hp;
  hero.hp = Math.max(1, hero.hp - amount); // un événement ne tue jamais
  return before - hero.hp;
}

// Applique les effets d'une issue ; retourne { parts: [texte], loot: [objets] }.
function applyEffects(game, effects, level) {
  const parts = [];
  const loot = [];
  const gains = game.expedition?.gains;
  if (effects.gold) {
    const gold = scaled(effects.gold, level);
    game.gold += gold;
    if (gains) gains.gold += gold;
    parts.push(`+${gold} or`);
  }
  if (effects.item) {
    const item = generateItem({ level, rarity: rarityAtLeast(effects.item.minRarity) });
    game.bag.push(item);
    loot.push(item);
    if (gains) gains.items++;
  }
  if (effects.materia) {
    const kind = pick(Object.keys(MATERIA_KINDS));
    game.materia[kind][effects.materia.rarity] += effects.materia.amount;
    if (gains) gains.materia += effects.materia.amount;
    parts.push(`${effects.materia.amount} × ${MATERIA_KINDS[kind].label}`);
  }
  if (effects.consumable) {
    const key = effects.consumable === 'random' ? weightedPick(CONSUMABLE_DROP_WEIGHTS) : effects.consumable;
    parts.push(addConsumable(game.consumables, key) ? `${CONSUMABLES[key].icon} ${CONSUMABLES[key].name}` : `${CONSUMABLES[key].name} laissé faute de place`);
  }
  if (effects.restoreAll) {
    restoreParty(game.party, effects.restoreAll);
    parts.push(`+${effects.restoreAll} % de PV et de ressource`);
  }
  const alive = game.party.filter((h) => h.alive);
  if (effects.hurtRandom) {
    const pool = [...alive];
    for (let i = 0; i < effects.hurtRandom.count && pool.length; i++) {
      const hero = pool.splice(Math.floor(random() * pool.length), 1)[0];
      parts.push(`${hero.name} −${hurt(hero, effects.hurtRandom.pct)} PV`);
    }
  }
  if (effects.curseRandom && alive.length) {
    const hero = pick(alive);
    addStatus(hero, makeStatus(effects.curseRandom.id, effects.curseRandom.turns));
    parts.push(`${hero.name} : ${EFFECTS[effects.curseRandom.id].name}`);
  }
  if (effects.hurtAll) {
    for (const hero of alive) parts.push(`${hero.name} −${hurt(hero, effects.hurtAll)} PV`);
  }
  if (effects.consumables) {
    for (let i = 0; i < effects.consumables; i++) {
      const key = weightedPick(CONSUMABLE_DROP_WEIGHTS);
      if (addConsumable(game.consumables, key)) parts.push(CONSUMABLES[key].name);
    }
  }
  if (effects.cleanseAll) {
    for (const hero of alive) hero.statuses = (hero.statuses ?? []).filter((s) => s.kind !== 'debuff');
    parts.push('effets négatifs retirés');
  }
  if (effects.curseAll) {
    for (const hero of alive) addStatus(hero, makeStatus(effects.curseAll.id, effects.curseAll.turns));
    parts.push(`${EFFECTS[effects.curseAll.id].name} sur toute l'équipe`);
  }
  if (effects.blessAll) {
    // Bénédiction : effets positifs posés au début du prochain combat (voir createCombat).
    for (const hero of alive) hero.pendingEffects = [...(hero.pendingEffects ?? []), ...effects.blessAll];
    parts.push(`${effects.blessAll.map((e) => EFFECTS[e.id].name).join(' et ')} au prochain combat`);
  }
  if (effects.xpPct) {
    const ups = [];
    for (const hero of alive) {
      if (gainXp(hero, Math.round(xpToNext(hero.level) * effects.xpPct / 100))) ups.push(hero.name);
    }
    parts.push(`+${effects.xpPct} % d'un niveau d'XP${ups.length ? ` (${ups.join(', ')} monte${ups.length > 1 ? 'nt' : ''} de niveau)` : ''}`);
  }
  return { parts, loot };
}

/**
 * Fait le choix `index` de l'événement en cours : paie son coût, tire une issue
 * et l'applique. Retourne { ok, message, loot }.
 */
export function chooseEvent(game, index) {
  const event = currentEvent(game);
  if (!event || cannotChooseReason(game, index)) return { ok: false, message: '', loot: [] };
  const choice = EVENTS[event.key].choices[index];
  const cost = choiceCost(choice, event.level);
  game.gold -= cost.gold;
  if (cost.consumable) game.consumables[cost.consumable]--;
  const paid = payExtraCosts(game, cost);
  let roll = random() * 100;
  const outcome = choice.outcomes.find((o) => (roll -= o.chance) < 0) ?? choice.outcomes[choice.outcomes.length - 1];
  const { parts, loot } = applyEffects(game, outcome.effects, event.level);
  game.expedition.event = null;
  const detail = [...paid, ...parts].length ? ` (${[...paid, ...parts].join(', ')})` : '';
  return { ok: true, message: `${EVENTS[event.key].name} : ${outcome.text}${detail}`, loot };
}

// Coûts autres que l'or et les consommables : PV de toute l'équipe (jamais mortels), matéria
// (prises dans les sortes les mieux fournies), un objet du sac au hasard. Retourne les textes.
function payExtraCosts(game, cost) {
  const parts = [];
  if (cost.hpPct) {
    for (const hero of game.party.filter((h) => h.alive)) hurt(hero, cost.hpPct);
    parts.push(`−${cost.hpPct} % de PV à l'équipe`);
  }
  if (cost.materia) {
    let left = cost.materia.amount;
    const kinds = Object.keys(game.materia).sort((a, b) => game.materia[b][cost.materia.rarity] - game.materia[a][cost.materia.rarity]);
    for (const kind of kinds) {
      const take = Math.min(left, game.materia[kind][cost.materia.rarity]);
      game.materia[kind][cost.materia.rarity] -= take;
      left -= take;
    }
    parts.push(`−${cost.materia.amount} matéria ${RARITIES[cost.materia.rarity].label.toLowerCase()}`);
  }
  if (cost.bagItem) {
    const [item] = game.bag.splice(Math.floor(random() * game.bag.length), 1);
    parts.push(`${item.name} perdu`);
  }
  return parts;
}

// « Passer son chemin » (ou quitter le marchand ambulant).
export function skipEvent(game) {
  if (!currentEvent(game)) return false;
  game.expedition.event = null;
  return true;
}

// Marchand ambulant : prix d'un objet (moins cher qu'au village).
export function eventItemPrice(item) {
  return sellPrice(item) * EVENT_RULES.merchantPriceMult;
}

export function buyEventItem(game, itemId) {
  const event = currentEvent(game);
  const i = event?.stock?.findIndex((it) => it.id === itemId) ?? -1;
  if (i < 0 || game.gold < eventItemPrice(event.stock[i])) return false;
  const [item] = event.stock.splice(i, 1);
  game.gold -= eventItemPrice(item);
  game.bag.push(item);
  return true;
}

export function buyEventConsumable(game, index) {
  const offer = currentEvent(game)?.consumables?.[index];
  if (!offer || game.gold < offer.price || countOf(game.consumables, offer.key) >= MERCHANT.maxConsumable) return false;
  currentEvent(game).consumables.splice(index, 1);
  game.gold -= offer.price;
  addConsumable(game.consumables, offer.key);
  return true;
}
