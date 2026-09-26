// Point d'entrée : enregistre les écrans et lance le premier rendu.

import { registerScreens, render } from './ui/router.js';
import { renderCreate } from './ui/screens/create.js';
import { renderHub } from './ui/screens/hub.js';
import { renderStats } from './ui/screens/stats.js';
import { renderEquipment } from './ui/screens/equipment.js';
import { renderForge } from './ui/screens/forge.js';
import { renderTalents } from './ui/screens/talents.js';
import { renderMerchant } from './ui/screens/merchant.js';
import { renderCombat } from './ui/screens/combat.js';

registerScreens({
  create: renderCreate,
  hub: renderHub,
  stats: renderStats,
  equipment: renderEquipment,
  forge: renderForge,
  talents: renderTalents,
  merchant: renderMerchant,
  combat: renderCombat,
});

render();
