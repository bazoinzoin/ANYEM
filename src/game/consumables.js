// Consommables : inventaire (game.consumables = { clé: quantité }) et effets.

import { CONSUMABLES } from '../data/consumables.js';
import { MERCHANT } from '../config.js';
import { getStats, gainResource } from './party.js';
import { heal } from './units.js';
import { statusesOf } from './statuses.js';

export function startingConsumables() {
  return { ...MERCHANT.startingConsumables };
}

export function countOf(inventory, key) {
  return inventory?.[key] ?? 0;
}

export function addConsumable(inventory, key, amount = 1) {
  const total = countOf(inventory, key) + amount;
  if (total > MERCHANT.maxConsumable || total < 0) return false;
  inventory[key] = total;
  return true;
}

// La cible est-elle valable pour ce consommable ?
export function isValidTarget(key, target) {
  const def = CONSUMABLES[key];
  return def.target === 'deadAlly' ? !target.alive : target.alive;
}

/**
 * Applique l'effet d'un consommable à un héros (sans le retirer de l'inventaire).
 * Retourne un texte décrivant le résultat, ou null si la cible n'est pas valable.
 */
export function applyConsumable(key, target) {
  const { effect } = CONSUMABLES[key];
  if (!isValidTarget(key, target)) return null;
  const stats = getStats(target);
  const parts = [];
  if (effect.revivePct) {
    target.alive = true;
    target.statuses = [];
    target.hp = Math.max(1, Math.round(stats.pv * effect.revivePct / 100));
    parts.push(`revient à la vie (${target.hp} PV)`);
  }
  if (effect.healPct) parts.push(`+${heal(target, Math.max(1, Math.round(stats.pv * effect.healPct / 100)))} PV`);
  if (effect.resourcePct) {
    const before = target.res;
    gainResource(target, Math.round(stats.resMax * effect.resourcePct / 100));
    parts.push(`+${target.res - before} ressource`);
  }
  if (effect.cleanse) {
    const removed = statusesOf(target).filter((s) => s.kind === 'debuff').length;
    target.statuses = statusesOf(target).filter((s) => s.kind !== 'debuff');
    parts.push(removed ? `${removed} effet${removed > 1 ? 's' : ''} négatif${removed > 1 ? 's' : ''} retiré${removed > 1 ? 's' : ''}` : 'aucun effet négatif');
  }
  return parts.join(', ');
}
