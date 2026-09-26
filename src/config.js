// Constantes d'équilibrage et de rythme. Tout réglage chiffré « global » vit ici
// plutôt qu'en dur dans la logique.

export const START_GOLD = 50;
export const START_DUNGEON_LEVEL = 1; // plus haut niveau d'étage atteint (stock du Marchand)

// Ordre d'affichage et de création de l'équipe.
export const PARTY_ORDER = ['guerrier', 'voleur', 'pretre', 'mage'];

export const COMBAT = {
  logMax: 40,
  guardFactor: 0.5,       // Défendre : dégâts subis multipliés par ce facteur
  confuseChance: 0.5,     // chance qu'une unité confuse frappe un de ses alliés
  // Puissance physique = Attaque (armes) + stat physique de la classe × physStatFactor[stat]
  // (l'Agilité rapporte un peu plus que la Force : à stat égale, un voleur frappe plus fort)
  // Puissance magique  = Intelligence × magicPerInt (sorts et soins uniquement)
  physStatFactor: { force: 0.5, agilite: 0.6 },
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
  shieldBlock: { base: 5, perLevel: 0.2 }, // blocage (%) obligatoire d'un bouclier
  jewelDefMag: 1.2,       // défense magique d'un bijou = budget × jewelDefMag × poids
  primaryPerBudget: 0.5,  // stat principale = budget × primaryPerBudget × poids
};

export const LOOT = {
  dropChance: 0.4,        // chance par ennemi vaincu de laisser un objet
  bossDrops: 1,           // objets garantis par boss (le boss final en donne un de plus)
  bossRarityWeights: { peuCommun: 20, rare: 40, epique: 30, legendaire: 10 },
  rarityWeights: { commun: 50, peuCommun: 30, rare: 14, epique: 5, legendaire: 1 },
  categoryWeights: { armor: 50, weapon: 30, jewel: 15, shield: 5 },
  defeatBagLossChance: 0.5, // défaite : chance de perdre chaque objet du sac (jamais l'équipement porté)
};

// Donjons : nombre d'ennemis par étage ordinaire (selon le palier : 0 = étages 1-5…)
// et nombre d'acolytes accompagnant un boss.
export const DUNGEON = {
  enemiesByTier: [2, 2, 3, 3, 3],
  bossAddsByTier: [0, 1, 1, 2, 2],
};

// Expérience et niveaux. XP d'un ennemi = xpBase + xpPerLevel × niveau du donjon ;
// passer du niveau L à L+1 demande toNextBase + toNextPerLevel × L points d'XP.
export const XP = {
  xpBase: 10,
  xpPerLevel: 5,
  toNextBase: 40,
  toNextPerLevel: 20,
};

// Arbres de compétences : 1 point par niveau (dès le niveau 1) ; le palier t d'une
// branche demande t × tierPoints points déjà investis dans cette branche.
// Réinitialiser coûte resetCostPerLevel × niveau du héros en or.
export const TALENT_RULES = {
  pointsPerLevel: 1,
  tierPoints: 2,
  resetCostPerLevel: 10,
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

// Marchand. Prix de revente d'un objet :
// (sellBase + sellPerLevel × niveau) × sellRarityMult[rareté] × (1 + sellPerPlus × amélioration).
// Prix d'achat d'un objet du stock = prix de revente × buyMarkup.
export const MERCHANT = {
  sellBase: 5,
  sellPerLevel: 2,
  sellRarityMult: { commun: 1, peuCommun: 2, rare: 4, epique: 8, legendaire: 16 },
  sellPerPlus: 0.2,
  buyMarkup: 4,
  stockSize: 4,            // objets d'équipement en vente, renouvelés à chaque niveau de donjon
  stockRarityWeights: { commun: 55, peuCommun: 35, rare: 10 },
  maxConsumable: 9,        // nombre maximum de chaque consommable transporté
  startingConsumables: { potion: 2 },
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
