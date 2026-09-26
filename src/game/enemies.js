import { ENEMIES } from '../data/enemies.js';
import { zeroStats } from '../data/stats.js';
import { rand } from './rng.js';

const scaled = (def, level) => (def ? Math.round(def.base + def.perLevel * level) : 0);

export function createEnemy(key, level, label) {
  const def = ENEMIES[key];
  const pv = scaled(def.pv, level);
  const atq = scaled(def.atq, level);
  return {
    enemyKey: key,
    name: label ? `${def.name} ${label}` : def.name,
    icon: def.icon,
    boss: !!def.boss,
    magic: !!def.magic,
    hp: pv,
    stats: {
      ...zeroStats(),
      critDmg: 50,
      pv,
      atq,
      physPower: atq,
      magPower: atq,
      def: scaled(def.def, level),
      defMag: scaled(def.defMag, level),
      vit: Math.round(rand(def.vit.min, def.vit.max)),
    },
    alive: true,
    guard: false,
    statuses: [],
  };
}

// Crée les ennemis d'une rencontre ; numérote les doublons (« Loup 1 », « Loup 2 »).
export function createEnemies(keys, level) {
  const counts = {};
  keys.forEach((k) => { counts[k] = (counts[k] ?? 0) + 1; });
  const seen = {};
  return keys.map((k) => {
    seen[k] = (seen[k] ?? 0) + 1;
    return createEnemy(k, level, counts[k] > 1 ? seen[k] : null);
  });
}
