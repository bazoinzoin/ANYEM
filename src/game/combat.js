// Moteur de combat tour par tour. Logique pure : pas de DOM, pas de timers.
// Le rythme (délais des tours ennemis) et l'affichage sont gérés par ui/encounter.js.
//
// Déroulement : nextTurn() renvoie le prochain combattant à agir ({side, unit}),
// puis heroAct() ou enemyAct() résout son action. Quand nextTurn() renvoie null,
// le combat est terminé et cb.result vaut 'victory' ou 'defeat'.
//
// Une unité étourdie passe son tour automatiquement : nextTurn() le consomme et
// passe au combattant suivant. Les effets sur la durée (poison, régénération…)
// s'appliquent et se décomptent à la fin du tour de chaque unité.
//
// Classes à Énergie (game/combo.js) : après une action, le héros garde la main
// (cb.acting inchangé) tant qu'il peut payer une autre action ; l'action
// { type: 'endTurn' } finit son tour. Les autres classes n'ont qu'une action par
// tour, mais peuvent aussi passer leur tour.

import { COMBAT } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { createEnemies } from './enemies.js';
import { getClass, getSkills, getStats, gainResource } from './party.js';
import { isMultiAction, actionCost, canPay, comboOf, gainCombo, atCombo } from './combo.js';
import { canUseWeapon, usesWeapon, canChangePosition, otherRow, targetWeight } from './position.js';
import {
  rollHit, healAmount, skillHitOptions, chance, effectValue, defenseFactor,
  BASIC_ATTACK, ENEMY_ATTACK,
} from './formulas.js';
import { statsOf, isHero, isAlive, damage, heal } from './units.js';
import { addStatus, hasStatus, consumeStun, tickStatuses, makeStatus, statusesOf } from './statuses.js';
import { applyConsumable, countOf, isValidTarget, isUntargeted, usableIn } from './consumables.js';
import { CONSUMABLES } from '../data/consumables.js';
import { EFFECTS } from '../data/effects.js';
import { pick, random } from './rng.js';

/**
 * Prépare un combat.
 * enemies     : clés d'ennemis (data/enemies.js), tous au niveau `level`
 * consumables : inventaire partagé de l'équipe (modifié quand un objet est utilisé)
 * title       : texte d'introduction (ex. « Forêt Maudite — étage 3 »)
 * power       : multiplicateur de difficulté des ennemis (PV et attaque)
 */
export function createCombat({ party, enemies, level, consumables = {}, title = 'Combat', power = 1 }) {
  party.forEach((hero) => {
    hero.guard = false;
    // Les effets négatifs restent d'un combat à l'autre (jusqu'au village ou à un
    // remède) ; les effets positifs disparaissent.
    hero.statuses = (hero.statuses ?? []).filter((s) => s.kind === 'debuff');
    hero.combo = 0;
    hero.usedSkills = []; // compétences « une fois par combat » déjà utilisées
    hero.row = hero.position ?? 'melee'; // position de départ (écran Stratégie)
    // L'Énergie est pleine au début de chaque combat.
    if (hero.alive && isMultiAction(hero)) hero.res = getStats(hero).resMax;
  });
  const cb = {
    title, level, party, enemies: createEnemies(enemies, level, power), consumables,
    log: [], queue: [], qIndex: 0, round: 0, acting: null, result: null,
  };
  log(cb, `${title} (niveau ${level}).`);
  return cb;
}

// Ligne du journal : `hit` = action marquante (en clair), `detail` = explication
// affichée au survol (calcul des dégâts), `crit` = coup critique.
export function log(cb, text, hit = false, detail = null, crit = false) {
  cb.log.unshift({ text, hit, detail, crit });
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
  // Héros à Énergie qui n'a pas fini son tour : il garde la main.
  if (cb.acting?.side === 'hero' && !checkOutcome(cb)) return cb.acting;
  cb.acting = null;
  while (!checkOutcome(cb)) {
    if (cb.qIndex >= cb.queue.length) {
      startRound(cb);
      continue;
    }
    const turn = cb.queue[cb.qIndex];
    if (!turn.unit.alive) {
      cb.qIndex++;
      continue;
    }
    triggerTraps(cb, turn.unit);
    if (!turn.unit.alive) {
      cb.qIndex++;
      continue;
    }
    if (consumeStun(turn.unit)) {
      log(cb, `${turn.unit.name} est étourdi et passe son tour.`, true);
      endUnitTurn(cb, turn.unit);
      cb.qIndex++;
      continue;
    }
    if (turn.side === 'hero' && confusedHeroStrikes(cb, turn.unit)) {
      endUnitTurn(cb, turn.unit);
      cb.qIndex++;
      continue;
    }
    cb.acting = turn;
    if (turn.side === 'hero') startHeroTurn(turn.unit);
    return turn;
  }
  return null;
}

// Pièges posés sur l'unité : ils se déclenchent au début de son tour (dégâts,
// puis effets du piège, ex. étourdissement qui lui fait perdre ce tour).
function triggerTraps(cb, unit) {
  for (const trap of statusesOf(unit).filter((s) => s.trap)) {
    unit.statuses = statusesOf(unit).filter((s) => s !== trap);
    const { taken, fell } = hurt(cb, unit, trap.trap);
    log(cb, `${trap.name} se referme sur ${unit.name} (-${taken} PV) !`, true);
    if (fell) {
      logFall(cb, unit);
      return;
    }
    for (const e of EFFECTS[trap.key].trap.effects ?? []) addStatus(unit, makeStatus(e.id, e.turns));
  }
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

// Fin du tour d'une unité : ses effets sur la durée (dégâts, soins) s'appliquent,
// puis la durée de ses statuts baisse d'un tour.
function endUnitTurn(cb, unit) {
  if (!unit.alive) return;
  {
    for (const tick of tickStatuses(unit)) {
      if (!unit.alive) break;
      if (tick.dot) {
        const { taken, fell } = hurt(cb, unit, tick.dot);
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

// Héros confus : une chance sur deux de frapper un allié au lieu de jouer.
function confusedHeroStrikes(cb, hero) {
  const allies = cb.party.filter((h) => h.alive && h !== hero);
  if (!hasStatus(hero, 'confuse') || !allies.length || random() >= COMBAT.confuseChance) return false;
  const victim = pick(allies);
  const r = strike(cb, hero, victim, BASIC_ATTACK);
  if (r.dodged) log(cb, `${hero.name}, confus, s'en prend à ${victim.name}, qui esquive !`, true, r.detail);
  else log(cb, `${hero.name}, confus, frappe ${victim.name} pour ${r.taken} dégâts${strikeNotes(r)} !`, true, r.detail, r.crit);
  if (r.fell) logFall(cb, victim);
  return true;
}

function startHeroTurn(hero) {
  hero.guard = false; // la garde dure jusqu'au prochain tour du héros
  hero.actedThisTurn = false;
  gainResource(hero, getClass(hero).resource.regen + (statsOf(hero).resRegen ?? 0));
}

function endTurn(cb) {
  if (cb.acting) endUnitTurn(cb, cb.acting.unit);
  cb.qIndex++;
  cb.acting = null;
}

// Pose un statut ; posé sur l'unité qui joue, il ne sera pas décompté à la fin de ce tour.
function applyStatus(cb, unit, status) {
  addStatus(unit, cb.acting?.unit === unit ? { ...status, fresh: true } : status);
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
  if (action.type === 'item') {
    return isUntargeted(action.item) ? null : { side: 'hero', units: cb.party.filter((h) => isValidTarget(action.item, h)) };
  }
  if (action.type !== 'skill') return null;
  const skill = getSkills(cb.acting.unit)[action.skill];
  if (skill.target === 'enemy') return { side: 'enemy', units: cb.enemies.filter(isAlive) };
  if (skill.target === 'ally') return { side: 'hero', units: cb.party.filter(isAlive) };
  if (skill.target === 'deadAlly') return { side: 'hero', units: cb.party.filter((h) => !h.alive) };
  return null;
}

// Un consommable est-il utilisable maintenant (en stock, cible possible, Énergie
// suffisante pour un héros à Énergie) ?
export function canUseItem(cb, key) {
  if (!CONSUMABLES[key] || !usableIn(key, 'combat') || countOf(cb.consumables, key) <= 0) return false;
  if (cb.acting?.side === 'hero' && !canPay(cb.acting.unit, 'item')) return false;
  return isUntargeted(key) || cb.party.some((h) => isValidTarget(key, h));
}

// Une compétence est-elle utilisable maintenant (ressource, cible possible, points
// de combo pour un finisher) ?
export function canUseSkill(cb, hero, skill) {
  if (hero.res < skill.cost) return false;
  if (skill.finisher && comboOf(hero) < 1) return false;
  if (skill.oncePerCombat && hero.usedSkills?.includes(skill.id)) return false;
  if (usesWeapon(skill) && !canUseWeapon(hero)) return false; // arme inutilisable depuis cette position
  if (skill.target === 'deadAlly') return cb.party.some((h) => !h.alive);
  return true;
}

// Action de base possible maintenant pour le héros actif ('attack' | 'defend').
export function canDoAction(cb, hero, type) {
  if (!canPay(hero, type)) return false;
  if (type === 'attack') return canUseWeapon(hero) && cb.enemies.some(isAlive);
  if (type === 'defend') return !(hero.guard && isMultiAction(hero)); // une seule garde par tour
  return true;
}

// Le héros peut-il encore agir ce tour-ci (classes à Énergie) ?
export function hasActionLeft(cb, hero) {
  return canDoAction(cb, hero, 'attack') || canDoAction(cb, hero, 'defend')
    || getSkills(hero).some((s) => canUseSkill(cb, hero, s))
    || Object.keys(CONSUMABLES).some((k) => canUseItem(cb, k));
}

/**
 * Résout l'action du héros actif.
 * action : { type: 'endTurn' }  (passer / finir son tour)
 *        | { type: 'move' }     (changer de position : corps à corps ↔ distance, prend le tour)
 *        | { type: 'defend' }
 *        | { type: 'attack', target: indexEnnemi }
 *        | { type: 'skill', skill: indexCompétence, target?: indexEnnemi | indexAllié }
 *        | { type: 'item', item: cléConsommable, target: indexAllié }
 * Retourne false (sans rien modifier) si l'action est invalide.
 */
export function heroAct(cb, action) {
  if (!cb.acting || cb.acting.side !== 'hero') return false;
  const hero = cb.acting.unit;

  if (action.type === 'move') {
    if (!canChangePosition(hero)) return false;
    hero.row = otherRow(hero.row);
    log(cb, `${hero.name} passe ${hero.row === 'melee' ? 'au corps à corps' : 'à distance'}.`, true);
    endTurn(cb); // changer de position prend toujours le tour
    return true;
  }

  if (action.type === 'endTurn') {
    log(cb, isMultiAction(hero) ? `${hero.name} termine son tour.` : `${hero.name} passe son tour.`);
    endTurn(cb);
    return true;
  }

  if (action.type === 'defend') {
    if (!canDoAction(cb, hero, 'defend')) return false;
    hero.res -= actionCost(hero, 'defend');
    hero.guard = true;
    log(cb, `${hero.name} se met en garde.`, true);
    const stats = statsOf(hero);
    if (stats.guardShieldPct) {
      const amount = Math.round(stats.pv * stats.guardShieldPct / 100);
      applyStatus(cb, hero, makeStatus('bouclier', 2, amount));
      log(cb, `${hero.name} lève un rempart (Bouclier de ${amount}).`, true);
    }
  } else if (action.type === 'attack') {
    const target = aliveAt(cb.enemies, action.target);
    if (!target || !canDoAction(cb, hero, 'attack')) return false;
    hero.res -= actionCost(hero, 'attack');
    const r = strike(cb, hero, target, BASIC_ATTACK);
    const { taken, fell } = r;
    if (r.dodged) log(cb, `${target.name} esquive l'attaque de ${hero.name} !`, true, r.detail);
    else log(cb, `${hero.name} attaque ${target.name} pour ${taken} dégâts${strikeNotes(r)}.`, true, r.detail, r.crit);
    if (fell) logFall(cb, target);
    lifesteal(cb, hero, taken);
    gainResource(hero, getClass(hero).resource.onAttack + (statsOf(hero).resOnAttack ?? 0));
    if (!fell) riposte(cb, hero, target);
  } else if (action.type === 'item') {
    if (!canUseItem(cb, action.item)) return false;
    const def = CONSUMABLES[action.item];
    const cost = actionCost(hero, 'item');
    const target = cb.party[action.target];
    const result = target ? applyConsumable(action.item, target) : null;
    if (result === null) return false;
    log(cb, `${hero.name} utilise ${def.name} sur ${target.name} (${result}).`, true);
    // Payé après l'effet : un Élixir rend de l'Énergie sur la ressource déjà dépensée.
    hero.res = Math.max(0, hero.res - cost);
    cb.consumables[action.item]--;
  } else if (action.type === 'skill') {
    const base = getSkills(hero)[action.skill];
    if (!base || !canUseSkill(cb, hero, base)) return false;
    const skill = atCombo(base, comboOf(hero));
    const targets = skillTargets(cb, hero, skill, action.target);
    if (!targets) return false;
    hero.res -= skill.cost;
    if (skill.finisher) hero.combo = 0;
    if (skill.oncePerCombat) hero.usedSkills = [...(hero.usedSkills ?? []), skill.id];
    const { crit } = useSkill(cb, hero, skill, targets);
    if (usesWeapon(skill) && skill.target === 'enemy' && targets[0].alive) riposte(cb, hero, targets[0]);
    // Talent « Implacable » : un finisher rend de l'Énergie par point de combo dépensé.
    if (skill.finisher) gainResource(hero, skill.comboPoints * (statsOf(hero).finisherRefund ?? 0));
    if (skill.comboGain) {
      const gained = gainCombo(hero, skill.comboGain + (crit ? statsOf(hero).critCombo ?? 0 : 0));
      if (gained) log(cb, `${hero.name} gagne ${gained} point${gained > 1 ? 's' : ''} de combo (${comboOf(hero)}).`);
    }
  } else {
    return false;
  }

  hero.actedThisTurn = true;
  if (isMultiAction(hero) && !checkOutcome(cb) && hero.alive) {
    if (hasActionLeft(cb, hero)) return true; // le héros garde la main
    const res = getClass(hero).resource.name;
    log(cb, `${hero.name} n'a plus assez ${/^[AEIOUÉÈ]/.test(res) ? "d'" : 'de '}${res} : fin du tour.`);
  }
  endTurn(cb);
  return true;
}

/**
 * Coup direct (attaque simple ou compétence de dégâts) de `attacker` sur `target` :
 * esquive (tout le coup évité), jet de dégâts, blocage (une partie évitée), garde,
 * boucliers, Intercession. Retourne { dodged, blocked, crit, taken, fell, detail }.
 * Un héros touché qui survit gagne sa Rage d'encaissement.
 */
function strike(cb, attacker, target, opts) {
  const ts = statsOf(target);
  if (random() < chance(ts, 'esquive')) {
    return { dodged: true, blocked: false, crit: false, taken: 0, fell: false, detail: `${target.name} esquive (${Math.round(chance(ts, 'esquive') * 100)} % de chance)` };
  }
  const hit = rollHit(statsOf(attacker), opts, ts);
  let dmg = hit.amount;
  const notes = [hit.detail];
  const blocked = random() < chance(ts, 'blocage');
  if (blocked) {
    dmg = Math.round(dmg * (1 - COMBAT.blockReduction));
    notes.push(`bloqué (−${Math.round(COMBAT.blockReduction * 100)} %) → ${dmg}`);
  }
  if (target.guard) {
    dmg = guarded(target, dmg);
    notes.push(`en garde → ${dmg}`);
  }
  const r = hurt(cb, target, dmg);
  if (r.absorbed) notes.push(`${r.absorbed} absorbés par un bouclier`);
  if (r.redirected) notes.push(`${r.redirected} encaissés par ${r.protector.unit.name}`);
  if (!r.fell && isHero(target) && !isHero(attacker)) onHitTaken(target);
  return { dodged: false, blocked, crit: hit.crit, taken: r.taken, fell: r.fell, detail: notes.join(' ; '), redirect: redirectText(r) };
}

// « (critique !) (bloqué) (12 encaissés par Aldric) »
function strikeNotes(r) {
  return `${r.crit ? ' (critique !)' : ''}${r.blocked ? ' (bloqué)' : ''}${r.redirect ?? ''}`;
}

// Inflige des dégâts à une unité ; signale la chute d'un protecteur (Intercession).
function hurt(cb, unit, amount) {
  const r = damage(unit, amount);
  if (r.protector?.fell) logFall(cb, r.protector.unit);
  return r;
}

// « (12 encaissés par Aldric) » quand une Intercession a pris une part des dégâts.
function redirectText(r) {
  return r.redirected ? ` (${r.redirected} encaissés par ${r.protector.unit.name})` : '';
}

// Riposte : `defender`, au corps à corps et frappé au corps à corps par
// `attacker`, a une chance (stat Riposte) de contre-attaquer pour une part de sa
// puissance physique, réduite par la Défense de l'attaquant.
function riposte(cb, attacker, defender) {
  if (!attacker.alive || !defender.alive || attacker.row !== 'melee' || defender.row !== 'melee') return;
  const stats = statsOf(defender);
  if (random() >= chance(stats, 'riposte')) return;
  const amount = Math.max(1, Math.round(stats.physPower * COMBAT.ripostePower * defenseFactor(statsOf(attacker).def)));
  const { taken, fell } = hurt(cb, attacker, amount);
  log(cb, `${defender.name} riposte et inflige ${taken} dégâts à ${attacker.name} !`, true);
  if (fell) logFall(cb, attacker);
}

// Vol de vie (talent) : le héros récupère une part des dégâts directs infligés.
function lifesteal(cb, hero, dealt) {
  const pct = statsOf(hero).lifestealPct;
  if (!pct || !dealt || !hero.alive) return;
  const healed = heal(hero, Math.round(dealt * pct / 100));
  if (healed) log(cb, `${hero.name} vole ${healed} PV.`);
}

// Dégâts subis par une unité en garde (Défendre ; talents « guardBonus » en plus).
function guarded(unit, amount) {
  if (!unit.guard) return amount;
  const factor = Math.max(COMBAT.minGuardFactor, COMBAT.guardFactor - (statsOf(unit).guardBonus ?? 0) / 100);
  return Math.round(amount * factor);
}

// Rage gagnée par un héros touché qui survit (classe + talents).
function onHitTaken(hero) {
  gainResource(hero, (getClass(hero).resource.onHitTaken ?? 0) + (statsOf(hero).resOnHitTaken ?? 0));
}


// « 28 dégâts », « 28 dégâts critiques » ou, en multi-frappe, « 12 + 15* + 11 dégâts, * = critique ».
function hitsText(hits) {
  const notes = hits.map((h) => `${h.blocked ? ' (bloqué)' : ''}${h.note ?? ''}`).join('');
  if (hits.length === 1) return hits[0].dodged ? 'esquivé' : `${hits[0].amount} dégâts${hits[0].crit ? ' critiques' : ''}${notes}`;
  const text = hits.map((h) => (h.dodged ? 'esquivé' : `${h.amount}${h.crit ? '*' : ''}`)).join(' + ');
  return `${text} dégâts${hits.some((h) => h.crit) ? ', * = critique' : ''}${notes}`;
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
  if (skill.target === 'allHeroes') return ', visant toute votre équipe';
  if (skill.target === 'allAllies') return targets.some(isHero) ? ", sur toute l'équipe" : ', sur ses alliés';
  if (skill.target === 'self') return '';
  return ` sur ${targets[0].name}`;
}

// Applique une compétence (coût déjà payé) à ses cibles. `caster` peut être un
// héros ou un ennemi (capacités ennemies) ; un héros touché profite de sa garde
// et gagne de la Rage s'il survit. Retourne { crit } : au moins un coup critique.
function useSkill(cb, caster, skill, targets) {
  const stats = statsOf(caster);
  const parts = [];
  const details = [];
  let crit = false;
  let dealt = 0;

  for (const target of targets) {
    if (skill.kind === 'damage') {
      const hits = [];
      for (let i = 0; i < (skill.hits ?? 1) && target.alive; i++) {
        const r = strike(cb, caster, target, skillHitOptions(skill));
        hits.push({ ...r, amount: r.taken, note: r.redirect });
        details.push(`${target.name} : ${r.detail}`);
        dealt += r.taken;
        crit ||= r.crit;
        if (r.fell) logFall(cb, target);
      }
      parts.push(`${target.name} : ${hitsText(hits)}`);
    } else if (skill.kind === 'heal') {
      const healed = heal(target, healAmount(stats, skill.power, skill.physHeal));
      parts.push(`${target.name} : +${healed} PV`);
    } else if (skill.kind === 'revive') {
      target.alive = true;
      target.statuses = [];
      target.hp = Math.max(1, Math.round(statsOf(target).pv * skill.power));
      parts.push(`${target.name} revient à la vie (${target.hp} PV)`);
    }
    if (!target.alive) continue;

    if (skill.cleanse) {
      const removed = statusesOf(target).filter((st) => st.kind === 'debuff');
      target.statuses = statusesOf(target).filter((st) => st.kind !== 'debuff');
      if (removed.length) parts.push(`${target.name} : ${removed.map((st) => st.name).join(', ')} dissipé${removed.length > 1 ? 's' : ''}`);
    }
    for (const entry of skill.effects ?? []) {
      const status = makeStatus(entry.id, entry.turns, effectValue(stats, skill, entry));
      if (status.redirect) {
        if (target === caster) continue; // on ne s'intercède pas pour soi-même
        status.source = caster;
      }
      applyStatus(cb, target, status);
      if (status.shield) parts.push(`${target.name} : Bouclier de ${status.shield}`);
    }
  }
  for (const entry of skill.selfEffects ?? []) applyStatus(cb, caster, makeStatus(entry.id, entry.turns, effectValue(stats, skill, entry)));
  if (skill.resourceGain && isHero(caster)) {
    gainResource(caster, skill.resourceGain);
    parts.push(`+${skill.resourceGain} ${getClass(caster).resource.name}`);
  }

  const detail = parts.length ? ` (${parts.join(' ; ')})` : '';
  const combo = skill.comboPoints ? ` avec ${skill.comboPoints} point${skill.comboPoints > 1 ? 's' : ''} de combo` : '';
  log(cb, `${caster.name} utilise ${skill.name}${combo}${targetLabel(skill, targets)}${detail}.`, true, details.join('\n') || null, crit);
  if (isHero(caster)) lifesteal(cb, caster, dealt);
  return { crit };
}

// Cible d'un ennemi : un héros qui provoque en priorité, sinon un héros au hasard.
// Au corps à corps, un héros a plus de chances d'être ciblé qu'à distance.
function enemyTarget(cb) {
  const alive = cb.party.filter(isAlive);
  const taunting = alive.filter((h) => hasStatus(h, 'taunt'));
  const pool = taunting.length ? taunting : alive;
  if (!pool.length) return undefined;
  let roll = random() * pool.reduce((sum, h) => sum + targetWeight(h), 0);
  for (const hero of pool) {
    roll -= targetWeight(hero);
    if (roll < 0) return hero;
  }
  return pool[pool.length - 1];
}

// Cibles d'une capacité ennemie (point de vue de l'ennemi).
function abilityTargets(cb, enemy, skill) {
  switch (skill.target) {
    case 'hero': return [enemyTarget(cb)];
    case 'allHeroes': return cb.party.filter(isAlive);
    case 'self': return [enemy];
    case 'allAllies': return cb.enemies.filter(isAlive);
    default: return [];
  }
}

// Capacité tentée ce tour : chacune dans l'ordre, avec sa chance.
function pickAbility(enemy) {
  for (const { chance: odds, skill } of ENEMIES[enemy.enemyKey]?.abilities ?? []) {
    if (random() < odds) return skill;
  }
  return null;
}

// IA ennemie : capacité spéciale éventuelle, sinon attaque de base sur un héros
// (plus souvent un héros au corps à corps ; riposte possible au corps à corps)
// (esquive / blocage / garde / boucliers possibles, sur tous les coups directs).
// Une unité confuse a une chance sur deux de frapper l'un de ses alliés.
export function enemyAct(cb) {
  if (!cb.acting || cb.acting.side !== 'enemy') return;
  const enemy = cb.acting.unit;
  const others = cb.enemies.filter((e) => e.alive && e !== enemy);
  if (hasStatus(enemy, 'confuse') && others.length && random() < COMBAT.confuseChance) {
    const victim = pick(others);
    const r = strike(cb, enemy, victim, ENEMY_ATTACK);
    if (r.dodged) log(cb, `${enemy.name}, confus, s'en prend à ${victim.name}, qui esquive !`, true, r.detail);
    else log(cb, `${enemy.name}, confus, frappe ${victim.name} pour ${r.taken} dégâts${strikeNotes(r)} !`, true, r.detail, r.crit);
    if (r.fell) logFall(cb, victim);
    endTurn(cb);
    return;
  }

  const ability = pickAbility(enemy);
  if (ability) {
    const targets = abilityTargets(cb, enemy, ability);
    useSkill(cb, enemy, ability, targets);
    if (ability.kind === 'damage' && !ability.magic && ability.target === 'hero' && targets[0]?.alive) riposte(cb, enemy, targets[0]);
    endTurn(cb);
    return;
  }

  const target = enemyTarget(cb);
  if (target) {
    const r = strike(cb, enemy, target, { ...ENEMY_ATTACK, magic: enemy.magic });
    if (r.dodged) log(cb, `${target.name} esquive l'attaque de ${enemy.name} !`, true, r.detail);
    else log(cb, `${enemy.name} attaque ${target.name} pour ${r.taken} dégâts${strikeNotes(r)}.`, true, r.detail, r.crit);
    if (r.fell) logFall(cb, target);
    else if (!enemy.magic) riposte(cb, enemy, target);
  }
  endTurn(cb);
}
