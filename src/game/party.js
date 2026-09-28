// Héros et équipe.
//
// Un héros ne stocke que son état variable (niveau, XP, PV, ressource, statuts,
// équipement, talents). Ses stats sont toujours calculées par getStats() et ses
// compétences par getSkills() : c'est là que s'appliquent niveau, équipement et
// talents (les buffs de combat s'ajoutent ensuite dans units.statsOf).

import { CLASSES } from '../data/classes.js';
import { SLOT_ORDER, WEAPON_TYPES } from '../data/items.js';
import { EFFECTS } from '../data/effects.js';
import { zeroStats } from '../data/stats.js';
import { PARTY_ORDER, COMBAT, XP } from '../config.js';
import { generateItem, itemStatLines } from './items.js';
import { talentEffects, rankOf } from './talents.js';
import { sanitizeLook } from './appearance.js';

export function getClass(hero) {
  return CLASSES[hero.classKey];
}

function wornItems(hero) {
  return SLOT_ORDER.map((slot) => [slot, hero.equipment[slot]]).filter(([, item]) => item);
}

// Pouvoirs des légendaires portés (ou absorbés par un objet divin) qui s'appliquent :
// un pouvoir `requires` ne fait rien sans le talent qu'il renforce. Les objets
// d'avant la refonte (`passive` = modificateur de compétence) restent lisibles.
export function legendaryPowers(hero) {
  return wornItems(hero)
    .map(([, item]) => item.legendary ?? item.absorbed)
    .filter(Boolean)
    .map((leg) => leg.power ?? (leg.passive ? { skillMod: leg.passive } : null))
    .filter((power) => power && (!power.requires || rankOf(hero, power.requires) > 0));
}

// Coefficient de vitesse d'attaque des armes tenues (moyenne en ambidextrie, 1 sans arme).
export function weaponSpeedOf(hero) {
  const weapons = ['mainDroite', 'mainGauche'].map((slot) => hero.equipment[slot]).filter((it) => it?.slotType === 'arme');
  if (!weapons.length) return 1;
  return +(weapons.reduce((sum, it) => sum + WEAPON_TYPES[it.weaponType].speed, 0) / weapons.length).toFixed(3);
}

// Classe sans ressource (Scarifié) : ses compétences se paient en PV.
export function usesHp(cls) {
  return !!cls.resource.hp;
}

/**
 * Coût en PV d'une compétence pour une classe qui paie en PV : `cost` = % des PV max
 * (au moins 1). Une compétence `sacrifice` coûte tous les PV sauf un.
 */
export function hpCost(hero, skill) {
  if (skill.sacrifice) return Math.max(0, hero.hp - 1);
  return Math.max(1, Math.round(getStats(hero).pv * skill.cost / 100));
}

// Le héros peut-il payer cette compétence ? En PV (Scarifié) : jamais le dernier.
export function canPaySkill(hero, skill) {
  if (!usesHp(getClass(hero))) return hero.res >= skill.cost;
  return skill.sacrifice ? hero.hp > 1 : hpCost(hero, skill) < hero.hp;
}

// Paie une compétence (ressource ou PV). Retourne les PV sacrifiés (0 pour une ressource).
export function paySkill(hero, skill) {
  if (!usesHp(getClass(hero))) {
    hero.res -= skill.cost;
    return 0;
  }
  const paid = hpCost(hero, skill);
  hero.hp -= paid;
  return paid;
}

// Classe à âmes (Macabre) : sa ressource est le nombre d'âmes absorbées (0 à resMax), gagnées
// à la mort des ennemis seulement (voir game/souls.js), jamais par régénération.
export function usesSouls(cls) {
  return !!cls.resource.souls;
}

// Âmes absorbées par le héros (0 pour les autres classes).
export function soulsOf(hero) {
  return usesSouls(getClass(hero)) ? Math.max(0, hero.res ?? 0) : 0;
}

// Ajoute des âmes (plafond : resMax). Retourne le nombre d'âmes réellement gagnées.
export function gainSouls(hero, amount) {
  if (!usesSouls(getClass(hero))) return 0;
  const before = soulsOf(hero);
  hero.res = Math.min(getStats(hero).resMax, before + amount);
  return hero.res - before;
}

// La stat secondaire Mana des objets ne sert qu'aux classes à Mana.
export function usesMana(cls) {
  return cls.resource.name === 'Mana';
}

/**
 * Stats finales du héros (base de classe + équipement), plus :
 *   physPower  puissance physique = Attaque + stat physique de la classe × facteur
 *              (attaque de base et compétences non magiques)
 *   magPower   puissance magique = Intelligence × facteur (sorts et soins)
 *   resMax     maximum de la ressource de classe = base de la classe + talents et légendaires
 *              (resMaxTalents) + Mana des objets pour une classe à Mana (resMaxItems)
 *   vit        Vitesse × coefficient de vitesse des armes (vitBase : avant arme)
 */
export function getStats(hero) {
  const cls = getClass(hero);
  const fx = talentEffects(hero);
  // Les pouvoirs des légendaires s'ajoutent comme des talents.
  for (const power of legendaryPowers(hero)) {
    for (const group of ['flat', 'pct', 'passive']) {
      for (const [k, v] of Object.entries(power[group] ?? {})) fx[group][k] = (fx[group][k] ?? 0) + v;
    }
  }
  const total = { ...zeroStats(), ...cls.base };
  for (const [stat, value] of Object.entries(cls.growth ?? {})) total[stat] += value * ((hero.level ?? 1) - 1);
  for (const [stat, value] of Object.entries(fx.flat)) total[stat] += value;
  for (const [slot, item] of wornItems(hero)) {
    const offHand = slot === 'mainGauche' && item.slotType === 'arme';
    for (const { stat, value, secondary } of itemStatLines(item)) {
      // Arme en main gauche (ambidextrie) : son attaque et ses secondaires ne comptent qu'en partie.
      const factor = !offHand ? 1 : stat === 'atq' && !secondary ? COMBAT.offHandAtqFactor : secondary ? COMBAT.offHandBonusFactor : 1;
      total[stat] += Math.round(value * factor);
    }
  }
  const physFromStat = Math.round(total[cls.physStat] * COMBAT.physStatFactor[cls.physStat]);
  const weaponSpeed = weaponSpeedOf(hero);
  const stats = {
    ...total,
    // L'Armure (stat obligatoire des armures et boucliers) protège des deux types de dégâts.
    def: total.def + total.armure,
    defMag: total.defMag + total.armure,
    // Vitesse d'attaque : la Vitesse est multipliée par le coefficient des armes.
    vitBase: total.vit,
    weaponSpeed,
    vit: Math.round(total.vit * weaponSpeed),
    physPower: total.atq + physFromStat,
    physFromStat,
    magPower: Math.round(total.intelligence * COMBAT.magicPerInt),
    resMax: cls.resource.max + (fx.passive.resMaxBonus ?? 0) + (usesMana(cls) ? total.mana : 0),
    resMaxBase: cls.resource.max,
    resMaxTalents: fx.passive.resMaxBonus ?? 0,
    resMaxItems: usesMana(cls) ? total.mana : 0,
    // Passifs des talents (berserk, healPct, dotPct, resRegen, vsDebuffedPct, guardShieldPct, critCombo…).
    ...fx.passive,
  };
  for (const [stat, pct] of Object.entries(fx.pct)) stats[stat] = Math.round(stats[stat] * (1 + pct / 100));
  if (usesSouls(cls)) applySoulBonuses(stats, Math.min(Math.max(0, hero.res ?? 0), stats.resMax));
  return stats;
}

/**
 * Macabre : bonus par âme absorbée (passifs des orientations, des talents et des légendaires) :
 *   soulPhys / soulMag  +% puissance physique / magique par âme
 *   soulDef             +% Défense et Défense magique par âme
 *   soulCrit / soulBlock  + % Coup critique / Blocage par âme
 *   soulLifesteal       + % de vol de vie par âme
 */
function applySoulBonuses(stats, souls) {
  stats.souls = souls;
  if (!souls) return;
  const pct = (stat, per) => { if (per) stats[stat] = Math.round(stats[stat] * (1 + (per * souls) / 100)); };
  pct('physPower', stats.soulPhys);
  pct('magPower', stats.soulMag);
  pct('def', stats.soulDef);
  pct('defMag', stats.soulDef);
  if (stats.soulCrit) stats.critChance += stats.soulCrit * souls;
  if (stats.soulBlock) stats.blocage += stats.soulBlock * souls;
  if (stats.soulLifesteal) stats.lifestealPct = (stats.lifestealPct ?? 0) + stats.soulLifesteal * souls;
}

/**
 * Modificateurs de compétence (objets légendaires et talents) :
 *   powerPct        +% de puissance      costDelta     ± coût
 *   critBonus       + % de chance de critique
 *   dotTurnsDelta   ± tours des effets de dégâts sur la durée (poison, saignement…)
 *   dotPowerPct     +% de dégâts de ces effets
 *   effectTurnsDelta ± tours de tous les effets appliqués aux cibles
 *   effectPowerPct  +% de valeur de tous les effets à valeur (soins/tour, boucliers…)
 *   addEffects      effets supplémentaires appliqués aux cibles (ex. une brûlure)
 *   addSelfEffects  effets supplémentaires appliqués au lanceur
 *   cleanse         la compétence retire aussi les effets négatifs des cibles
 */
function applySkillMod(skill, mod) {
  const s = { ...skill, boosted: true };
  if (mod.powerPct && s.power) s.power = +(s.power * (1 + mod.powerPct / 100)).toFixed(3);
  if (mod.costDelta) s.cost = Math.max(1, s.cost + mod.costDelta);
  if (mod.critBonus) s.critBonus = (s.critBonus ?? 0) + mod.critBonus;
  s.effects = [...(skill.effects ?? []), ...(mod.addEffects ?? [])].map((e) => {
    const dot = EFFECTS[e.id].value === 'dot';
    const turns = (mod.effectTurnsDelta ?? 0) + (dot ? mod.dotTurnsDelta ?? 0 : 0);
    const pct = (mod.effectPowerPct ?? 0) + (dot ? mod.dotPowerPct ?? 0 : 0);
    if (!turns && !(pct && e.power)) return e;
    return { ...e, turns: e.turns + turns, ...(e.power ? { power: +(e.power * (1 + pct / 100)).toFixed(3) } : {}) };
  });
  if (mod.cleanse) s.cleanse = true;
  if (mod.addSelfEffects) s.selfEffects = [...(skill.selfEffects ?? []), ...mod.addSelfEffects];
  return s;
}

// Compétences du héros : celles apprises par ses talents (un héros commence sans
// sort : les sorts de départ sont au palier 0 des orientations), sans doublon,
// modifiées par les passifs des objets légendaires portés (ou absorbés par un objet
// divin) et des talents.
export function getSkills(hero) {
  const fx = talentEffects(hero);
  const mods = [...legendaryPowers(hero).flatMap((p) => [].concat(p.skillMod ?? [])), ...fx.skillMods];
  const unique = fx.skills.filter((skill, i) => fx.skills.findIndex((s) => s.id === skill.id) === i);
  return unique.map((skill) =>
    mods.filter((m) => m.skill === skill.id).reduce(applySkillMod, skill));
}

export function xpToNext(level) {
  return XP.toNextBase + XP.toNextPerLevel * level;
}

// Ajoute de l'XP ; retourne le nombre de niveaux gagnés. PV et ressource
// gagnés avec le niveau sont ajoutés aux valeurs actuelles.
export function gainXp(hero, amount) {
  if (hero.level >= XP.maxLevel) return 0;
  hero.xp += amount;
  let levels = 0;
  while (hero.level < XP.maxLevel && hero.xp >= xpToNext(hero.level)) {
    const before = getStats(hero).pv;
    hero.xp -= xpToNext(hero.level);
    hero.level++;
    levels++;
    if (hero.alive) hero.hp += getStats(hero).pv - before;
  }
  if (hero.level >= XP.maxLevel) hero.xp = 0; // niveau maximum atteint
  return levels;
}

// Nom de classe accordé : titre des menus avec son article (« La Dissimulée ») ou nom seul
// pour les phrases (« Dissimulée ») ; au féminin si le héros l'a choisi à sa création.
export function classTitle(classKey, feminine = false) {
  const cls = CLASSES[classKey];
  return feminine ? cls.titleF : cls.title;
}
export function heroClassTitle(hero) {
  return classTitle(hero.classKey, hero.feminine);
}
export function heroClassName(hero) {
  const cls = CLASSES[hero.classKey];
  return hero.feminine ? cls.nameF : cls.name;
}
// La classe a-t-elle une forme féminine distincte (Le Dissimulé / La Dissimulée) ?
export function hasFeminine(classKey) {
  return CLASSES[classKey].titleF !== CLASSES[classKey].title;
}

export function createHero(classKey, name, look = null, feminine = false) {
  const cls = CLASSES[classKey];
  const hero = {
    classKey,
    name: name || (feminine ? cls.nameF : cls.name),
    feminine: !!feminine, // forme féminine du nom de classe (choisie à la création)
    hp: 0,
    res: cls.resource.start,
    level: 1,
    xp: 0,
    alive: true,
    guard: false,
    statuses: [],
    position: cls.position ?? 'melee', // position de combat choisie (écran Stratégie)
    equipment: {},
    talents: {},
    look: sanitizeLook(look, classKey), // apparence (data/appearance.js)
  };
  for (const piece of cls.starterKit) {
    const item = generateItem({ level: 1, rarity: 'commun', ...piece });
    hero.equipment[piece.slotType === 'arme' ? 'mainDroite' : piece.slotType] = item;
  }
  hero.hp = getStats(hero).pv;
  return hero;
}

// Équipement commun de niveau 1 à ranger dans le sac à l'arrivée du héros (Macabre : de quoi
// s'équiper quelle que soit sa première orientation).
export function starterSpares(classKey) {
  return (CLASSES[classKey].starterSpares ?? []).map((piece) => generateItem({ level: 1, rarity: 'commun', ...piece }));
}

// Équipe de héros : `classes` (clés de data/classes.js, défaut PARTY_ORDER) et noms.
// `looks` : apparences choisies à la création (défaut : celle de chaque classe) ;
// `feminine` : forme féminine du nom de classe, par héros.
export function createParty(names = [], classes = PARTY_ORDER, looks = [], feminine = []) {
  return classes.map((key, i) => createHero(key, names[i]?.trim(), looks[i], feminine[i]));
}

export function gainResource(hero, amount) {
  if (!amount || usesSouls(getClass(hero))) return; // les âmes ne viennent que des morts
  hero.res = Math.min(getStats(hero).resMax, hero.res + amount);
}

// Ramène PV et ressource sous leurs maximums (après un changement d'équipement).
export function clampToStats(hero) {
  const stats = getStats(hero);
  hero.hp = Math.min(hero.hp, stats.pv);
  hero.res = Math.min(hero.res, stats.resMax);
}

// Soin complet, ressource pleine, statuts retirés, héros ramené à la vie.
export function restoreFully(hero) {
  const stats = getStats(hero);
  hero.alive = true;
  hero.hp = stats.pv;
  hero.res = usesSouls(getClass(hero)) ? 0 : stats.resMax; // le repos libère les âmes
  hero.soulHeld = 0;
  hero.guard = false;
  hero.statuses = [];
}
