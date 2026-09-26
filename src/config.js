// Constantes d'équilibrage et de rythme. Tout réglage chiffré « global » vit ici
// plutôt qu'en dur dans la logique.

export const START_GOLD = 50;
export const START_DUNGEON_LEVEL = 1;

// Ordre d'affichage et de création de l'équipe.
export const PARTY_ORDER = ['guerrier', 'voleur', 'pretre', 'mage'];

export const COMBAT = {
  logMax: 40,
  guardFactor: 0.5,       // Défendre : dégâts subis multipliés par ce facteur
  bleedDamage: 6,         // dégâts d'un saignement par fin de round
};

// Fourchettes de variance des dégâts [min, max].
export const VARIANCE = {
  hero: [0.9, 1.15],
  aoe: [0.9, 1.1],
  enemy: [0.85, 1.15],
};

export const REWARDS = {
  goldBase: 20,
  goldPerLevel: 10,
  victoryHealPct: 0.15,   // soin des survivants après une victoire
  defeatGoldLossPct: 0.2,
  defeatHpPct: 0.5,       // PV avec lesquels l'équipe revient au village
};

// Délais des tours ennemis (ms) : ils ne doivent jamais être instantanés.
export const TIMING = {
  enemyThinkMs: 800,
  enemyAfterMs: 500,
};
