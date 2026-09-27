// Point d'entrée : enregistre les écrans et lance le premier rendu.

import { registerScreens, render } from './ui/router.js';
import { applySkin } from './ui/skin.js';
import { renderTitle } from './ui/screens/title.js';
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
import { renderDifficulty } from './ui/screens/difficulty.js';
import { renderRunes } from './ui/screens/runes.js';
import { renderBestiary } from './ui/screens/bestiary.js';
import { renderPortals } from './ui/screens/portals.js';
import { renderDefeat } from './ui/screens/defeat.js';
import { renderSlots } from './ui/screens/slots.js';
import { startGlossary } from './ui/glossary.js';
import { startGamepad } from './ui/gamepad.js';
// Menu Échap : ui/pause.js écoute le clavier dès son chargement.
import { openPause } from './ui/pause.js';

registerScreens({
  title: renderTitle,
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
  difficulty: renderDifficulty,
  runes: renderRunes,
  bestiary: renderBestiary,
  portals: renderPortals,
  defeat: renderDefeat,
  slots: renderSlots,
});

applySkin();
render();
startGlossary();
startGamepad();
