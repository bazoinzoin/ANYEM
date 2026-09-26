// Point d'entrée : enregistre les écrans et lance le premier rendu.

import { registerScreens, render } from './ui/router.js';
import { renderCreate } from './ui/screens/create.js';
import { renderHub } from './ui/screens/hub.js';
import { renderStats } from './ui/screens/stats.js';
import { renderEquipment } from './ui/screens/equipment.js';
import { renderForge } from './ui/screens/forge.js';
import { renderTalents } from './ui/screens/talents.js';
import { renderMerchant } from './ui/screens/merchant.js';
import { renderDungeon } from './ui/screens/dungeon.js';
import { renderCombat } from './ui/screens/combat.js';
import { renderStrategy } from './ui/screens/strategy.js';
import { renderInn } from './ui/screens/inn.js';
import { renderBank } from './ui/screens/bank.js';

registerScreens({
  create: renderCreate,
  hub: renderHub,
  stats: renderStats,
  equipment: renderEquipment,
  forge: renderForge,
  talents: renderTalents,
  merchant: renderMerchant,
  dungeon: renderDungeon,
  combat: renderCombat,
  strategy: renderStrategy,
  inn: renderInn,
  bank: renderBank,
});

render();
