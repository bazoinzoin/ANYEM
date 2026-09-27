// Arbres de compétences : points, paliers, apprentissage, réinitialisation,
// et effets cumulés des talents appris (lus par getStats / getSkills).
// Gros paliers obligatoires, petits paliers = un bonus au choix parmi trois
// (voir data/talents.js) ; un palier s'ouvre quand les précédents sont complets.
//
// hero.talents : { idDuNœud: rang }

import { TALENTS, nodeSkills } from '../data/talents.js';
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

// Rangs d'un palier une fois complet (le rang maximum de ses nœuds : un petit palier
// ne se prend qu'une fois, sur un seul de ses trois bonus).
export function tierMax(branch, tier) {
  return Math.max(0, ...branch.nodes.filter((n) => n.tier === tier).map((n) => n.ranks));
}

export function tiersOf(branch) {
  return [...new Set(branch.nodes.map((n) => n.tier))].sort((a, b) => a - b);
}

// Points à avoir investis dans la branche pour ouvrir le palier : tous les paliers
// précédents complets.
export function tierRequirement(branch, tier) {
  return tiersOf(branch).filter((t) => t < tier).reduce((sum, t) => sum + tierMax(branch, t), 0);
}

export function tierPoints(hero, branch, tier) {
  return branch.nodes.filter((n) => n.tier === tier).reduce((sum, n) => sum + rankOf(hero, n.id), 0);
}

export function tierComplete(hero, branch, tier) {
  return tierPoints(hero, branch, tier) >= tierMax(branch, tier);
}

export function tierOpen(hero, branch, tier) {
  return tiersOf(branch).filter((t) => t < tier).every((t) => tierComplete(hero, branch, t));
}

// Petit palier : le bonus déjà choisi parmi les trois (ou null).
export function chosenInTier(hero, branch, tier) {
  return branch.nodes.find((n) => n.tier === tier && n.kind === 'minor' && rankOf(hero, n.id) > 0) ?? null;
}

// Raison pour laquelle le nœud ne peut pas être appris maintenant, ou null.
export function cannotLearnReason(hero, nodeId) {
  const found = findNode(hero, nodeId);
  if (!found) return 'Talent inconnu';
  const { branch, node } = found;
  if (rankOf(hero, nodeId) >= node.ranks) return 'Rang maximum atteint';
  const chosen = node.kind === 'minor' ? chosenInTier(hero, branch, node.tier) : null;
  if (chosen && chosen !== node) return `Choix déjà fait : ${chosen.name} (réinitialiser pour changer)`;
  const missing = tiersOf(branch).find((t) => t < node.tier && !tierComplete(hero, branch, t));
  if (missing !== undefined) {
    const gate = branch.nodes.filter((n) => n.tier === missing);
    return gate.length === 1 ? `Apprenez d'abord ${gate[0].name}` : `Terminez d'abord le palier ${missing} (un bonus au choix, ${tierMax(branch, missing)} rangs)`;
  }
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
      fx.skills.push(...nodeSkills(node));
      if (node.skillMod) fx.skillMods.push(...[].concat(node.skillMod));
    }
  }
  return fx;
}
