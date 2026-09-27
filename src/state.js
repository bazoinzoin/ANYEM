// État global du jeu (source de vérité unique, lue par l'interface).

import { START_GOLD, START_DUNGEON_LEVEL } from './config.js';
import { emptyMateria } from './game/forge.js';
import { startingConsumables } from './game/consumables.js';

export const state = {
  screen: 'title',      // 'title' (menu principal) | 'create' | 'hub' | 'stats' | 'equipment' | 'forge' | 'talents' | 'merchant' | 'dungeon' | 'combat' | 'strategy' | 'inn' | 'bank'
  party: [],            // l'équipe : 4 héros
  reserve: [],          // compagnons au repos à l'auberge (voir game/roster.js)
  bank: null,           // coffre de la banque : { gold, items, consumables, materia } (voir game/bank.js)
  bag: [],              // objets non équipés, partagés par l'équipe
  materia: emptyMateria(), // matéria du sac : { arme: { commun: n, … }, armure: { … } }
  consumables: startingConsumables(), // { potion: n, … } (voir data/consumables.js)
  shop: null,           // stock du Marchand : { level, stock: [objets] }
  gold: START_GOLD,
  difficulty: 'balade', // voir DIFFICULTIES (config.js) et game/difficulty.js
  dungeonLvl: START_DUNGEON_LEVEL, // plus haut niveau d'étage atteint
  bestiary: {},         // ennemis rencontrés : { clé: { seen, kills } } (voir game/bestiary.js)
  dungeons: {},         // progression par donjon : { checkpoint, cleared } (voir game/dungeon.js)
  expedition: null,     // expédition en cours : { dungeonKey, floor, canLeave, bossChoice, gains }
  combat: null,
  lastCombat: null,     // { title, log } du dernier combat (journal consultable après coup)
  hubMessage: null,     // message affiché une seule fois à l'arrivée au village
  hubLoot: [],          // objets obtenus, affichés avec ce message
};
