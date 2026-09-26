import { ENEMIES } from '../data/enemies.js';
import { rand } from './rng.js';

export function createEnemy(key, level, label) {
  const def = ENEMIES[key];
  const pv = def.pv.base + def.pv.perLevel * level;
  return {
    enemyKey: key,
    name: label ? `${def.name} ${label}` : def.name,
    icon: def.icon,
    hp: pv,
    stats: {
      pv,
      atq: def.atq.base + def.atq.perLevel * level,
      vit: Math.round(rand(def.vit.min, def.vit.max)),
    },
    alive: true,
    guard: false,
    bleed: 0,
  };
}
