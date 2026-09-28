// Sauvegardes, sans DOM : une sauvegarde = une aventure (l'état de la partie à un instant).
// On peut sauvegarder n'importe quand, même en plein combat : l'état contient des objets
// partagés (le combat pointe sur les héros de l'équipe, la file de tours sur les unités…),
// donc on encode un graphe (`encodeGraph`) et non un simple JSON, pour retrouver ces liens
// au chargement. Le stockage (emplacements 1 à 4) est fait par ui/saves.js.

import { CLASSES } from '../data/classes.js';
import { DUNGEONS } from '../data/dungeons.js';
import { DIFFICULTIES } from '../config.js';
import { reserveItemIds, refreshLegendary } from './items.js';
import { difficultyOf } from './difficulty.js';
import { sanitizeTalents } from './talents.js';

export const SAVE_VERSION = 1;
export const SAVE_SLOTS = 4;

// Champs de l'état enregistrés (le reste est de l'interface).
export const SAVED_FIELDS = [
  'party', 'reserve', 'bank', 'bag', 'materia', 'consumables', 'shop', 'gold', 'difficulty',
  'dungeonLvl', 'bestiary', 'dungeons', 'expedition', 'combat', 'lastCombat', 'screen',
];

// ---- Graphe d'objets ----
//
// Chaque objet ou tableau reçoit un numéro ; une valeur qui le désigne devient { $r: n }.
// Les nombres non finis et `undefined` dans un tableau sont notés { $n: 'NaN' | … }.

export function encodeGraph(root) {
  const ids = new Map();
  const nodes = [];
  const enc = (v) => {
    if (v === undefined) return { $n: 'undefined' };
    if (typeof v === 'number' && !Number.isFinite(v)) return { $n: String(v) };
    if (v === null || typeof v !== 'object') return v;
    if (ids.has(v)) return { $r: ids.get(v) };
    const id = nodes.length;
    ids.set(v, id);
    nodes.push(null);
    if (Array.isArray(v)) nodes[id] = { a: v.map(enc) };
    else {
      const o = {};
      for (const [k, x] of Object.entries(v)) if (typeof x !== 'function' && x !== undefined) o[k] = enc(x);
      nodes[id] = { o };
    }
    return { $r: id };
  };
  const root$ = enc(root);
  return { root: root$, nodes };
}

export function decodeGraph({ root, nodes }) {
  const built = nodes.map((n) => (n.a ? [] : {}));
  const dec = (v) => {
    if (v === null || typeof v !== 'object') return v;
    if ('$r' in v) return built[v.$r];
    if ('$n' in v) return v.$n === 'undefined' ? undefined : Number(v.$n);
    return v;
  };
  nodes.forEach((n, i) => {
    if (n.a) n.a.forEach((x) => built[i].push(dec(x)));
    else for (const [k, x] of Object.entries(n.o)) built[i][k] = dec(x);
  });
  return dec(root);
}

// ---- Sauvegarde ----

// Où en est l'aventure (texte court pour la liste des sauvegardes).
export function whereText(game) {
  const exp = game.expedition;
  if (exp) return `${DUNGEONS[exp.dungeonKey]?.name ?? 'Donjon'}, étage ${exp.floor}${game.combat ? ' (en combat)' : ''}`;
  return 'Au village';
}

// Résumé affiché sans charger la partie.
export function saveSummary(game) {
  return {
    party: game.party.map((h) => ({ name: h.name, classKey: h.classKey, level: h.level, look: h.look })),
    gold: game.gold,
    difficulty: DIFFICULTIES[difficultyOf(game)].name,
    where: whereText(game),
    zones: Object.values(game.dungeons ?? {}).filter((d) => d.cleared).length,
  };
}

// Sauvegarde de `game` : { version, savedAt, summary, data }. `savedAt` : date (ms).
export function makeSave(game, savedAt = Date.now()) {
  const data = Object.fromEntries(SAVED_FIELDS.map((k) => [k, game[k]]));
  return { version: SAVE_VERSION, savedAt, summary: saveSummary(game), data: encodeGraph(data) };
}

// Remplace l'aventure en cours de `game` par la sauvegarde. Retourne false si elle est illisible.
export function applySave(game, save) {
  if (!save || save.version !== SAVE_VERSION || !save.data) return false;
  let data;
  try {
    data = decodeGraph(save.data);
  } catch {
    return false;
  }
  if (!Array.isArray(data?.party) || !data.party.every((h) => CLASSES[h.classKey])) return false;
  for (const k of SAVED_FIELDS) game[k] = data[k] ?? game[k];
  game.hubMessage = null;
  game.hubLoot = [];
  game.defeat = null;
  // Arbres de talents modifiés depuis la sauvegarde : points rendus aux héros concernés.
  const reset = [...game.party, ...(game.reserve ?? [])].filter((h) => sanitizeTalents(h)).map((h) => h.name);
  if (reset.length) game.hubMessage = `Les arbres de talents ont changé : les points de ${reset.join(', ')} ont été rendus (à redépenser chez le Maître des compétences).`;
  // Les nouveaux objets ne doivent pas reprendre un identifiant déjà utilisé ; les
  // légendaires reprennent le nom et le pouvoir du catalogue actuel.
  const items = itemsIn(data);
  items.forEach(refreshLegendary);
  reserveItemIds(items.reduce((max, it) => Math.max(max, Number(it.id.slice(2))), 0));
  return true;
}

// Tous les objets (identifiant « itN ») de la partie, une fois chacun.
function itemsIn(root) {
  const items = [];
  const seen = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (typeof v.id === 'string' && /^it\d+$/.test(v.id)) items.push(v);
    Object.values(v).forEach(walk);
  };
  walk(root);
  return items;
}
