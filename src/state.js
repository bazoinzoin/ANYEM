// État global du jeu (source de vérité unique, lue par l'interface).

import { START_GOLD, START_DUNGEON_LEVEL } from './config.js';

export const state = {
  screen: 'create',     // 'create' | 'hub' | 'stats' | 'equipment' | 'combat'
  party: [],
  bag: [],              // objets non équipés, partagés par l'équipe
  gold: START_GOLD,
  dungeonLvl: START_DUNGEON_LEVEL,
  combat: null,
  hubMessage: null,     // message affiché une seule fois à l'arrivée au village
  hubLoot: [],          // objets obtenus, affichés avec ce message
};
