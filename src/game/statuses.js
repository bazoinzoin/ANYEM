// Statuts de combat (effets à durée) portés par une unité : unit.statuses = [statut].
//
// Statut : { key, name, icon, kind: 'buff' | 'debuff', turns, ...effets }
//   mods     { stat: % }  modifie les stats en combat (ex. { vit: -30 } = ralenti)
//   dot      dégâts infligés à chaque fin de round (poison, saignement, brûlure…)
//   hot      soins reçus à chaque fin de round
//   shield   points de bouclier : absorbent les dégâts avant les PV
//   stun     l'unité perd ses prochains tours (turns = nombre de tours perdus)
//   taunt    les ennemis doivent attaquer cette unité
//   confuse  l'unité peut frapper ses propres alliés
// Un statut de même clé remplace le précédent (durée et valeur rafraîchies).
// Les durées (sauf étourdissement) baissent d'un à chaque fin de round.

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

// Fin de round : liste des effets périodiques à appliquer, puis décompte des durées.
// Retourne [{ status, dot?, hot? }] ; l'appelant applique dégâts et soins.
export function tickStatuses(unit) {
  const ticks = statusesOf(unit).filter((s) => s.dot || s.hot).map((s) => ({ status: s, dot: s.dot, hot: s.hot }));
  for (const s of statusesOf(unit)) if (!s.stun) s.turns--;
  unit.statuses = statusesOf(unit).filter((s) => s.stun || s.turns > 0);
  return ticks;
}

export function clearStatuses(unit) {
  unit.statuses = [];
}
