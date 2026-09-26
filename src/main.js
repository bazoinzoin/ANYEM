// Point d'entrée : enregistre les écrans et lance le premier rendu.

import { registerScreens, render } from './ui/router.js';
import { renderCreate } from './ui/screens/create.js';
import { renderHub } from './ui/screens/hub.js';
import { renderStats } from './ui/screens/stats.js';
import { renderEquipment } from './ui/screens/equipment.js';
import { renderCombat } from './ui/screens/combat.js';

registerScreens({
  create: renderCreate,
  hub: renderHub,
  stats: renderStats,
  equipment: renderEquipment,
  combat: renderCombat,
});

render();
