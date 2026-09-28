// Partie de test (bouton « Debug » du menu principal) : l'équipe par défaut et les autres
// classes à l'auberge, toutes au niveau maximum avec leurs sorts de départ appris ;
// beaucoup d'or, de matéria et de consommables ; tous les donjons terminés (tous les
// points de départ ouverts, toutes les médailles des 3 premières zones) ; dans le sac, chaque base d'objet au niveau maximum, dans
// chacune de ses stats principales, en Divin, Épique, Rare et Peu commun (pour les
// comparer), plus tous les légendaires.

import { DEBUG, XP, PARTY_ORDER, CLASS_ORDER, INN, MERCHANT } from '../config.js';
import { WEAPON_TYPES, ARMOR_PIECES, ARMOR_TYPES, JEWELS, LEGENDARIES, MATERIA_RARITIES } from '../data/items.js';
import { CONSUMABLES } from '../data/consumables.js';
import { DUNGEONS, DUNGEON_ORDER } from '../data/dungeons.js';
import { createParty, createHero, getStats } from './party.js';
import { generateItem, primaryOptions } from './items.js';
import { progressOf } from './dungeon.js';
import { emptyMateria } from './forge.js';
import { medalDifficulties } from './medals.js';

// Bases d'objets : chaque arme, le bouclier, chaque pièce d'armure de chaque type, chaque bijou.
export function itemBases() {
  return [
    ...Object.keys(WEAPON_TYPES).map((weaponType) => ({ slotType: 'arme', weaponType })),
    { slotType: 'bouclier' },
    ...Object.keys(ARMOR_TYPES).flatMap((armorType) => Object.keys(ARMOR_PIECES).map((slotType) => ({ slotType, armorType }))),
    ...Object.keys(JEWELS).map((slotType) => ({ slotType })),
  ];
}

// Héros au niveau maximum, sans talent : ses 50 points restent à placer dans l'orientation
// de son choix (un héros n'en suit qu'une).
export function maxedHero(hero) {
  hero.level = XP.maxLevel;
  hero.xp = 0;
  hero.hp = getStats(hero).pv;
  return hero;
}

export function setupDebugGame(game, names = [], classes = PARTY_ORDER) {
  game.party = createParty(names, classes).map(maxedHero);
  game.reserve = CLASS_ORDER.filter((k) => !classes.includes(k)).slice(0, INN.maxReserve).map((k) => maxedHero(createHero(k)));
  game.gold = DEBUG.gold;
  game.materia = emptyMateria();
  for (const kind of Object.keys(game.materia)) for (const r of MATERIA_RARITIES) game.materia[kind][r] = DEBUG.materia;
  game.consumables = Object.fromEntries(Object.keys(CONSUMABLES).map((k) => [k, MERCHANT.maxConsumable]));
  for (const [key, d] of Object.entries(DUNGEONS)) Object.assign(progressOf(game, key), { checkpoint: d.floors, cleared: true });
  // Toutes les médailles des premières zones (DEBUG.medalZones), pour voir leur affichage.
  for (const key of DUNGEON_ORDER.slice(0, DEBUG.medalZones)) progressOf(game, key).medals = medalDifficulties();
  game.dungeonLvl = XP.maxLevel;
  const level = XP.maxLevel;
  game.bag = [
    // Chaque base dans chacune de ses stats principales (Force, Agilité, Intelligence).
    ...itemBases().flatMap((base) => primaryOptions(base).flatMap((primary) =>
      DEBUG.rarities.map((rarity) => generateItem({ level, rarity, primary, ...base })))),
    ...Object.keys(LEGENDARIES).map((legendary) => generateItem({ level, legendary })),
  ];
  return game;
}
