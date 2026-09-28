// Consommables : inventaire (game.consumables = { clé: quantité }) et effets.
// Utilisation en combat : combat.js (action « Objet ») ; entre deux étages : useOnMap().

import { DUNGEONS } from '../data/dungeons.js';
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

export function usableIn(key, place) {
  return CONSUMABLES[key].use.includes(place);
}

// Sans cible individuelle (toute l'équipe, ou effet global).
export function isUntargeted(key) {
  return ['party', 'none'].includes(CONSUMABLES[key].target);
}

// Effets négatifs du héros que ce consommable retirerait.
function curedStatuses(key, hero) {
  const { effect } = CONSUMABLES[key];
  return statusesOf(hero).filter((s) => s.kind === 'debuff' && (effect.cleanse || effect.cure?.includes(s.key)));
}

// La cible est-elle valable ? Un remède ne vise que les héros qui ont un effet
// qu'il guérit (pour ne pas le gaspiller).
export function isValidTarget(key, target) {
  const def = CONSUMABLES[key];
  if (def.target === 'deadAlly') return !target.alive;
  if (def.target !== 'ally' || !target.alive) return false;
  if (def.effect.cure || def.effect.cleanse) return curedStatuses(key, target).length > 0;
  return true;
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
  if (effect.cure || effect.cleanse) {
    const removed = curedStatuses(key, target);
    target.statuses = statusesOf(target).filter((s) => !removed.includes(s));
    parts.push(`${removed.map((s) => s.name).join(', ')} retiré${removed.length > 1 ? 's' : ''}`);
  }
  return parts.join(', ');
}

// Tente : PV et ressource restaurés pour chaque héros en vie.
export function restoreParty(party, pct) {
  for (const hero of party.filter((h) => h.alive)) {
    const stats = getStats(hero);
    hero.hp = Math.min(stats.pv, hero.hp + Math.round(stats.pv * pct / 100));
    hero.res = Math.min(stats.resMax, hero.res + Math.round(stats.resMax * pct / 100));
  }
}

// Palier du donjon de l'étage à venir (0 = étages 1 à 5…), sans dépendre de game/dungeon.js.
function tierIndex(exp) {
  return Math.floor((exp.floor - 1) / DUNGEONS[exp.dungeonKey].bossEvery);
}

// Un consommable « une fois par palier » déjà utilisé dans le palier en cours ?
export function usedThisTier(game, key) {
  const exp = game.expedition;
  return !!(exp && CONSUMABLES[key]?.effect.oncePerTier && exp.usedPerTier?.[key] === tierIndex(exp));
}

/**
 * Utilise un consommable entre deux étages d'un donjon (`game.expedition` actif).
 * targetIndex : index du héros visé (ignoré pour la Tente).
 * Retourne { ok, message } ; ok = false si l'utilisation est impossible.
 */
export function useOnMap(game, key, targetIndex) {
  const def = CONSUMABLES[key];
  if (!def || !game.expedition || !usableIn(key, 'map') || countOf(game.consumables, key) <= 0) return { ok: false };
  let message;
  if (def.effect.restorePartyPct) {
    if (!game.party.some((h) => h.alive)) return { ok: false };
    if (def.effect.oncePerTier) {
      const tier = tierIndex(game.expedition);
      if (game.expedition.usedPerTier?.[key] === tier) return { ok: false, message: `${def.name} : déjà utilisée dans ce palier.` };
      game.expedition.usedPerTier = { ...game.expedition.usedPerTier, [key]: tier };
    }
    restoreParty(game.party, def.effect.restorePartyPct);
    message = `${def.name} : l'équipe se repose (+${def.effect.restorePartyPct} % de PV et de ressource).`;
  } else {
    const target = game.party[targetIndex];
    const result = target ? applyConsumable(key, target) : null;
    if (result === null) return { ok: false };
    message = `${def.name} sur ${target.name} : ${result}.`;
  }
  game.consumables[key]--;
  return { ok: true, message };
}
