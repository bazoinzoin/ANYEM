// Moteur de combat tour par tour. Logique pure : pas de DOM, pas de timers.
// Le rythme (délais des tours ennemis) et l'affichage sont gérés par ui/encounter.js.
//
// Déroulement : nextTurn() renvoie le prochain combattant à agir ({side, unit}),
// puis heroAct() ou enemyAct() résout son action. Quand nextTurn() renvoie null,
// le combat est terminé et cb.result vaut 'victory' ou 'defeat'.

import { COMBAT, VARIANCE } from '../config.js';
import { DUNGEONS } from '../data/dungeons.js';
import { createEnemy } from './enemies.js';
import { getClass, gainResource } from './party.js';
import { rollDamage, healAmount, skillVariance } from './formulas.js';
import { statsOf, isHero, isAlive, damage, heal } from './units.js';
import { pick } from './rng.js';

export function createCombat({ dungeonKey, level, party }) {
  const dungeon = DUNGEONS[dungeonKey];
  const enemies = dungeon.encounter.map((key, i) => createEnemy(key, level, i + 1));
  party.forEach((hero) => {
    hero.guard = false;
    hero.bleed = 0;
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

// Avance jusqu'au prochain combattant vivant et prépare son tour.
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

function endRound(cb) {
  for (const unit of [...cb.party, ...cb.enemies]) {
    if (!unit.alive || unit.bleed <= 0) continue;
    unit.bleed--;
    const fell = damage(unit, COMBAT.bleedDamage);
    log(cb, `${unit.name} souffre d'un saignement (-${COMBAT.bleedDamage} PV).`, true);
    if (fell) logFall(cb, unit);
  }
}

function startHeroTurn(hero) {
  hero.guard = false; // la garde dure jusqu'au prochain tour du héros
  gainResource(hero, getClass(hero).resource.regen);
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

// Liste des cibles valides d'une action du héros actif (indices dans cb.enemies / cb.party).
export function targetsFor(cb, action) {
  if (action.type === 'attack') return { side: 'enemy', units: cb.enemies.filter(isAlive) };
  if (action.type === 'skill') {
    const skill = getClass(cb.acting.unit).skills[action.skill];
    if (skill.target === 'ally') return { side: 'hero', units: cb.party.filter(isAlive) };
    if (skill.target === 'enemy') return { side: 'enemy', units: cb.enemies.filter(isAlive) };
  }
  return null; // pas de ciblage (défense, compétence de zone)
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
  const cls = getClass(hero);
  const atq = statsOf(hero).atq;

  if (action.type === 'defend') {
    hero.guard = true;
    log(cb, `${hero.name} se met en garde.`, true);
  } else if (action.type === 'attack') {
    const target = aliveAt(cb.enemies, action.target);
    if (!target) return false;
    const dmg = rollDamage(atq);
    const fell = damage(target, dmg);
    log(cb, `${hero.name} attaque ${target.name} pour ${dmg} dégâts.`, true);
    if (fell) logFall(cb, target);
    gainResource(hero, cls.resource.onAttack);
  } else if (action.type === 'skill') {
    const skill = cls.skills[action.skill];
    if (!skill || hero.res < skill.cost) return false;
    if (!useSkill(cb, hero, skill, action.target)) return false;
  } else {
    return false;
  }
  endTurn(cb);
  return true;
}

function useSkill(cb, hero, skill, targetIndex) {
  const atq = statsOf(hero).atq;

  if (skill.target === 'ally') {
    const target = aliveAt(cb.party, targetIndex);
    if (!target) return false;
    hero.res -= skill.cost;
    const amount = healAmount(atq, skill.power);
    heal(target, amount);
    log(cb, `${hero.name} utilise ${skill.name} sur ${target.name} (+${amount} PV).`, true);
    return true;
  }

  if (skill.target === 'allEnemies') {
    hero.res -= skill.cost;
    log(cb, `${hero.name} utilise ${skill.name}, frappant tous les ennemis !`, true);
    for (const enemy of cb.enemies.filter(isAlive)) {
      if (damage(enemy, rollDamage(atq, skill.power, skillVariance(skill)))) logFall(cb, enemy);
    }
    return true;
  }

  const target = aliveAt(cb.enemies, targetIndex);
  if (!target) return false;
  hero.res -= skill.cost;
  const dmg = rollDamage(atq, skill.power, skillVariance(skill));
  const fell = damage(target, dmg);
  if (skill.bleed && !fell) target.bleed = skill.bleed;
  log(cb, `${hero.name} utilise ${skill.name} sur ${target.name} pour ${dmg} dégâts.`, true);
  if (fell) logFall(cb, target);
  return true;
}

// IA ennemie : attaque un héros vivant au hasard.
export function enemyAct(cb) {
  if (!cb.acting || cb.acting.side !== 'enemy') return;
  const enemy = cb.acting.unit;
  const target = pick(cb.party.filter(isAlive));
  if (target) {
    let dmg = rollDamage(statsOf(enemy).atq, 1, VARIANCE.enemy);
    if (target.guard) dmg = Math.round(dmg * COMBAT.guardFactor);
    const fell = damage(target, dmg);
    log(cb, `${enemy.name} attaque ${target.name} pour ${dmg} dégâts.`, true);
    if (fell) logFall(cb, target);
    else gainResource(target, getClass(target).resource.onHitTaken);
  }
  endTurn(cb);
}
