// Statuts de combat (effets à durée) portés par une unité : unit.statuses = [statut].
// Chaque statut est une instance d'un effet du catalogue data/effects.js, créée par
// makeStatus() (les effets ne sont jamais définis ailleurs).
//
// Statut : { key, name, icon, kind: 'buff' | 'debuff', turns, ...effets }
//   mods     { stat: % }  modifie les stats en combat (ex. { vit: -30 } = ralenti)
//   dot      dégâts subis à la fin de chaque tour de l'unité (poison, saignement, brûlure…)
//   hot      soins reçus à la fin de chaque tour de l'unité
//   shield   points de bouclier : absorbent les dégâts avant les PV
//   stun     l'unité perd ses prochains tours (turns = nombre de tours perdus)
//   taunt    les ennemis doivent attaquer cette unité
//   confuse  l'unité peut frapper ses propres alliés
//   redirect % des dégâts reportés sur status.source (Intercession)
//   trap     dégâts d'un piège, déclenché au début du prochain tour de l'unité
// Un statut de même clé remplace le précédent (durée et valeur rafraîchies).
// Les durées (sauf étourdissement) baissent d'un à la fin de chaque tour de l'unité.

import { EFFECTS } from '../data/effects.js';

// Instance d'un effet du catalogue, pour `turns` tours ; `value` = dégâts/soins par
// tour ou points de bouclier pour les effets à valeur.
export function makeStatus(id, turns, value) {
  const def = EFFECTS[id];
  if (!def) throw new Error(`Effet inconnu : ${id}`);
  const status = { key: id, name: def.name, icon: def.icon, kind: def.kind, turns };
  if (def.mods) status.mods = def.mods;
  for (const flag of ['stun', 'taunt', 'confuse']) if (def[flag]) status[flag] = true;
  if (def.redirect) status.redirect = def.redirect;
  if (def.value) status[def.value] = value;
  return status;
}

export function statusesOf(unit) {
  if (!unit.statuses) unit.statuses = [];
  return unit.statuses;
}

export function addStatus(unit, status) {
  const list = statusesOf(unit);
  const i = list.findIndex((s) => s.key === status.key);
  if (i === -1) list.push({ ...status });
  else list[i] = { ...status };
}

export function hasStatus(unit, flag) {
  return statusesOf(unit).some((s) => s[flag]);
}

export function isDebuffed(unit) {
  return statusesOf(unit).some((s) => s.kind === 'debuff');
}

// Somme des modificateurs en % par stat.
export function statusMods(unit) {
  const mods = {};
  for (const s of statusesOf(unit)) {
    for (const [stat, pct] of Object.entries(s.mods ?? {})) mods[stat] = (mods[stat] ?? 0) + pct;
  }
  return mods;
}

// Les boucliers absorbent les dégâts en premier. Retourne la part absorbée.
export function absorbWithShields(unit, amount) {
  let absorbed = 0;
  for (const s of statusesOf(unit)) {
    if (!s.shield || absorbed >= amount) continue;
    const take = Math.min(s.shield, amount - absorbed);
    s.shield -= take;
    absorbed += take;
  }
  unit.statuses = statusesOf(unit).filter((s) => !('shield' in s) || s.shield > 0);
  return absorbed;
}

// Consomme un tour d'étourdissement. Retourne true si l'unité doit passer son tour.
export function consumeStun(unit) {
  const stun = statusesOf(unit).find((s) => s.stun);
  if (!stun) return false;
  stun.turns--;
  if (stun.turns <= 0) unit.statuses = statusesOf(unit).filter((s) => s !== stun);
  return true;
}

// Fin du tour de l'unité : liste des effets périodiques à appliquer, puis décompte des durées.
// Retourne [{ status, dot?, hot? }] ; l'appelant applique dégâts et soins.
// Un statut posé pendant le tour même de l'unité (`fresh`) n'est pas décompté à
// la fin de ce tour-là : un effet de 2 tours couvre bien 2 tours de l'unité.
export function tickStatuses(unit) {
  const due = statusesOf(unit).filter((s) => !s.fresh);
  for (const s of statusesOf(unit)) delete s.fresh;
  const ticks = due.filter((s) => s.dot || s.hot).map((s) => ({ status: s, dot: s.dot, hot: s.hot }));
  for (const s of due) if (!s.stun) s.turns--;
  unit.statuses = statusesOf(unit).filter((s) => s.stun || s.turns > 0);
  return ticks;
}

export function clearStatuses(unit) {
  unit.statuses = [];
}
