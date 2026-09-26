// Génération des objets d'équipement.
//
// Un objet est une donnée figée à sa création, sauf son niveau d'amélioration :
// { id, name, level, rarity, plus, slotType, weaponType?, armorType?, primary,
//   stats: { clé: valeur },   stat(s) obligatoire(s) + stat principale
//   mandatory: [clés],        stat(s) obligatoire(s)
//   bonus: { clé: valeur },   stats secondaires (rareté ≥ peu commun)
//   legendary? }
// Valeurs de base : les stats effectives se lisent via itemStats() / itemStatLines().
// slotType : 'arme' | 'bouclier' | 'anneau' | 'collier' | pièce d'armure (voir ARMOR_PIECES).

import { ITEM, LOOT, FORGE } from '../config.js';
import {
  RARITIES, ARMOR_PIECES, ARMOR_TYPES, WEAPON_TYPES, SHIELD, JEWELS,
  PRIMARY_SUFFIX, SECONDARY_STATS, LEGENDARIES,
} from '../data/items.js';
import { rand, pick, random } from './rng.js';

let nextId = 1;

export function budget(level) {
  return ITEM.budgetBase + ITEM.budgetPerLevel * level;
}

function boost(value, plus, isMandatory) {
  if (!plus) return value;
  const v = Math.round(value * (1 + FORGE.statBonusPerPlus * plus));
  return isMandatory ? Math.max(v, value + plus) : v;
}

// Lignes de stats à afficher, amélioration comprise, dans l'ordre :
// obligatoire(s), principale, secondaires. [{ stat, value, secondary }]
// Une stat peut apparaître deux fois (Blocage obligatoire + secondaire d'un bouclier).
export function itemStatLines(item) {
  const plus = item.plus ?? 0;
  const main = Object.entries(item.stats).map(([stat, value]) =>
    ({ stat, value: boost(value, plus, item.mandatory.includes(stat)), secondary: false }));
  const bonus = Object.entries(item.bonus ?? {}).map(([stat, value]) =>
    ({ stat, value: boost(value, plus, false), secondary: true }));
  return [...main, ...bonus];
}

// Stats effectives totales de l'objet, amélioration comprise.
export function itemStats(item) {
  const total = {};
  for (const { stat, value } of itemStatLines(item)) total[stat] = (total[stat] ?? 0) + value;
  return total;
}

export function isWeapon(item) {
  return item.slotType === 'arme';
}

export function isTwoHanded(item) {
  return isWeapon(item) && !!WEAPON_TYPES[item.weaponType].twoHanded;
}

// Libellé du type, ex. « Armure lourde · Plastron », « Arme à deux mains ».
export function itemTypeLabel(item) {
  if (isWeapon(item)) return WEAPON_TYPES[item.weaponType].label;
  if (item.slotType === 'bouclier') return SHIELD.label;
  if (JEWELS[item.slotType]) return JEWELS[item.slotType].label;
  return ARMOR_TYPES[item.armorType].label;
}

export function weightedPick(weights) {
  const entries = Object.entries(weights);
  let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function rollRarity() {
  return weightedPick(LOOT.rarityWeights);
}

// Tire une base d'objet aléatoire (hors légendaires).
export function rollBase() {
  const category = weightedPick(LOOT.categoryWeights);
  if (category === 'weapon') return { slotType: 'arme', weaponType: pick(Object.keys(WEAPON_TYPES)) };
  if (category === 'shield') return { slotType: 'bouclier' };
  if (category === 'jewel') return { slotType: pick(Object.keys(JEWELS)) };
  return { slotType: pick(Object.keys(ARMOR_PIECES)), armorType: pick(Object.keys(ARMOR_TYPES)) };
}

function primaryOptions(base) {
  if (base.slotType === 'arme') return WEAPON_TYPES[base.weaponType].primaries;
  if (base.slotType === 'bouclier') return SHIELD.primaries;
  if (JEWELS[base.slotType]) return ['force', 'agilite', 'intelligence'];
  return ARMOR_TYPES[base.armorType].primaries;
}

function baseName(base) {
  if (base.slotType === 'arme') return WEAPON_TYPES[base.weaponType].name;
  if (base.slotType === 'bouclier') return SHIELD.name;
  if (JEWELS[base.slotType]) return JEWELS[base.slotType].name;
  return ARMOR_TYPES[base.armorType].names[base.slotType];
}

// Stat obligatoire : attaque (arme), défense (armure), défense magique (bijou) ;
// exception : défense + blocage pour un bouclier.
// Un objet commun ne porte que sa/ses stat(s) obligatoire(s) et sa stat principale.
function mandatoryStats(base, level, mult) {
  const b = budget(level);
  if (base.slotType === 'arme') {
    return { atq: Math.round(b * ITEM.weaponAtq * WEAPON_TYPES[base.weaponType].atqMult * mult) };
  }
  if (base.slotType === 'bouclier') {
    return {
      def: Math.round(b * ITEM.shieldDef * mult),
      blocage: Math.round((ITEM.shieldBlock.base + ITEM.shieldBlock.perLevel * level) * mult),
    };
  }
  if (JEWELS[base.slotType]) {
    return { defMag: Math.max(1, Math.round(b * ITEM.jewelDefMag * JEWELS[base.slotType].weight * mult)) };
  }
  const weight = ARMOR_PIECES[base.slotType];
  return { def: Math.max(1, Math.round(b * ITEM.armorDef * weight * ARMOR_TYPES[base.armorType].defMult * mult)) };
}

function primaryWeight(base) {
  if (base.slotType === 'arme') return WEAPON_TYPES[base.weaponType].twoHanded ? 1.6 : 1;
  if (base.slotType === 'bouclier') return 0.8;
  if (JEWELS[base.slotType]) return 1;
  return ARMOR_PIECES[base.slotType];
}

function secondaryValue(stat, level, range) {
  const def = SECONDARY_STATS[stat];
  const unit = def.base + def.perLevel * level;
  return Math.max(1, Math.round(unit * rand(range[0], range[1])));
}

/**
 * Crée un objet. Tout paramètre omis est tiré au hasard.
 * opts : { level, rarity, slotType, weaponType, armorType, primary, legendary (clé LEGENDARIES),
 *          classKeys (légendaire tiré parmi ceux de ces classes) }
 */
export function generateItem(opts = {}) {
  const level = Math.max(1, opts.level ?? 1);
  let rarity = opts.rarity ?? rollRarity();
  let legendaryKey = opts.legendary ?? null;
  if (legendaryKey) rarity = 'legendaire';
  if (rarity === 'legendaire' && !legendaryKey) {
    const all = Object.keys(LEGENDARIES);
    const forParty = opts.classKeys ? all.filter((k) => opts.classKeys.includes(LEGENDARIES[k].classKey)) : [];
    legendaryKey = pick(forParty.length ? forParty : all);
  }
  const legendary = legendaryKey ? LEGENDARIES[legendaryKey] : null;

  const base = legendary
    ? { slotType: legendary.slotType, weaponType: legendary.weaponType, armorType: legendary.armorType }
    : opts.slotType ? { slotType: opts.slotType, weaponType: opts.weaponType, armorType: opts.armorType } : rollBase();
  const primary = legendary?.primary ?? opts.primary ?? pick(primaryOptions(base));
  const r = RARITIES[rarity];

  const stats = mandatoryStats(base, level, r.mult);
  const mandatory = Object.keys(stats);
  stats[primary] = Math.max(1, Math.round(budget(level) * ITEM.primaryPerBudget * primaryWeight(base) * r.mult));

  // Stats secondaires distinctes, jamais une stat déjà présente sur l'objet
  // (sauf exception : le Blocage d'un bouclier).
  const repeatable = base.slotType === 'bouclier' ? SHIELD.repeatableSecondaries : [];
  const pool = Object.keys(SECONDARY_STATS).filter((k) => !(k in stats) || repeatable.includes(k));
  const bonus = {};
  for (let i = 0; i < r.secondaries && pool.length; i++) {
    const stat = pool.splice(Math.floor(random() * pool.length), 1)[0];
    bonus[stat] = secondaryValue(stat, level, r.range);
  }

  let name = legendary ? legendary.name : baseName(base);
  if (!legendary && rarity !== 'commun') name += ` ${PRIMARY_SUFFIX[primary]}`;

  const item = { id: `it${nextId++}`, name, level, rarity, plus: 0, ...base, primary, stats, mandatory, bonus };
  for (const k of ['weaponType', 'armorType']) if (item[k] === undefined) delete item[k];
  if (legendary) item.legendary = { key: legendaryKey, classKey: legendary.classKey, passive: legendary.passive, desc: legendary.desc };
  return item;
}
