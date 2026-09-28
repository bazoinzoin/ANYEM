// Outils partagés par les tests.

import { branchesOf, learn, tiersOf } from '../src/game/talents.js';
import { nodeSkills, CHOICE_PICKS, SIGNATURE_TIER } from '../src/data/talents.js';
import { generateItem, isTwoHanded } from '../src/game/items.js';

// Donne à chaque héros les sorts de départ de toutes ses orientations (palier 0),
// sans dépenser de points : l'ordre des compétences reproduit celui des anciennes
// compétences de classe (ex. Voleur : Coup Vicieux, Éviscération, Lacération).
export function learnStarters(heroes) {
  for (const hero of heroes) {
    for (const branch of branchesOf(hero)) {
      const node = branch.nodes.find((n) => n.tier === 0 && nodeSkills(n).length);
      hero.talents = { ...hero.talents, [node.id]: 1 };
    }
  }
  return heroes;
}

// Apprend l'orientation `branchKey` jusqu'au palier `upTo` (inclus), sans limite de
// points : gros paliers, et pour chaque petit palier les bonus cités dans `pick` (complétés
// par les premiers des trois) jusqu'à CHOICE_PICKS, à leur rang maximum.
export function learnPath(hero, branchKey, { upTo = SIGNATURE_TIER, pick = [] } = {}) {
  const branch = branchesOf(hero).find((b) => b.key === branchKey);
  // Une seule orientation par héros : les points posés ailleurs (learnStarters…) sont retirés.
  for (const other of branchesOf(hero).filter((b) => b !== branch)) for (const n of other.nodes) delete hero.talents?.[n.id];
  const level = hero.level;
  hero.level = 999;
  for (const tier of tiersOf(branch).filter((t) => t <= upTo)) {
    const nodes = branch.nodes.filter((n) => n.tier === tier);
    const chosen = nodes.length === 1 ? nodes
      : [...nodes.filter((n) => pick.includes(n.id)), ...nodes.filter((n) => !pick.includes(n.id))].slice(0, CHOICE_PICKS);
    for (const node of chosen) while (learn(hero, node.id));
  }
  hero.level = level;
  armFor(hero, branch);
  return hero;
}

// Met en main l'arme de l'orientation (et son bouclier) si le héros n'en tient pas une :
// ses compétences à l'arme en ont besoin (voir skillWeaponProblem, game/position.js).
export function armFor(hero, branch) {
  const gear = branch.gear ?? {};
  const main = hero.equipment.mainDroite;
  if (gear.weapons && !(main && gear.weapons.includes(main.weaponType))) {
    const primary = gear.stat ?? 'force';
    hero.equipment.mainDroite = generateItem({ level: 1, rarity: 'commun', slotType: 'arme', weaponType: gear.weapons[0], primary });
    if (isTwoHanded(hero.equipment.mainDroite)) delete hero.equipment.mainGauche;
  }
  if (gear.offHand?.includes('bouclier') && !hero.equipment.mainGauche && !isTwoHanded(hero.equipment.mainDroite)) {
    hero.equipment.mainGauche = generateItem({ level: 1, rarity: 'commun', slotType: 'bouclier', primary: gear.stat ?? 'force' });
  }
}

// ---- Expédition sur carte (voir game/dungeon.js) ----

import { floorCombat, winFight, takeLadder } from '../src/game/dungeon.js';
import { createCombat } from '../src/game/combat.js';

// Engage le premier groupe de monstres de la carte (le boss en dernier) et gagne le
// combat sans le jouer. Retourne le résultat de winFight.
export function winNextFight(game, { boss = false } = {}) {
  const exp = game.expedition;
  const mobs = exp.map.mobs.filter((m) => m.boss === boss);
  exp.engaged = (mobs[0] ?? exp.map.mobs[0]).id;
  const cb = createCombat({ party: game.party, ...floorCombat(game) });
  cb.enemies.forEach((e) => { e.alive = false; e.hp = 0; });
  return winFight(game, cb);
}

// Franchit l'étage : bat tous les groupes (boss compris) ; à un étage ordinaire, se
// place sur l'échelle et descend. Retourne le dernier résultat de combat.
export function clearFloor(game) {
  const exp = game.expedition;
  exp.event = null;
  let r = null;
  while (exp.map.mobs.some((m) => !m.boss)) r = winNextFight(game);
  if (exp.map.mobs.some((m) => m.boss)) return winNextFight(game, { boss: true });
  exp.map.party = { ...exp.map.ladder };
  takeLadder(game);
  return r;
}
