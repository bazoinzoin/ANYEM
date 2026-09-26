// Outils partagés par les tests.

import { branchesOf } from '../src/game/talents.js';
import { nodeSkills } from '../src/data/talents.js';

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
