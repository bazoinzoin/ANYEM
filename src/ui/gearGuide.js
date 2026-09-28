// Guide d'équipement : ce que porte chaque orientation (stat conseillée, armure, armes), pour
// les écrans Personnage et Création. Les limites viennent de la classe (`gear`) et, quand elle
// en fixe, de l'orientation (`gear` de data/talents.js, appliqué à l'orientation du héros).

import { CLASSES } from '../data/classes.js';
import { TALENTS } from '../data/talents.js';
import { STATS } from '../data/stats.js';
import { ARMOR_TYPES, WEAPON_TYPES } from '../data/items.js';
import { mainBranch } from '../game/talents.js';
import { esc } from './html.js';

// « épée, hache ou masse (une ou deux mains) », « bâton »…
export function weaponsText(weapons) {
  const bases = [];
  for (const w of weapons) {
    const base = w.replace(/2m$/, '');
    let entry = bases.find((b) => b.base === base);
    if (!entry) bases.push(entry = { base, one: false, two: false });
    if (w.endsWith('2m')) entry.two = true;
    else entry.one = true;
  }
  const name = (b) => (WEAPON_TYPES[b.base] ?? WEAPON_TYPES[`${b.base}2m`]).name.toLowerCase().replace(/ à deux mains$/, '');
  const groups = [
    [bases.filter((b) => b.one && b.two), ' (une ou deux mains)'],
    [bases.filter((b) => b.one && !b.two), ''],
    [bases.filter((b) => !b.one && b.two), ' à deux mains'],
  ].filter(([list]) => list.length);
  return groups.map(([list, suffix]) => orList(list.map(name)) + suffix).join(' ; ');
}

function orList(words) {
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} ou ${words[words.length - 1]}` : words[0] ?? '';
}

/**
 * Équipement d'une orientation : { stat, armor, weapons, offHand, limited } (textes) ;
 * limited = l'orientation restreint l'équipement de la classe quand elle est principale.
 */
export function branchGear(classKey, branch) {
  const cls = CLASSES[classKey];
  const g = branch.gear ?? {};
  const keep = (list, only) => (only ? list.filter((x) => only.includes(x)) : list);
  const armor = keep(cls.gear.armor, g.armor);
  const weapons = keep(cls.gear.weapons, g.weapons);
  const off = keep(cls.gear.offHand, g.offHand);
  const offWeapons = off.filter((x) => x !== 'bouclier');
  return {
    stat: STATS[g.stat ?? cls.mainStat].label,
    armor: orList(armor.map((a) => ARMOR_TYPES[a].label.replace('Armure ', 'armure '))),
    weapons: weaponsText(weapons),
    offHand: [off.includes('bouclier') ? 'bouclier' : '', offWeapons.length ? `une 2e arme (${weaponsText(offWeapons)})` : ''].filter(Boolean).join(' ou '),
    limited: !!(g.armor || g.weapons || g.offHand),
  };
}

// Une ligne : « Gardien — Force · armure lourde · épée, hache… + bouclier ».
export function branchGearLine(classKey, branch) {
  const g = branchGear(classKey, branch);
  return `${g.stat} · ${g.armor} · ${g.weapons}${g.offHand ? ` + ${g.offHand}` : ''}`;
}

// Arme demandée par une compétence : « Arme : dague ou épée », « Neutre : n'importe quelle arme ».
export function skillGearText(skill) {
  const shield = skill.needsShield ? ' + bouclier' : '';
  if (!skill.weapons) return `Neutre : se lance avec n'importe quelle arme${shield}`;
  return `Arme : ${weaponsText(skill.weapons)}${shield}`;
}

// Stat conseillée du héros : celle de son orientation principale (sinon celle de la classe).
export function preferredStat(hero) {
  return mainBranch(hero)?.gear?.stat ?? CLASSES[hero.classKey].mainStat;
}

/**
 * Bloc de l'écran Personnage : orientation principale, ce qu'elle permet de porter et la stat
 * à chercher sur les objets ; les autres orientations en dessous, en petit.
 */
export function gearGuideHtml(hero) {
  const branches = TALENTS[hero.classKey] ?? [];
  const main = mainBranch(hero);
  const anyLimit = branches.some((b) => branchGear(hero.classKey, b).limited);
  const head = main
    ? `<b>${esc(main.name)}</b> : cherchez la <b>${esc(branchGear(hero.classKey, main).stat)}</b>.`
    : "Pas encore d'orientation (aucun point de talent) : tout l'équipement de la classe est permis.";
  return `
    <div class="gear-guide">
      <p>${head}</p>
      <ul>${branches.map((b) => `<li class="${b === main ? 'current' : ''}"><b>${esc(b.name)}</b> — ${esc(branchGearLine(hero.classKey, b))}</li>`).join('')}</ul>
      <p class="hint">Un héros ne suit qu'une orientation : elle décide de ses armes${anyLimit ? ' et de son armure' : ''}.</p>
    </div>`;
}
