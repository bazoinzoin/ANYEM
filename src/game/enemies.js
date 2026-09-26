import { ENEMIES } from '../data/enemies.js';
import { zeroStats } from '../data/stats.js';
import { rand } from './rng.js';

const scaled = (def, level) => (def ? def.base + def.perLevel * level : 0);

export function createEnemy(key, level, label) {
  const def = ENEMIES[key];
  const pv = scaled(def.pv, level);
  return {
    enemyKey: key,
    name: label ? `${def.name} ${label}` : def.name,
    icon: def.icon,
    hp: pv,
    stats: {
      ...zeroStats(),
      critDmg: 50,
      pv,
      atq: scaled(def.atq, level),
      physPower: scaled(def.atq, level),
      magPower: scaled(def.atq, level),
      def: scaled(def.def, level),
      defMag: scaled(def.defMag, level),
      vit: Math.round(rand(def.vit.min, def.vit.max)),
    },
    alive: true,
    guard: false,
    bleed: 0,
  };
}
