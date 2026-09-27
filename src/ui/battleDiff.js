// Ce qui a changé pendant une action de combat (points de vie, chutes, relevés, nouveaux
// effets), pour l'animer sur la scène (ui/battleStage.js). Pur, testable sous Node.

import { statusesOf } from '../game/statuses.js';

// Photo des combattants avant une action.
export function snapshotBattle(cb) {
  const units = new Map();
  for (const u of [...cb.party, ...cb.enemies]) {
    units.set(u, { hp: u.hp, alive: u.alive, statuses: new Set(statusesOf(u)) });
  }
  return { units, logLength: cb.log.length };
}

// Changements depuis la photo : [{ unit, side, delta, died, revived, added }], et crit
// (un coup critique figure parmi les nouvelles lignes du journal).
export function diffBattle(cb, before) {
  const changes = [];
  for (const [unit, b] of before.units) {
    const change = {
      unit,
      side: cb.party.includes(unit) ? 'hero' : 'enemy',
      delta: unit.hp - b.hp,
      died: b.alive && !unit.alive,
      revived: !b.alive && unit.alive,
      added: statusesOf(unit).filter((s) => !b.statuses.has(s)),
    };
    if (change.delta || change.died || change.revived || change.added.length) changes.push(change);
  }
  const crit = cb.log.slice(before.logLength).some((l) => l.crit);
  return { changes, crit };
}

// Geste d'un héros pour une action : 'lunge' (bond et coup d'arme sur une cible),
// 'cast' (sort, soin, soutien, objet) ou null (défense, déplacement, fin de tour).
export function heroGesture(skill, action) {
  if (action.type === 'attack') return 'lunge';
  if (action.type === 'item') return 'cast';
  if (action.type !== 'skill' || !skill) return null;
  return skill.kind === 'damage' && !skill.magic && skill.target === 'enemy' ? 'lunge' : 'cast';
}

// Geste d'un ennemi, déduit de ce qui a changé : magie ou coup sur plusieurs héros = sort ;
// rien sur le camp adverse (soin, soutien) = sort ; sinon bond.
export function enemyGesture(enemy, diff) {
  const hurt = diff.changes.filter((c) => c.side === 'hero' && (c.delta < 0 || c.added.length));
  const helped = diff.changes.some((c) => c.side === 'enemy' && (c.delta > 0 || c.added.length));
  if (enemy.magic || hurt.length > 1) return 'cast';
  if (!hurt.length && helped) return 'cast';
  return 'lunge';
}
