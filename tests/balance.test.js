// Équilibrage des classes : chaque orientation joue seule (IA simple, équipement rare de
// son niveau, talents de l'orientation) contre une cible inoffensive, et l'on compare les
// dégâts moyens par round. Les orientations de dégâts doivent rester proches les unes des
// autres ; les tanks et les hybrides en dessous. Voir aussi docs/PROJECT_STATUS.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createParty, getStats, getSkills } from '../src/game/party.js';
import { createCombat, nextTurn, heroAct, enemyAct, canUseSkill, effectiveSkill } from '../src/game/combat.js';
import { learn, branchesOf, tiersOf } from '../src/game/talents.js';
import { generateItem } from '../src/game/items.js';
import { equip } from '../src/game/equipment.js';
import { statsOf } from '../src/game/units.js';
import { estimateSkill, estimateHit, effectValue, BASIC_ATTACK } from '../src/game/formulas.js';
import { actionCost } from '../src/game/combo.js';
import { EFFECTS } from '../src/data/effects.js';
import { CHOICE_PICKS } from '../src/data/talents.js';
import { setRandomSource } from '../src/game/rng.js';

// Orientation → [stat principale, armure, armes].
const GEAR = {
  gardien: ['force', 'lourde', ['epee', 'bouclier']], berserker: ['force', 'moyenne', ['hache2m']],
  assassin: ['agilite', 'moyenne', ['dague', 'dague']], empoisonneur: ['agilite', 'moyenne', ['dague', 'dague']],
  precheur: ['intelligence', 'legere', ['baton']], profane: ['intelligence', 'legere', ['baton']],
  feu: ['intelligence', 'legere', ['baton']], glace: ['intelligence', 'legere', ['baton']], foudre: ['intelligence', 'legere', ['baton']],
  oeilDeFaucon: ['agilite', 'moyenne', ['arc']], traqueur: ['agilite', 'moyenne', ['arc']],
  templier: ['force', 'lourde', ['masse', 'bouclier']],
  acharne: ['force', 'moyenne', ['hache2m']], violent: ['force', 'moyenne', ['arc']],
};
const CLASS_OF = {
  gardien: 'guerrier', berserker: 'guerrier', assassin: 'voleur', empoisonneur: 'voleur', precheur: 'pretre', profane: 'pretre',
  feu: 'mage', glace: 'mage', foudre: 'mage', oeilDeFaucon: 'chasseur', traqueur: 'chasseur', templier: 'paladin',
  acharne: 'scarifie', violent: 'scarifie',
};
const DPS = ['berserker', 'assassin', 'empoisonneur', 'profane', 'feu', 'glace', 'foudre', 'oeilDeFaucon', 'traqueur', 'acharne', 'violent'];

// Petit palier : le bonus offensif le plus utile.
const weight = (n) => (n.pct?.physPower || n.pct?.magPower ? 3 : 0) + (n.passive?.dotPct ? 2.5 : 0) + (n.flat?.critChance ? 2 : 0)
  + (n.flat?.critDmg ? 1.5 : 0) + (n.passive?.vsDebuffedPct ? 2 : 0) + (n.passive?.resRegen ? 1.2 : 0) + (n.passive?.executePct ? 1 : 0);

function makeHero(key, level) {
  const [hero] = createParty([key], [CLASS_OF[key]]);
  hero.level = level;
  hero.equipment = {};
  const [primary, armorType, weapons] = GEAR[key];
  if (weapons.includes('arc')) hero.position = 'ranged'; // tir depuis la ligne arrière
  const bag = [];
  // Objets rares sans secondaires : les secondaires, tirées au hasard, ne doivent pas
  // décider de l'équilibrage (on compare les kits de compétences, pas la chance au butin).
  const put = (opts, slot) => { const it = { ...generateItem({ level, rarity: 'rare', primary, ...opts }), bonus: {} }; bag.push(it); equip(hero, bag, it, slot); };
  for (const slot of ['casque', 'epaulieres', 'plastron', 'gants', 'bottes']) put({ slotType: slot, armorType }, slot);
  put({ slotType: 'collier' }, 'collier');
  put({ slotType: 'anneau' }, 'anneau1');
  put({ slotType: 'anneau' }, 'anneau2');
  weapons.forEach((w, i) => put(w === 'bouclier' ? { slotType: 'bouclier' } : { slotType: 'arme', weaponType: w }, i ? 'mainGauche' : 'mainDroite'));
  const branch = branchesOf(hero).find((b) => b.key === key);
  for (const t of tiersOf(branch)) {
    const nodes = branch.nodes.filter((n) => n.tier === t);
    for (const node of [...nodes].sort((a, b) => weight(b) - weight(a)).slice(0, CHOICE_PICKS)) while (learn(hero, node.id));
  }
  return hero;
}

const avg = (e) => (e ? (e.lo + e.hi) / 2 : 0);
function value(cb, hero, skill, target) {
  const st = statsOf(hero);
  const s = effectiveSkill(hero, skill);
  let v = s.kind === 'damage' ? avg(estimateSkill(st, s, statsOf(target))) * (s.hits ?? 1) : 0;
  for (const e of s.effects ?? []) {
    const kind = EFFECTS[e.id]?.value;
    if (kind !== 'dot' && kind !== 'trap') continue;
    const has = target.statuses.find((x) => x.key === e.id);
    // Effet cumulable (poison) : une dose de plus compte en entier tant qu'il reste de la place.
    const stacking = has && EFFECTS[e.id].stacks && (has.doses?.length ?? 1) < EFFECTS[e.id].stacks;
    v += (effectValue(st, s, e) ?? 0) * (kind === 'dot' ? e.turns : 1) * (has && !stacking ? Math.max(0, e.turns - has.turns) / e.turns : 1);
  }
  // Poison foudroyant : les dégâts arrivent plus tôt ; intéressant quand toutes les doses sont
  // posées (on peut en reposer ensuite).
  if (s.detonate) {
    const has = target.statuses.find((x) => x.key === s.detonate);
    if (has && (has.doses?.length ?? 1) >= (EFFECTS[s.detonate].stacks ?? 1)) v += has.dot * has.turns * 0.5;
  }
  return v;
}

// IA : le meilleur coup (rapport dégâts / Énergie pour les classes à Énergie), un
// générateur de combo valant aussi ce qu'il apporte au finisher.
function play(cb, hero) {
  const multi = ['voleur', 'chasseur'].includes(hero.classKey);
  for (let n = 0; n < 12 && cb.acting?.unit === hero; n++) {
    const target = cb.enemies[0];
    const full = (s) => s.fullAt ?? 4;
    // Au-delà du nombre de points où le finisher est à pleine puissance, un point ne sert plus.
    const cap = Math.max(0, ...getSkills(hero).filter((s) => s.finisher).map(full));
    const perPoint = (hero.combo ?? 0) >= cap ? 0 : Math.max(0, ...getSkills(hero).filter((s) => s.finisher).map((s) => {
      const saved = hero.combo;
      hero.combo = full(s);
      const v = value(cb, hero, s, target) / full(s);
      hero.combo = saved;
      return v;
    }));
    const options = getSkills(hero).map((s, i) => [s, i])
      .filter(([s]) => canUseSkill(cb, hero, s) && ['enemy', 'allEnemies'].includes(s.target) && (!s.finisher || (hero.combo ?? 0) >= full(s)))
      .map(([s, i]) => ({ act: { type: 'skill', skill: i, target: 0 }, cost: s.cost, v: value(cb, hero, s, target) + (s.comboGain ? perPoint * s.comboGain : 0) }));
    options.push({ act: { type: 'attack', target: 0 }, cost: actionCost(hero, 'attack') || 1, v: avg(estimateHit(statsOf(hero), BASIC_ATTACK, statsOf(target))) });
    options.sort((a, b) => (multi ? b.v / Math.max(10, b.cost) - a.v / Math.max(10, a.cost) : b.v - a.v));
    if (!options.some((o) => heroAct(cb, o.act))) {
      if (cb.acting?.unit === hero) heroAct(cb, { type: 'endTurn' });
      return;
    }
  }
}

// Dégâts moyens par round sur 10 rounds, sur deux tirages d'équipement.
export function dps(key, level) {
  let sum = 0;
  for (const s0 of SEEDS) {
    let seed = s0;
    setRandomSource(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    const hero = makeHero(key, level);
    const cb = createCombat({ party: [hero], enemies: ['orque'], level });
    const [dummy] = cb.enemies;
    Object.assign(dummy.stats, { pv: 1e8, atq: 0, defMag: dummy.stats.def });
    dummy.hp = 1e8;
    dummy.enemyKey = 'mannequin';
    for (let t = nextTurn(cb); t && cb.round <= 10; t = nextTurn(cb)) {
      if (t.side === 'hero') play(cb, t.unit);
      else { enemyAct(cb); hero.hp = getStats(hero).pv; }
    }
    sum += (1e8 - dummy.hp) / 10;
  }
  setRandomSource(Math.random);
  return sum / SEEDS.length;
}

export let SEEDS = [7, 108];
export const setSeeds = (s) => { SEEDS = s; };
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test('équilibrage : au niveau 50, les orientations de dégâts restent à ±20 % les unes des autres', () => {
  const d = Object.fromEntries(DPS.map((k) => [k, dps(k, 50)]));
  const m = median(Object.values(d));
  for (const [k, v] of Object.entries(d)) assert.ok(v > m * 0.8 && v < m * 1.2, `${k} : ${Math.round(v)} (médiane ${Math.round(m)})`);
  // Hybrides et tanks : moins de dégâts, mais pas négligeables.
  for (const k of ['precheur', 'templier', 'gardien']) {
    const v = dps(k, 50);
    assert.ok(v < m && v > m * 0.25, `${k} : ${Math.round(v)} (médiane ${Math.round(m)})`);
  }
});

test('équilibrage : au niveau 25, l\'Empoisonneur n\'est plus à la traîne ; aucune orientation de dégâts ne décroche', () => {
  const d = Object.fromEntries(DPS.map((k) => [k, dps(k, 25)]));
  const m = median(Object.values(d));
  for (const [k, v] of Object.entries(d)) assert.ok(v > m * 0.75 && v < m * 1.35, `${k} : ${Math.round(v)} (médiane ${Math.round(m)})`);
  assert.ok(d.empoisonneur >= m * 0.9, `Empoisonneur : ${Math.round(d.empoisonneur)} (médiane ${Math.round(m)})`);
});
