// Constantes d'équilibrage et de rythme. Tout réglage chiffré « global » vit ici
// plutôt qu'en dur dans la logique.

export const START_GOLD = 50;
export const START_DUNGEON_LEVEL = 1; // plus haut niveau d'étage atteint (stock du Marchand)

// Classes jouables (ordre d'affichage) et équipe proposée par défaut à la création
// (4 héros, classes au choix, doublons permis).
export const CLASS_ORDER = ['guerrier', 'voleur', 'pretre', 'mage', 'chasseur', 'paladin'];
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
  caps: { critChance: 75, esquive: 50, blocage: 50, riposte: 50 }, // plafonds en %
  meleeTargetWeight: 3,   // un héros au corps à corps a 3 fois plus de chances d'être ciblé qu'à distance
  ripostePower: 0.5,      // riposte : part de la puissance physique infligée (réduite par la Défense)
  executeThreshold: 0.3,  // « exécution » : bonus de dégâts contre une cible sous ce % de PV
  minGuardFactor: 0.2,    // la garde (talents compris) ne réduit jamais les dégâts à moins de 20 %
};

// Génération des objets. budget(L) = budgetBase + budgetPerLevel × L
export const ITEM = {
  budgetBase: 3,
  budgetPerLevel: 1,
  weaponAtq: 1.5,         // attaque d'arme = budget × weaponAtq × atqMult du type
  armorDef: 1.5,          // Armure = budget × armorDef × poids de la pièce × defMult du type
  shieldDef: 1.8,
  shieldBlock: { base: 5, perLevel: 0.2 }, // blocage (%) obligatoire d'un bouclier
  primaryPerBudget: 0.5,  // stat principale = budget × primaryPerBudget × poids
};

// Butin : pour chaque ennemi vaincu, trois tirages indépendants — équipement,
// matéria et consommable. Un ennemi peut donc tout laisser, rien, ou un mélange.
export const LOOT = {
  dropChance: 0.4,        // chance d'un équipement par ennemi ordinaire
  bossDrops: 1,           // équipements garantis par boss (le boss final en donne un de plus)
  bossRarityWeights: { peuCommun: 20, rare: 40, epique: 30, legendaire: 10 },
  // Matéria : plus fréquentes et moins rares que l'équipement (comparer à rarityWeights).
  materiaChance: 0.5,
  materiaAmount: { min: 1, max: 2 },
  materiaRarityWeights: { commun: 40, peuCommun: 32, rare: 18, epique: 8, legendaire: 2 },
  bossMateriaAmount: { min: 2, max: 4 }, // garanties pour un boss
  bossMateriaRarityWeights: { peuCommun: 30, rare: 40, epique: 23, legendaire: 7 },
  // Consommables : tirés selon leur poids `drop` (data/consumables.js).
  consumableChance: 0.2,
  bossConsumableChance: 0.6,
  rarityWeights: { commun: 50, peuCommun: 30, rare: 14, epique: 5, legendaire: 1 },
  categoryWeights: { armor: 25, weapon: 25, jewel: 25, shield: 25 }, // autant de chances pour chaque catégorie, quelle que soit la difficulté
  defeatBagLossChance: 0.5, // défaite : chance de perdre chaque objet du sac (jamais l'équipement porté)
};

// Donjons : régénération quand on choisit de continuer après un boss, nombre
// d'ennemis par étage ordinaire (selon le palier : 0 = étages 1-5…) et nombre
// d'acolytes accompagnant un boss. Aucun soin automatique entre deux combats.
export const DUNGEON = {
  continueRegenPct: 40,   // après un boss, choisir de continuer rend ce % des PV et de la ressource
  enemiesByTier: [2, 2, 3, 3, 3],
  bossAddsByTier: [0, 1, 1, 2, 2],
};

// Événements d'expédition (data/events.js) : chance après chaque combat gagné
// hors boss ; stock du marchand ambulant (meilleures raretés, prix plus bas qu'au village).
export const EVENT_RULES = {
  chance: 0.35,
  merchantItems: 3,
  merchantRarityWeights: { peuCommun: 35, rare: 40, epique: 20, legendaire: 5 },
  merchantPriceMult: 2,        // prix = prix de revente × 2 (village : × 4)
  merchantConsumables: 3,
  merchantConsumablePct: 75,   // consommables à 75 % du prix du village
};

// Expérience et niveaux. XP d'un ennemi = xpBase + xpPerLevel × niveau du donjon ;
// passer du niveau L à L+1 demande toNextBase + toNextPerLevel × L points d'XP.
export const XP = {
  xpBase: 10,
  xpPerLevel: 5,
  toNextBase: 80,
  toNextPerLevel: 40,
  maxLevel: 50,
};

// Arbres de compétences : 1 point par niveau (dès le niveau 1, donc 50 au niveau
// maximum, de quoi compléter une seule orientation) ; le palier t (0 à 9) d'une
// branche demande t × tierPoints points déjà investis dans cette branche.
// Réinitialiser coûte resetCostPerLevel × niveau du héros en or.
export const TALENT_RULES = {
  pointsPerLevel: 1,
  tierPoints: 5,
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
  defeatGoldLossPct: 0.2,
  defeatHpPct: 0.5,       // PV avec lesquels l'équipe revient au village
};

// Délais des tours ennemis (ms) : ils ne doivent jamais être instantanés.
export const TIMING = {
  enemyThinkMs: 800,
  enemyAfterMs: 500,
};
