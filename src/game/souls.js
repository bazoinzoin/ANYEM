// Âmes du Macabre (classe à Mana). Quand un ennemi meurt, chaque Macabre en vie absorbe son
// âme (1 âme, jusqu'à son maximum : `souls.max` de la classe, 3, plus le passif `soulMax`).
// Jauge à part (hero.souls) : gardées d'un combat à l'autre, libérées au repos (restoreFully)
// ou s'il tombe. Selon l'orientation, chaque âme donne des bonus (getStats, applySoulBonuses)
// ou se dépense dans des compétences, en plus de leur coût en Mana (`soulCost` âmes ;
// `allSouls` : toutes les âmes, puissance par âme).
// Contrecoup (SOULS, config.js) à la fin de chacun de ses tours : il perd des PV, de plus en
// plus vite avec le nombre d'âmes et le temps passé au maximum ; au maximum, ses alliés
// en souffrent aussi (sauf avec `soulBulwark`, Mur d'os : il encaisse ce débordement lui-même,
// en plus fort). Un passif `soulWard` (% ) réduit ce contrecoup, `soulHeal` soigne
// d'un % des PV max à chaque âme absorbée.

import { SOULS } from '../config.js';
import { getClass, getStats, usesSouls, soulsOf, gainSouls } from './party.js';

export function isSoulBearer(hero) {
  return usesSouls(getClass(hero));
}

export function soulMax(hero) {
  return getStats(hero).soulMax;
}

/**
 * Un ennemi vient de mourir : chaque Macabre en vie de l'équipe absorbe son âme.
 * Retourne [{ hero, gained, healed }] pour ceux qui en ont gagné une.
 */
export function absorbSoul(party) {
  const out = [];
  for (const hero of party.filter((h) => h.alive && isSoulBearer(h))) {
    const gained = gainSouls(hero, 1);
    if (!gained) continue;
    const stats = getStats(hero);
    let healed = 0;
    if (stats.soulHeal) {
      const before = hero.hp;
      hero.hp = Math.min(stats.pv, hero.hp + Math.round(stats.pv * stats.soulHeal / 100));
      healed = hero.hp - before;
    }
    out.push({ hero, gained, healed });
  }
  return out;
}

/**
 * Contrecoup pour `souls` âmes (sans rien modifier) : % des PV max perdus par le Macabre
 * (`self`) et par chacun de ses alliés (`allies`, au maximum d'âmes seulement).
 * `held` = tours déjà passés au maximum (le premier ne coûte rien de plus).
 */
export function backlashPct(stats, souls, held = 0) {
  if (!souls) return { self: 0, allies: 0 };
  const ward = 1 - Math.min(90, stats.soulWard ?? 0) / 100;
  const atMax = souls >= stats.soulMax;
  // Mur d'os (soulBulwark) : le débordement ne touche pas ses alliés, il le prend pour lui (plus fort).
  const bulwark = atMax && stats.soulBulwark ? SOULS.spill * SOULS.bulwarkMult : 0;
  const self = (SOULS.drain * souls * souls + (atMax ? SOULS.heldGrowth * Math.max(0, held) : 0) + bulwark) * ward;
  return { self: +self.toFixed(2), allies: atMax && !stats.soulBulwark ? +(SOULS.spill * ward).toFixed(2) : 0 };
}

/**
 * Fin d'un tour du Macabre : calcule le contrecoup et met à jour le compteur de tours passés
 * au maximum (hero.soulHeld). Retourne { self, allies } en PV (le combat les inflige).
 */
export function soulBacklash(hero, party) {
  const souls = soulsOf(hero);
  const stats = getStats(hero);
  if (!souls) {
    hero.soulHeld = 0;
    return { self: 0, allies: [] };
  }
  const atMax = souls >= stats.soulMax;
  const held = atMax ? hero.soulHeld ?? 0 : 0;
  hero.soulHeld = atMax ? held + 1 : 0;
  const pct = backlashPct(stats, souls, held);
  const self = Math.max(1, Math.round(stats.pv * pct.self / 100));
  const allies = pct.allies
    ? party.filter((h) => h.alive && h !== hero).map((ally) => ({ ally, amount: Math.round(getStats(ally).pv * pct.allies / 100) }))
    : [];
  return { self, allies };
}

/**
 * Compétence `allSouls` telle qu'elle partira : dépense toutes les âmes (au moins une),
 * puissance et valeur des effets multipliées par le nombre d'âmes (soulsSpent).
 */
export function atSouls(skill, souls) {
  if (!skill.allSouls) return skill;
  const n = Math.max(1, souls);
  const scale = (v) => (v === undefined ? v : +(v * n).toFixed(3));
  return {
    ...skill,
    power: scale(skill.power),
    effects: (skill.effects ?? []).map((e) => (e.power === undefined ? e : { ...e, power: scale(e.power) })),
    selfEffects: (skill.selfEffects ?? []).map((e) => (e.power === undefined ? e : { ...e, power: scale(e.power) })),
    soulCost: n,
    soulsSpent: n,
  };
}
