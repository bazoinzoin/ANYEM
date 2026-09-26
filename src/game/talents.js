// Arbres de compétences : points, paliers, apprentissage, réinitialisation,
// et effets cumulés des talents appris (lus par getStats / getSkills).
//
// hero.talents : { idDuNœud: rang }

import { TALENTS } from '../data/talents.js';
import { TALENT_RULES } from '../config.js';

export function branchesOf(hero) {
  return TALENTS[hero.classKey] ?? [];
}

function findNode(hero, nodeId) {
  for (const branch of branchesOf(hero)) {
    const node = branch.nodes.find((n) => n.id === nodeId);
    if (node) return { branch, node };
  }
  return null;
}

export function rankOf(hero, nodeId) {
  return hero.talents?.[nodeId] ?? 0;
}

export function pointsTotal(hero) {
  return hero.level * TALENT_RULES.pointsPerLevel;
}

export function pointsSpent(hero) {
  return Object.values(hero.talents ?? {}).reduce((sum, r) => sum + r, 0);
}

export function pointsAvailable(hero) {
  return pointsTotal(hero) - pointsSpent(hero);
}

export function pointsInBranch(hero, branch) {
  return branch.nodes.reduce((sum, n) => sum + rankOf(hero, n.id), 0);
}

export function tierRequirement(tier) {
  return tier * TALENT_RULES.tierPoints;
}

// Raison pour laquelle le nœud ne peut pas être appris maintenant, ou null.
export function cannotLearnReason(hero, nodeId) {
  const found = findNode(hero, nodeId);
  if (!found) return 'Talent inconnu';
  const { branch, node } = found;
  if (rankOf(hero, nodeId) >= node.ranks) return 'Rang maximum atteint';
  const need = tierRequirement(node.tier);
  if (pointsInBranch(hero, branch) < need) return `Demande ${need} points investis dans ${branch.name}`;
  if (pointsAvailable(hero) <= 0) return 'Aucun point disponible';
  return null;
}

export function learn(hero, nodeId) {
  if (cannotLearnReason(hero, nodeId)) return false;
  hero.talents = { ...hero.talents, [nodeId]: rankOf(hero, nodeId) + 1 };
  return true;
}

export function resetCost(hero) {
  return TALENT_RULES.resetCostPerLevel * hero.level;
}

// Rend tous les points du héros contre de l'or. Retourne false si impossible.
export function resetTalents(game, hero) {
  const cost = resetCost(hero);
  if (pointsSpent(hero) === 0 || game.gold < cost) return false;
  game.gold -= cost;
  hero.talents = {};
  return true;
}

/**
 * Effets cumulés des talents appris :
 * { flat: {stat}, pct: {stat}, passive: {clé}, skills: [compétence], skillMods: [mod] }
 */
export function talentEffects(hero) {
  const fx = { flat: {}, pct: {}, passive: {}, skills: [], skillMods: [] };
  const add = (target, values, rank) => {
    for (const [k, v] of Object.entries(values ?? {})) target[k] = (target[k] ?? 0) + v * rank;
  };
  for (const branch of branchesOf(hero)) {
    for (const node of branch.nodes) {
      const rank = rankOf(hero, node.id);
      if (!rank) continue;
      add(fx.flat, node.flat, rank);
      add(fx.pct, node.pct, rank);
      add(fx.passive, node.passive, rank);
      if (node.skill) fx.skills.push(node.skill);
      if (node.skillMod) fx.skillMods.push(node.skillMod);
    }
  }
  return fx;
}
