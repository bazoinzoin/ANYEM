// Moteur de combat tour par tour. Logique pure : pas de DOM, pas de timers.
// Le rythme (délais des tours ennemis) et l'affichage sont gérés par ui/encounter.js.
//
// Déroulement : nextTurn() renvoie le prochain combattant à agir ({side, unit}),
// puis heroAct() ou enemyAct() résout son action. Quand nextTurn() renvoie null,
// le combat est terminé et cb.result vaut 'victory' ou 'defeat'.
//
// Une unité étourdie passe son tour automatiquement : nextTurn() le consomme et
// passe au combattant suivant.

import { COMBAT } from '../config.js';
import { DUNGEONS } from '../data/dungeons.js';
import { createEnemy } from './enemies.js';
import { getClass, getSkills, gainResource } from './party.js';
import {
  rollHit, healAmount, skillHitOptions, chance, dotTick, hotTick, shieldAmount,
  BASIC_ATTACK, ENEMY_ATTACK,
} from './formulas.js';
import { statsOf, isHero, isAlive, damage, heal } from './units.js';
import { addStatus, hasStatus, consumeStun, tickStatuses } from './statuses.js';
import { pick, random } from './rng.js';

export function createCombat({ dungeonKey, level, party }) {
  const dungeon = DUNGEONS[dungeonKey];
  const enemies = dungeon.encounter.map((key, i) => createEnemy(key, level, i + 1));
  party.forEach((hero) => {
    hero.guard = false;
    hero.statuses = [];
  });
  const cb = { dungeonKey, level, party, enemies, log: [], queue: [], qIndex: 0, round: 0, acting: null, result: null };
  log(cb, `Vous entrez dans ${dungeon.name} (niveau ${level}).`);
  return cb;
}

export function log(cb, text, hit = false) {
  cb.log.unshift({ text, hit });
  if (cb.log.length > COMBAT.logMax) cb.log.pop();
}

export function checkOutcome(cb) {
  if (!cb.result) {
    if (cb.party.every((h) => !h.alive)) cb.result = 'defeat';
    else if (cb.enemies.every((e) => !e.alive)) cb.result = 'victory';
  }
  return cb.result;
}

// Avance jusqu'au prochain combattant vivant (et non étourdi) et prépare son tour.
export function nextTurn(cb) {
  cb.acting = null;
  while (!checkOutcome(cb)) {
    if (cb.qIndex >= cb.queue.length) {
      if (cb.round > 0) endRound(cb);
      if (checkOutcome(cb)) break;
      startRound(cb);
      continue;
    }
    const turn = cb.queue[cb.qIndex];
    if (!turn.unit.alive) {
      cb.qIndex++;
      continue;
    }
    if (consumeStun(turn.unit)) {
      log(cb, `${turn.unit.name} est étourdi et passe son tour.`, true);
      cb.qIndex++;
      continue;
    }
    cb.acting = turn;
    if (turn.side === 'hero') startHeroTurn(turn.unit);
    return turn;
  }
  return null;
}

// Ordre de jeu : vitesse décroissante (tri stable : à égalité, les héros d'abord).
function startRound(cb) {
  const units = [
    ...cb.party.filter(isAlive).map((unit) => ({ side: 'hero', unit })),
    ...cb.enemies.filter(isAlive).map((unit) => ({ side: 'enemy', unit })),
  ];
  units.sort((a, b) => statsOf(b.unit).vit - statsOf(a.unit).vit);
  cb.queue = units;
  cb.qIndex = 0;
  cb.round++;
}

// Fin de round : effets sur la durée (dégâts, soins), puis décompte des statuts.
function endRound(cb) {
  for (const unit of [...cb.party, ...cb.enemies]) {
    if (!unit.alive) continue;
    for (const tick of tickStatuses(unit)) {
      if (!unit.alive) break;
      if (tick.dot) {
        const { taken, fell } = damage(unit, tick.dot);
        log(cb, `${unit.name} subit ${tick.status.name} (-${taken} PV).`, true);
        if (fell) logFall(cb, unit);
      }
      if (tick.hot) {
        const healed = heal(unit, tick.hot);
        log(cb, `${unit.name} est soigné par ${tick.status.name} (+${healed} PV).`, true);
      }
    }
  }
}

function startHeroTurn(hero) {
  hero.guard = false; // la garde dure jusqu'au prochain tour du héros
  gainResource(hero, getClass(hero).resource.regen + (statsOf(hero).resRegen ?? 0));
}

function endTurn(cb) {
  cb.qIndex++;
  cb.acting = null;
}

function logFall(cb, unit) {
  log(cb, isHero(unit) ? `${unit.name} s'effondre !` : `${unit.name} est vaincu !`, true);
}

function aliveAt(list, index) {
  const unit = list[index];
  return unit && unit.alive ? unit : null;
}

/**
 * Cibles possibles d'une action du héros actif : { side, units } où side vaut
 * 'enemy' (indices dans cb.enemies) ou 'hero' (indices dans cb.party), ou null
 * si l'action ne demande pas de cible (défense, zone, groupe, soi-même).
 */
export function targetsFor(cb, action) {
  if (action.type === 'attack') return { side: 'enemy', units: cb.enemies.filter(isAlive) };
  if (action.type !== 'skill') return null;
  const skill = getSkills(cb.acting.unit)[action.skill];
  if (skill.target === 'enemy') return { side: 'enemy', units: cb.enemies.filter(isAlive) };
  if (skill.target === 'ally') return { side: 'hero', units: cb.party.filter(isAlive) };
  if (skill.target === 'deadAlly') return { side: 'hero', units: cb.party.filter((h) => !h.alive) };
  return null;
}

// Une compétence est-elle utilisable maintenant (ressource, cible possible) ?
export function canUseSkill(cb, hero, skill) {
  if (hero.res < skill.cost) return false;
  if (skill.target === 'deadAlly') return cb.party.some((h) => !h.alive);
  return true;
}

/**
 * Résout l'action du héros actif.
 * action : { type: 'defend' }
 *        | { type: 'attack', target: indexEnnemi }
 *        | { type: 'skill', skill: indexCompétence, target?: indexEnnemi | indexAllié }
 * Retourne false (sans rien modifier) si l'action est invalide.
 */
export function heroAct(cb, action) {
  if (!cb.acting || cb.acting.side !== 'hero') return false;
  const hero = cb.acting.unit;

  if (action.type === 'defend') {
    hero.guard = true;
    log(cb, `${hero.name} se met en garde.`, true);
    const stats = statsOf(hero);
    if (stats.guardShieldPct) {
      const amount = Math.round(stats.pv * stats.guardShieldPct / 100);
      addStatus(hero, { key: 'rempart', name: 'Rempart', icon: '🛡️', kind: 'buff', turns: 2, shield: amount });
      log(cb, `${hero.name} lève un rempart (bouclier de ${amount}).`, true);
    }
  } else if (action.type === 'attack') {
    const target = aliveAt(cb.enemies, action.target);
    if (!target) return false;
    const hit = rollHit(statsOf(hero), BASIC_ATTACK, statsOf(target));
    const { fell } = damage(target, hit.amount);
    log(cb, `${hero.name} attaque ${target.name} pour ${hit.amount} dégâts${critText(hit)}.`, true);
    if (fell) logFall(cb, target);
    gainResource(hero, getClass(hero).resource.onAttack);
  } else if (action.type === 'skill') {
    const skill = getSkills(hero)[action.skill];
    if (!skill || !canUseSkill(cb, hero, skill)) return false;
    const targets = skillTargets(cb, hero, skill, action.target);
    if (!targets) return false;
    hero.res -= skill.cost;
    useSkill(cb, hero, skill, targets);
  } else {
    return false;
  }
  endTurn(cb);
  return true;
}

function critText(hit) {
  return hit.crit ? ' (critique !)' : '';
}

// « 28 dégâts », « 28 dégâts critiques » ou, en multi-frappe, « 12 + 15* + 11 dégâts, * = critique ».
function hitsText(hits) {
  if (hits.length === 1) return `${hits[0].amount} dégâts${hits[0].crit ? ' critiques' : ''}`;
  const text = hits.map((h) => `${h.amount}${h.crit ? '*' : ''}`).join(' + ');
  return `${text} dégâts${hits.some((h) => h.crit) ? ', * = critique' : ''}`;
}

function skillTargets(cb, hero, skill, index) {
  switch (skill.target) {
    case 'enemy': { const t = aliveAt(cb.enemies, index); return t ? [t] : null; }
    case 'ally': { const t = aliveAt(cb.party, index); return t ? [t] : null; }
    case 'deadAlly': { const t = cb.party[index]; return t && !t.alive ? [t] : null; }
    case 'allEnemies': return cb.enemies.filter(isAlive);
    case 'allAllies': return cb.party.filter(isAlive);
    case 'self': return [hero];
    default: return null;
  }
}

function targetLabel(skill, targets) {
  if (skill.target === 'allEnemies') return ', visant tous les ennemis';
  if (skill.target === 'allAllies') return ", sur toute l'équipe";
  if (skill.target === 'self') return '';
  return ` sur ${targets[0].name}`;
}

// Applique une compétence (coût déjà payé) à ses cibles.
function useSkill(cb, hero, skill, targets) {
  const stats = statsOf(hero);
  const parts = [];

  for (const target of targets) {
    if (skill.kind === 'damage') {
      const hits = [];
      for (let i = 0; i < (skill.hits ?? 1) && target.alive; i++) {
        const hit = rollHit(stats, skillHitOptions(skill), statsOf(target));
        hits.push(hit);
        if (damage(target, hit.amount).fell) logFall(cb, target);
      }
      parts.push(`${target.name} : ${hitsText(hits)}`);
    } else if (skill.kind === 'heal') {
      const healed = heal(target, healAmount(stats, skill.power));
      parts.push(`${target.name} : +${healed} PV`);
    } else if (skill.kind === 'revive') {
      target.alive = true;
      target.statuses = [];
      target.hp = Math.max(1, Math.round(statsOf(target).pv * skill.power));
      parts.push(`${target.name} revient à la vie (${target.hp} PV)`);
    }
    if (!target.alive) continue;

    if (skill.dot) {
      addStatus(target, { key: skill.dot.key, name: skill.dot.name, icon: skill.dot.icon ?? '🩸', kind: 'debuff', turns: skill.dot.turns, dot: dotTick(stats, skill) });
    }
    if (skill.hot) {
      addStatus(target, { key: skill.hot.key, name: skill.hot.name, icon: '💚', kind: 'buff', turns: skill.hot.turns, hot: hotTick(stats, skill) });
    }
    if (skill.shield) {
      const amount = shieldAmount(stats, skill);
      addStatus(target, { key: skill.shield.key, name: skill.shield.name, icon: '🛡️', kind: 'buff', turns: skill.shield.turns, shield: amount });
      parts.push(`${target.name} : bouclier de ${amount}`);
    }
    if (skill.status) addStatus(target, skill.status);
  }
  if (skill.selfStatus) addStatus(hero, skill.selfStatus);

  const detail = parts.length ? ` (${parts.join(' ; ')})` : '';
  log(cb, `${hero.name} utilise ${skill.name}${targetLabel(skill, targets)}${detail}.`, true);
}

// Cible d'un ennemi : un héros qui provoque en priorité, sinon un héros au hasard.
function enemyTarget(cb) {
  const alive = cb.party.filter(isAlive);
  const taunting = alive.filter((h) => hasStatus(h, 'taunt'));
  return pick(taunting.length ? taunting : alive);
}

// IA ennemie : attaque un héros (esquive / blocage / garde / boucliers possibles).
// Une unité confuse a une chance sur deux de frapper l'un de ses alliés.
export function enemyAct(cb) {
  if (!cb.acting || cb.acting.side !== 'enemy') return;
  const enemy = cb.acting.unit;
  const others = cb.enemies.filter((e) => e.alive && e !== enemy);
  if (hasStatus(enemy, 'confuse') && others.length && random() < COMBAT.confuseChance) {
    const victim = pick(others);
    const hit = rollHit(statsOf(enemy), ENEMY_ATTACK, statsOf(victim));
    const { fell } = damage(victim, hit.amount);
    log(cb, `${enemy.name}, confus, frappe ${victim.name} pour ${hit.amount} dégâts !`, true);
    if (fell) logFall(cb, victim);
    endTurn(cb);
    return;
  }

  const target = enemyTarget(cb);
  if (target) {
    const targetStats = statsOf(target);
    if (random() < chance(targetStats, 'esquive')) {
      log(cb, `${target.name} esquive l'attaque de ${enemy.name} !`, true);
    } else {
      const hit = rollHit(statsOf(enemy), ENEMY_ATTACK, targetStats);
      let dmg = hit.amount;
      const blocked = random() < chance(targetStats, 'blocage');
      if (blocked) dmg = Math.round(dmg * (1 - COMBAT.blockReduction));
      if (target.guard) dmg = Math.round(dmg * COMBAT.guardFactor);
      const { taken, absorbed, fell } = damage(target, dmg);
      const notes = [critText(hit), blocked ? ' (bloqué)' : '', absorbed ? ` (${absorbed} absorbés)` : ''].join('');
      log(cb, `${enemy.name} attaque ${target.name} pour ${taken} dégâts${notes}.`, true);
      if (fell) logFall(cb, target);
      else gainResource(target, getClass(target).resource.onHitTaken);
    }
  }
  endTurn(cb);
}
