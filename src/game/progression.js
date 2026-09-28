// Conséquences d'un combat et services du village sur l'état global du jeu.
// Chaque fonction modifie `game` et retourne ce qu'il faut afficher au village :
// { message, loot? }.

import { REWARDS, XP, EFFICIENCY, INN } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { getStats, restoreFully, gainXp, playerLevel } from './party.js';
import { rollLoot } from './loot.js';
import { difficultyOf, lootRules } from './difficulty.js';
import { emptyMateria } from './forge.js';
import { addConsumable } from './consumables.js';
import { CONSUMABLES } from '../data/consumables.js';
import { RARITIES, MATERIA_KINDS, SLOT_ORDER } from '../data/items.js';
import { random } from './rng.js';

const mult = (enemy, field) => ENEMIES[enemy.enemyKey]?.[field] ?? 1;

// XP d'une victoire (pour chaque héros) : par ennemi, (base + par niveau) × multiplicateur (boss).
export function xpReward(level, enemies) {
  return enemies.reduce((sum, e) => sum + Math.round((XP.xpBase + XP.xpPerLevel * level) * mult(e, 'xpMult')), 0);
}

// Valeur apportée par un héros pendant le combat (hero.fight, suivi par game/combat.js).
export function fightValue(fight) {
  if (!fight) return 0;
  return Object.entries(EFFICIENCY.weights).reduce((sum, [k, w]) => sum + (fight[k] ?? 0) * w, 0);
}

/**
 * Coefficient d'efficacité de chaque héros de l'équipe (même ordre), entre EFFICIENCY.min et
 * max : participation (tours joués) et valeur apportée, rapportées au meilleur de l'équipe.
 * Sans suivi de combat (hero.fight absent) : 1.
 */
export function combatEfficiency(party) {
  const fights = party.map((h) => h.fight ?? null);
  if (fights.every((f) => !f)) return party.map(() => 1);
  const bestTurns = Math.max(1, ...fights.map((f) => f?.turns ?? 0));
  const bestValue = Math.max(1, ...fights.map(fightValue));
  const { min, max, turnsShare } = EFFICIENCY;
  return fights.map((f) => {
    const score = turnsShare * ((f?.turns ?? 0) / bestTurns) + (1 - turnsShare) * (fightValue(f) / bestValue);
    return +(min + (max - min) * score).toFixed(2);
  });
}

export function goldReward(level, enemies) {
  const best = Math.max(1, ...enemies.map((e) => mult(e, 'goldMult')));
  return Math.round((REWARDS.goldBase + REWARDS.goldPerLevel * level) * best);
}

// « 2 × Matéria d'arme rare, 1 × Matéria d'armure commun »
function materiaText(materia) {
  return materia.map((m) => `${m.amount} × ${MATERIA_KINDS[m.kind].label} ${RARITIES[m.rarity].label.toLowerCase()}`).join(', ');
}

// Niveau du butin : celui de la zone, sans dépasser le niveau du joueur (le héros le plus
// haut de l'équipe). Zone au-dessus du joueur : butin à son niveau ; zone en dessous :
// butin au niveau de la zone.
export function lootLevel(game, zoneLevel) {
  return Math.min(zoneLevel, playerLevel(game));
}

/**
 * Victoire contre `enemies` (unités du combat) au niveau `level` : or, butin
 * (équipement dans le sac, matéria, consommables — voir loot.js),
 * XP pour chaque héros (tombés compris) multipliée par son coefficient d'efficacité au combat
 * (`efficiency`, même ordre que l'équipe ; 1 par défaut). Aucun soin : PV et ressources
 * restent tels qu'à la fin du combat.
 * Un consommable trouvé alors qu'on en porte déjà le maximum est perdu.
 * Retourne { message, loot (équipements), materia, consumables, gold, xp, levelUps, xpByHero }.
 */
export function applyVictory(game, { level, enemies, final = false, efficiency = null }) {
  const gold = goldReward(level, enemies);
  const xp = xpReward(level, enemies);
  const { items: loot, materia, consumables: found } = rollLoot(lootLevel(game, level), enemies, { final, difficulty: difficultyOf(game) });
  const xpByHero = game.party.map((hero, i) => ({ hero, coef: efficiency?.[i] ?? 1, xp: Math.round(xp * (efficiency?.[i] ?? 1)) }));
  const levelUps = xpByHero.filter(({ hero, xp: gained }) => gainXp(hero, gained) > 0).map(({ hero }) => hero);
  game.gold += gold;
  game.bag.push(...loot);
  game.materia ??= emptyMateria();
  for (const m of materia) game.materia[m.kind][m.rarity] += m.amount;
  game.consumables ??= {};
  const consumables = found.filter((key) => addConsumable(game.consumables, key));
  const full = found.length - consumables.length;
  game.dungeonLvl = Math.max(game.dungeonLvl, level);
  const parts = [];
  if (loot.length) parts.push(`${loot.length} équipement${loot.length > 1 ? 's' : ''} (dans le sac)`);
  if (materia.length) parts.push(materiaText(materia));
  if (consumables.length) parts.push(consumables.map((k) => `${CONSUMABLES[k].icon} ${CONSUMABLES[k].name}`).join(', '));
  if (full) parts.push(`${full} consommable${full > 1 ? 's' : ''} laissé${full > 1 ? 's' : ''} faute de place`);
  const lootText = parts.length ? ` Butin : ${parts.join(' · ')}.` : ' Aucun butin.';
  const levelText = levelUps.length
    ? ` Niveau supérieur : ${levelUps.map((h) => `${h.name} (niv. ${h.level})`).join(', ')} — de nouveaux points de talent sont disponibles !`
    : '';
  const varies = xpByHero.some((e) => e.coef !== 1);
  const xpText = varies
    ? `XP selon l'efficacité : ${xpByHero.map((e) => `${e.hero.name} ${e.xp} (×${String(e.coef).replace('.', ',')})`).join(', ')}`
    : `${xp} XP`;
  return { message: `Victoire ! ${gold} pièces d'or ; ${xpText}.${lootText}${levelText}`, loot, materia, consumables, gold, xp, levelUps, xpByHero };
}

// Tire au hasard des éléments de `list` (chance `chance` chacun), sans jamais tous les
// prendre : au plus `max`.
function pickLosses(list, chance, max) {
  const lost = list.filter(() => random() < chance);
  while (lost.length > max) lost.splice(Math.floor(random() * lost.length), 1);
  return lost;
}

/**
 * Défaite : perte d'une part de l'or et d'une partie du sac (jamais tout) ; à partir de
 * Guerre (`defeatWornLossChance`), aussi d'une partie de l'équipement porté (au plus la
 * moitié des pièces de chaque héros). Les héros reviennent avec la moitié de leurs PV.
 * Retourne { message, lost: { gold, bag: [objets], worn: [{ hero: nom, slot, item }] } }.
 */
export function applyDefeat(game) {
  const rules = lootRules(difficultyOf(game));
  const gold = Math.round(game.gold * REWARDS.defeatGoldLossPct);
  game.gold -= gold;
  const bag = pickLosses(game.bag, rules.defeatBagLossChance, Math.max(0, game.bag.length - 1));
  game.bag = game.bag.filter((item) => !bag.includes(item));
  const worn = [];
  for (const hero of game.party) {
    const slots = SLOT_ORDER.filter((slot) => hero.equipment[slot]);
    for (const slot of pickLosses(slots, rules.defeatWornLossChance ?? 0, Math.floor(slots.length / 2))) {
      worn.push({ hero: hero.name, slot, item: hero.equipment[slot] });
      delete hero.equipment[slot];
    }
  }
  for (const hero of game.party) {
    restoreFully(hero);
    hero.hp = Math.round(getStats(hero).pv * REWARDS.defeatHpPct);
  }
  const parts = [`${gold} pièces d'or`];
  if (bag.length) parts.push(`${bag.length} objet${bag.length > 1 ? 's' : ''} du sac`);
  if (worn.length) parts.push(`${worn.length} pièce${worn.length > 1 ? 's' : ''} d'équipement portée${worn.length > 1 ? 's' : ''}`);
  const last = parts.pop();
  const text = parts.length ? `${parts.join(', ')} et ${last}` : last;
  return {
    message: `Votre équipe est vaincue et regagne le village de justesse, ayant perdu ${text}.`,
    lost: { gold, bag, worn },
  };
}

// Prix du repos à l'auberge : croît avec le niveau du joueur et la difficulté.
export function innPrice(game) {
  const mult = INN.restDifficultyMult[difficultyOf(game)] ?? 1;
  return Math.round((INN.restBase + INN.restPerLevel * playerLevel(game)) * mult);
}

// Auberge (payante) : soin complet de toute l'équipe, héros tombés compris.
// Retourne { ok, message } ; sans assez d'or, rien ne change.
export function restAtInn(game) {
  const price = innPrice(game);
  if ((game.gold ?? 0) < price) return { ok: false, message: `Il faut ${price} or pour se reposer.` };
  game.gold -= price;
  game.party.forEach(restoreFully);
  return { ok: true, message: `Vous vous reposez à l'auberge (${price} or). Équipe entièrement soignée.` };
}
