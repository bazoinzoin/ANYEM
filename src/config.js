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
  // Puissance physique = Attaque (armes) + stat physique de la classe × physStatFactor
  // Puissance magique  = Intelligence × magicPerInt (sorts et soins uniquement)
  physStatFactor: 0.5,
  magicPerInt: 2,
  defenseK: 100,          // dégâts × K / (K + défense)
  blockReduction: 0.5,    // un coup bloqué perd cette part de ses dégâts
  offHandAtqFactor: 0.5,  // part de l'attaque d'une arme en main gauche (ambidextrie)
  caps: { critChance: 75, esquive: 50, blocage: 50 }, // plafonds en %
};

// Génération des objets. budget(L) = budgetBase + budgetPerLevel × L
export const ITEM = {
  budgetBase: 3,
  budgetPerLevel: 1,
  weaponAtq: 1.5,         // attaque d'arme = budget × weaponAtq × atqMult du type
  armorDef: 1.5,          // défense = budget × armorDef × poids de la pièce × defMult du type
  shieldDef: 1.8,
  jewelDefMag: 1.2,       // défense magique d'un bijou = budget × jewelDefMag × poids
  primaryPerBudget: 0.5,  // stat principale = budget × primaryPerBudget × poids
};

export const LOOT = {
  dropChance: 0.4,        // chance par ennemi vaincu de laisser un objet
  rarityWeights: { commun: 50, peuCommun: 30, rare: 14, epique: 5, legendaire: 1 },
  categoryWeights: { armor: 50, weapon: 30, jewel: 15, shield: 5 },
  defeatBagLossChance: 0.5, // défaite : chance de perdre chaque objet du sac (jamais l'équipement porté)
};

// Forge (DESIGN_DOC §2) : décraft en matéria, amélioration de +1 à +5.
export const FORGE = {
  maxPlus: 5,
  statBonusPerPlus: 0.1,  // chaque +1 augmente les stats de l'objet de 10 % (stat obligatoire : +1 minimum)
  decraftYield: { min: 1, max: 3 }, // matéria obtenues en décraftant un objet (de sa rareté), tirage aléatoire
  // Coût du passage à +s (s = 1..5) : tierCost[s-1] matéria de chaque rareté,
  // de commun jusqu'à celle de l'objet.
  tierCost: [2, 4, 6, 8, 10],
  goldBase: 10,           // or : (goldBase + goldPerLevel × niveau de l'objet) × s
  goldPerLevel: 5,
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
