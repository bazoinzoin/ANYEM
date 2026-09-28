// Ce qui a changé pendant une action de combat (points de vie, chutes, relevés, nouveaux
// effets), pour l'animer sur la scène (ui/battleStage.js). Pur, testable sous Node.

import { statusesOf } from '../game/statuses.js';

// Photo des combattants avant une action.
export function snapshotBattle(cb) {
  const units = new Map();
  for (const u of [...cb.party, ...cb.enemies]) {
    units.set(u, { hp: u.hp, alive: u.alive, statuses: new Set(statusesOf(u)) });
  }
  return { units, logLength: cb.log.length };
}

// Changements depuis la photo : [{ unit, side, delta, died, revived, added }], et crit
// (un coup critique figure parmi les nouvelles lignes du journal).
export function diffBattle(cb, before) {
  const changes = [];
  for (const [unit, b] of before.units) {
    const change = {
      unit,
      side: cb.party.includes(unit) ? 'hero' : 'enemy',
      delta: unit.hp - b.hp,
      died: b.alive && !unit.alive,
      revived: !b.alive && unit.alive,
      added: statusesOf(unit).filter((s) => !b.statuses.has(s)),
    };
    if (change.delta || change.died || change.revived || change.added.length) changes.push(change);
  }
  const crit = cb.log.slice(before.logLength).some((l) => l.crit);
  return { changes, crit };
}

// Geste d'un héros pour une action : 'lunge' (bond et coup d'arme sur une cible),
// 'cast' (sort, soin, soutien, objet) ou null (défense, déplacement, fin de tour).
export function heroGesture(skill, action) {
  if (action.type === 'attack') return 'lunge';
  if (action.type === 'item') return 'cast';
  if (action.type !== 'skill' || !skill) return null;
  return skill.kind === 'damage' && !skill.magic && skill.target === 'enemy' ? 'lunge' : 'cast';
}

// Geste d'un ennemi, déduit de ce qui a changé : magie ou coup sur plusieurs héros = sort ;
// rien sur le camp adverse (soin, soutien) = sort ; sinon bond.
export function enemyGesture(enemy, diff) {
  const hurt = diff.changes.filter((c) => c.side === 'hero' && (c.delta < 0 || c.added.length));
  const helped = diff.changes.some((c) => c.side === 'enemy' && (c.delta > 0 || c.added.length));
  if (enemy.magic || hurt.length > 1) return 'cast';
  if (!hurt.length && helped) return 'cast';
  return 'lunge';
}

// ---- Effets visuels d'une action (dessinés par ui/battleStage.js) ----
//
// { style, projectile?, tint } :
//   style       'bolt' (projectile vers chaque cible), 'slash' (coup d'arme), 'heal', 'shield',
//               'buff', 'curse' (effets sans dégâts), ou null
//   projectile  planche du projectile (assets/fx/<nom>.png, impact : <nom>_impact.png, 3 images)
//   tint        couleur du halo de lancement et des éclats (sang, poison, os…)

// Élément d'une compétence, d'après son nom : [motif, projectile, teinte].
const ELEMENTS = [
  [/météore|pyroclasme|pluie de feu|mur de flammes/i, 'FireballBig', '#ff8a3a'],
  [/feu|flamme|brasier|immolation|ardent|incendi/i, 'Fireball', '#ff8a3a'],
  [/nova|blizzard|gel|givre|glace/i, 'IceShard', '#9fe0ff'],
  [/foudre|éclair|tempête|orage|choc/i, 'LightningBolt', '#fff27a'],
  [/âme|requiem|outre-tombe|décharné|funeste|nuée spectrale|mort/i, 'DeathCoil', '#bfe8e2'],
  [/ombre|douleur|fléau|profane|malédiction|ténèbres|confusion|terreur/i, 'DarkOrb', '#b27ae0'],
  [/lumière|sacré|jugement|aube|éclat|divin|croisé|hymne/i, 'EnergyBall', '#ffe28a'],
  [/sang|fièvre rouge|hémorragie|saignée|lacération|entaille|boucher/i, 'MagicMissile', '#e0424f'],
  [/poison|venin|toxine|peste|empoisonn/i, 'FaerieBall', '#8fe06a'],
];

function elementOf(name = '') {
  return ELEMENTS.find(([re]) => re.test(name)) ?? null;
}

// Tir à l'arme (arc) : flèche ; sinon coup au corps à corps.
const isBow = (hero) => hero?.equipment?.mainDroite?.weaponType === 'arc';

/**
 * Effet d'une action de héros. `skill` : compétence lancée (null pour une attaque, un objet…).
 */
export function actionFx(hero, skill, action) {
  if (action.type === 'attack') return isBow(hero) ? { style: 'bolt', projectile: 'Arrow', tint: '#fff4e0' } : { style: 'slash', tint: '#ffffff' };
  if (action.type === 'item') return { style: 'heal', tint: '#7ee07e' };
  if (action.type !== 'skill' || !skill) return { style: null };
  const el = elementOf(skill.name);
  const tint = el?.[2] ?? (skill.magic ? '#8fc8ff' : '#ffffff');
  if (skill.kind === 'heal' || skill.kind === 'revive') return { style: 'heal', tint: el?.[2] === '#e0424f' ? '#e0424f' : '#ffe28a' };
  if (skill.kind === 'support') {
    const effects = [...(skill.effects ?? []), ...(skill.selfEffects ?? [])].map((e) => e.id);
    if (effects.includes('bouclier')) return { style: 'shield', tint: '#9fd8ff' };
    return skill.target === 'enemy' || skill.target === 'allEnemies' ? { style: 'curse', tint: el?.[2] ?? '#b27ae0' } : { style: 'buff', tint: el?.[2] ?? '#ffd35a' };
  }
  if (skill.magic) return { style: 'bolt', projectile: el?.[1] ?? 'MagicMissile', tint };
  if (isBow(hero)) return { style: 'bolt', projectile: 'Arrow', tint };
  return { style: 'slash', tint };
}

/** Effet d'une action ennemie : capacité nommée (cb.lastSkill) ou attaque de base. */
export function enemyFx(enemy, skill) {
  const el = elementOf(skill?.name);
  if (skill?.kind === 'heal') return { style: 'heal', tint: '#7ee07e' };
  if (skill && skill.kind !== 'damage') return skill.target === 'hero' || skill.target === 'allHeroes' ? { style: 'curse', tint: el?.[2] ?? '#b27ae0' } : { style: 'buff', tint: el?.[2] ?? '#ffd35a' };
  if (skill?.magic || (!skill && enemy.magic)) return { style: 'bolt', projectile: el?.[1] ?? 'DarkOrb', tint: el?.[2] ?? '#d68cff' };
  if (enemy.ranged) return { style: 'bolt', projectile: 'Arrow', tint: '#fff4e0' };
  return { style: 'slash', tint: el?.[2] ?? '#ffffff' };
}
