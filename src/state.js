// État global du jeu (source de vérité unique, lue par l'interface).

import { START_GOLD, START_DUNGEON_LEVEL } from './config.js';
import { emptyMateria } from './game/forge.js';
import { startingConsumables } from './game/consumables.js';

export const state = {
  screen: 'create',     // 'create' | 'hub' | 'stats' | 'equipment' | 'forge' | 'talents' | 'merchant' | 'combat'
  party: [],
  bag: [],              // objets non équipés, partagés par l'équipe
  materia: emptyMateria(), // { arme: { commun: n, … }, armure: { … } }
  consumables: startingConsumables(), // { potion: n, … } (voir data/consumables.js)
  shop: null,           // stock du Marchand : { level, stock: [objets] }
  gold: START_GOLD,
  dungeonLvl: START_DUNGEON_LEVEL,
  combat: null,
  hubMessage: null,     // message affiché une seule fois à l'arrivée au village
  hubLoot: [],          // objets obtenus, affichés avec ce message
};
