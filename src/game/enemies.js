import { ENEMIES } from '../data/enemies.js';
import { zeroStats } from '../data/stats.js';
import { rand } from './rng.js';

const scaled = (def, level) => (def ? Math.round(def.base + def.perLevel * level) : 0);

// `power` : multiplicateur de difficulté des PV et de l'attaque (1 en Balade).
export function createEnemy(key, level, label, power = 1) {
  const def = ENEMIES[key];
  const pv = Math.round(scaled(def.pv, level) * power);
  const atq = Math.round(scaled(def.atq, level) * power);
  return {
    enemyKey: key,
    name: label ? `${def.name} ${label}` : def.name,
    icon: def.icon,
    boss: !!def.boss,
    magic: !!def.magic,
    row: def.ranged ? 'ranged' : 'melee',
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
      riposte: def.riposte ?? 0,
    },
    alive: true,
    guard: false,
    statuses: [],
  };
}

// Crée les ennemis d'une rencontre ; numérote les doublons (« Loup 1 », « Loup 2 »).
export function createEnemies(keys, level, power = 1) {
  const counts = {};
  keys.forEach((k) => { counts[k] = (counts[k] ?? 0) + 1; });
  const seen = {};
  return keys.map((k) => {
    seen[k] = (seen[k] ?? 0) + 1;
    return createEnemy(k, level, counts[k] > 1 ? seen[k] : null, power);
  });
}
