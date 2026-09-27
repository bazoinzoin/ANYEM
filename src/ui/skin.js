// Habillage de l'interface : polices pixel et images du pack d'interface (Franuka) et des
// icônes (Raven Fantasy), exposées au CSS sous forme de variables (url(data:…)) puisque le
// jeu tient dans un seul fichier. Appelé une fois au démarrage (main.js).

import { ASSET_DATA } from './assetData.js';

// Variable CSS → clé d'asset (assets/…).
const IMAGES = {
  '--ui-icons': 'icons/raven16',
  '--ui-equip-icons': 'icons/equipment',
  '--ui-box': 'ui/box_night',
  '--ui-box-light': 'ui/box_01B',
  '--ui-parch': 'ui/box_01A',
  '--ui-gold-box': 'ui/box_01C',
  '--ui-btn': 'ui/btn_01A_Normal',
  '--ui-btn-hover': 'ui/btn_01A_Selected',
  '--ui-btn-down': 'ui/btn_01A_Pressed',
  '--ui-btn-red': 'ui/btn_02A_Normal',
  '--ui-btn-red-hover': 'ui/btn_02A_Selected',
  '--ui-btn-gold': 'ui/btn_03A_Normal',
  '--ui-btn-gold-hover': 'ui/btn_03A_Selected',
  '--ui-slot': 'ui/slot_night',
  '--ui-slot-gold': 'ui/slot_03_empty',
  '--ui-banner': 'ui/banner_01A',
  '--ui-banner-small': 'ui/banner_small_01A',
  '--ui-divider': 'ui/divider',
  '--ui-book': 'ui/spellbook',
  '--ui-cursor': 'ui/cursor_hand',
};

// Emplacements d'équipement : silhouette de l'objet attendu.
export const SLOT_ART = {
  casque: 'ui/slot_02_headgear',
  epaulieres: 'ui/slot_02_armor',
  plastron: 'ui/slot_02_armor',
  gants: 'ui/slot_02_gloves',
  bottes: 'ui/slot_02_footwear',
  collier: 'ui/slot_02_necklace',
  anneau1: 'ui/slot_02_ring',
  anneau2: 'ui/slot_02_ring',
  mainDroite: 'ui/slot_02_weapon',
  mainGauche: 'ui/slot_02_shield',
};

const FONTS = { FantasyRPGtext: 'fonts/FantasyRPGtext', FantasyRPGtitle: 'fonts/FantasyRPGtitle', FantasyRPGtitleOutline: 'fonts/FantasyRPGtitleOutline' };

export function assetUrl(key) {
  return `url(${ASSET_DATA[key]})`;
}

export function applySkin() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  for (const [name, key] of Object.entries(IMAGES)) if (ASSET_DATA[key]) root.setProperty(name, assetUrl(key));
  for (const [family, key] of Object.entries(FONTS)) {
    if (!ASSET_DATA[key] || typeof FontFace === 'undefined') continue;
    const face = new FontFace(family, `url(${ASSET_DATA[key]})`);
    document.fonts.add(face);
    face.load().catch(() => {});
  }
}
