// Héros et équipe.
//
// Un héros ne stocke que son état variable (PV, ressource, statuts). Ses stats
// sont toujours calculées par getStats() : c'est le point d'extension unique
// pour l'équipement, les arbres de compétences et les buffs à venir.

import { CLASSES } from '../data/classes.js';
import { PARTY_ORDER } from '../config.js';

export function getClass(hero) {
  return CLASSES[hero.classKey];
}

export function getStats(hero) {
  const cls = getClass(hero);
  return {
    pv: cls.base.pv,
    atq: cls.base.atq,
    vit: cls.base.vit,
    resMax: cls.resource.max,
  };
}

export function createHero(classKey, name) {
  const cls = CLASSES[classKey];
  return {
    classKey,
    name: name || cls.name,
    hp: cls.base.pv,
    res: cls.resource.start,
    alive: true,
    guard: false,
    bleed: 0,
  };
}

export function createParty(names = []) {
  return PARTY_ORDER.map((key, i) => createHero(key, names[i]?.trim()));
}

export function gainResource(hero, amount) {
  if (!amount) return;
  hero.res = Math.min(getStats(hero).resMax, hero.res + amount);
}

// Soin complet, ressource pleine, statuts retirés, héros ramené à la vie.
export function restoreFully(hero) {
  const stats = getStats(hero);
  hero.alive = true;
  hero.hp = stats.pv;
  hero.res = stats.resMax;
  hero.guard = false;
  hero.bleed = 0;
}
