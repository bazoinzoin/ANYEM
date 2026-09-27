// Arbres de compétences : points, paliers, apprentissage, réinitialisation,
// et effets cumulés des talents appris (lus par getStats / getSkills).
// Gros paliers obligatoires, petits paliers = deux bonus au choix parmi trois
// (voir data/talents.js) ; un palier s'ouvre quand les précédents sont complets.
//
// hero.talents : { idDuNœud: rang }

import { TALENTS, CHOICE_PICKS, nodeSkills } from '../data/talents.js';
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

// Rangs d'un palier une fois complet : le nœud d'un gros palier ; dans un petit palier,
// CHOICE_PICKS bonus (parmi trois) à leur rang maximum.
export function tierMax(branch, tier) {
  const nodes = branch.nodes.filter((n) => n.tier === tier);
  const picks = nodes.some((n) => n.kind === 'minor') ? Math.min(CHOICE_PICKS, nodes.length) : nodes.length;
  return nodes.map((n) => n.ranks).sort((a, b) => b - a).slice(0, picks).reduce((sum, r) => sum + r, 0);
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

// Petit palier : les bonus déjà choisis parmi les trois.
export function chosenInTier(hero, branch, tier) {
  return branch.nodes.filter((n) => n.tier === tier && n.kind === 'minor' && rankOf(hero, n.id) > 0);
}

// Petit palier : le bonus ne peut plus être pris (les deux choix sont faits, sans lui).
export function excludedInTier(hero, branch, node) {
  if (node.kind !== 'minor' || rankOf(hero, node.id) > 0) return false;
  return chosenInTier(hero, branch, node.tier).length >= CHOICE_PICKS;
}

// Raison pour laquelle le nœud ne peut pas être appris maintenant, ou null.
export function cannotLearnReason(hero, nodeId) {
  const found = findNode(hero, nodeId);
  if (!found) return 'Talent inconnu';
  const { branch, node } = found;
  if (rankOf(hero, nodeId) >= node.ranks) return 'Rang maximum atteint';
  if (excludedInTier(hero, branch, node)) {
    const chosen = chosenInTier(hero, branch, node.tier).map((n) => n.name).join(' et ');
    return `Choix déjà faits : ${chosen} (réinitialiser pour changer)`;
  }
  const missing = tiersOf(branch).find((t) => t < node.tier && !tierComplete(hero, branch, t));
  if (missing !== undefined) {
    const gate = branch.nodes.filter((n) => n.tier === missing);
    return gate.length === 1 ? `Apprenez d'abord ${gate[0].name}` : `Terminez d'abord le palier ${missing} (${CHOICE_PICKS} bonus au choix, ${tierMax(branch, missing)} rangs)`;
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

// Talents d'une ancienne sauvegarde (arbres modifiés depuis) : retire les nœuds inconnus,
// ramène chaque rang au maximum du nœud ; si l'arbre n'est plus cohérent (palier appris
// sans ses prédécesseurs, trop de bonus dans un petit palier), les points sont rendus.
// Retourne vrai si les talents ont été réinitialisés.
export function sanitizeTalents(hero) {
  const nodes = new Map(branchesOf(hero).flatMap((b) => b.nodes.map((n) => [n.id, n])));
  const talents = {};
  for (const [id, rank] of Object.entries(hero.talents ?? {})) {
    const node = nodes.get(id);
    if (node && rank > 0) talents[id] = Math.min(rank, node.ranks);
  }
  hero.talents = talents;
  const broken = branchesOf(hero).some((branch) => branch.nodes.some((n) => rankOf(hero, n.id) > 0 && (!tierOpen(hero, branch, n.tier)
    || (n.kind === 'minor' && chosenInTier(hero, branch, n.tier).length > CHOICE_PICKS))));
  if (broken) hero.talents = {};
  return broken;
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
