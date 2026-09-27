// Icônes du jeu : planche Raven Fantasy Icons (assets/icons/raven16.png, 16 × 137 icônes de
// 16 px, numérotées ligne par ligne). Un objet, un consommable, une matéria, un effet, une
// compétence ou une orientation reçoit une icône choisie par sa nature ; la rareté change la
// teinte des armes et des armures quand la planche en propose plusieurs.

import { CONSUMABLES } from '../data/consumables.js';

const COLS = 16;

// Icône n° `index` dessinée en `size` px (multiple de 16 conseillé).
export function iconHtml(index, size = 32, extra = '', title = '') {
  const x = (index % COLS) * size;
  const y = Math.floor(index / COLS) * size;
  return `<i class="ic ${extra}" style="--is:${size}px;background-position:-${x}px -${y}px"${title ? ` title="${title}"` : ''} aria-hidden="${title ? 'false' : 'true'}"></i>`;
}

// Rareté → variante (0 = commune … 5 = divine).
const TIER = { commun: 0, peuCommun: 1, rare: 2, epique: 3, legendaire: 4, divin: 5 };

// Armes : ligne des armes en fer ; +160 = acier bleu, +80 = or.
const WEAPONS = { epee: 1447, epee2m: 1455, dague: 1443, hache: 1463, hache2m: 1465, masse: 1471, masse2m: 1476, baton: 1491, arc: 1482 };
const WEAPON_TIER = [0, 0, 160, 160, 80, 80];

// Armures : une icône par rareté, pour chaque pièce et chaque type.
const ARMOR = {
  lourde: {
    casque: [1904, 1905, 1907, 1908, 1910, 1908],
    epaulieres: [1820, 1820, 1818, 1817, 1821, 1817],
    plastron: [1920, 1921, 1923, 1924, 1926, 1924],
    gants: [2057, 2057, 2058, 2058, 2059, 2059],
    bottes: [1936, 1937, 1939, 1940, 1942, 1940],
  },
  moyenne: {
    casque: [2014, 2014, 2015, 2015, 2015, 2015],
    epaulieres: [2069, 2070, 2071, 2072, 2073, 2073],
    plastron: [2018, 2024, 2025, 2027, 2028, 2028],
    gants: [2054, 2054, 2055, 2055, 2059, 2059],
    bottes: [2034, 2040, 2041, 2043, 2044, 2044],
  },
  legere: {
    casque: [1952, 1953, 1954, 1960, 1962, 1963],
    epaulieres: [1819, 1819, 1818, 1818, 1821, 1821],
    plastron: [1968, 1969, 1970, 1976, 1978, 1979],
    gants: [2055, 2055, 2054, 2054, 2059, 2059],
    bottes: [1984, 1985, 1986, 1992, 1994, 1995],
  },
};
const JEWELS = {
  anneau: [1842, 1843, 1846, 1845, 1844, 2061],
  collier: [2065, 2064, 1849, 1848, 1847, 2181],
};
const SHIELD = [2112, 2113, 2115, 1810, 1811, 1812];

export function itemIcon(item) {
  const tier = TIER[item.rarity] ?? 0;
  if (item.slotType === 'arme') return (WEAPONS[item.weaponType] ?? 1447) + WEAPON_TIER[tier];
  if (item.slotType === 'bouclier') return SHIELD[tier];
  if (JEWELS[item.slotType]) return JEWELS[item.slotType][tier];
  return ARMOR[item.armorType]?.[item.slotType]?.[tier] ?? 1920;
}

// Consommables.
const CONSUMABLE_ICONS = {
  potion: 276, grandePotion: 286, elixir: 122, plumeDePhenix: 6, antidote: 120, bandage: 110, onguent: 267,
  selsRevigorants: 167, tisaneDeClarte: 509, tonique: 121, fortifiant: 480, potionDeCourage: 284, eauBenite: 669,
  outilsDeDesamorcage: 125, remede: 240, corde: 127, tente: 93,
};
export function consumableIcon(key) {
  return CONSUMABLE_ICONS[key] ?? (CONSUMABLES[key]?.category === 'soin' ? 276 : 288);
}

// Matéria : une gemme par catégorie d'équipement.
export const MATERIA_ICONS = { arme: 162, armure: 160, bijou: 165 };
export const GOLD_ICON = 130;

// Effets (buffs / debuffs).
const EFFECT_ICONS = {
  bouclier: 663, regeneration: 658, puissance: 600, hate: 648, protection: 612, provocation: 662, enrage: 694,
  intercession: 669, poison: 674, saignement: 676, brulure: 692, tenebres: 750, ralenti: 649, etourdi: 687,
  confus: 699, affaibli: 616, terreur: 672, piege: 127, piegeDeGivre: 1008,
};
export function effectIcon(key) {
  return EFFECT_ICONS[key] ?? 1000;
}

// Compétences : d'après leur nom (élément), puis leur nature.
const SKILL_RULES = [
  [/feu|flamme|brasier|immolation|météore/i, 992],
  [/glace|givre|blizzard|gel/i, 1008],
  [/foudre|éclair|choc|tempête|céleste|orage/i, 1040],
  [/poison|peste|nauséabond|empoisonn/i, 674],
  [/ombre|douleur|fléau|apocalypse|profane|confusion|mort lente/i, 750],
  [/résurrection|sacrifice/i, 669],
  [/soin|prière|rénovation|miracle|sceau de vie|purification|épuration/i, 1057],
  [/bouclier|rempart|protection|aura|intercession|sceau de protection/i, 663],
  [/lumière|jugement|hymne|sacré|divin|croisé|aube/i, 1055],
  [/piège|terrain/i, 127],
  [/tir|salve|flèche/i, 2169],
  [/tourbillon|déluge|carnage/i, 724],
  [/cri|provocation/i, 662],
  [/exécution|éviscération|marque|fatal/i, 745],
];
export function skillIconIndex(skill) {
  for (const [re, index] of SKILL_RULES) if (re.test(skill.name)) return index;
  if (skill.kind === 'heal') return 1057;
  if (skill.kind === 'revive') return 669;
  if (skill.magic) return 1000;
  return 726;
}

// Orientations de talents et classes.
const BRANCH_ICONS = {
  Gardien: 663, Berserker: 1465, Assassin: 1443, Empoisonneur: 674, Clerc: 669, 'Prêcheur': 96, Profane: 750,
  'Mage de feu': 992, 'Mage de glace': 1008, 'Mage de foudre': 1040, 'Œil de Faucon': 1482, Traqueur: 127,
  Templier: 1810, 'Lumière': 1055,
};
export function branchIcon(branch) {
  return BRANCH_ICONS[branch.name] ?? 1000;
}
export const CLASS_ICONS = { guerrier: 720, voleur: 1443, pretre: 669, mage: 1491, chasseur: 1482, paladin: 1471 };

// Commandes de combat.
export const COMMAND_ICONS = { attack: 726, skills: 96, items: 276, defend: 663, move: 648, end: 686 };

// Nœuds de talents : compétence → son icône ; bonus et passifs → icône de la stat ou de
// l'effet renforcé.
const TALENT_STAT_ICONS = {
  pv: 610, def: 612, defMag: 613, blocage: 663, physPower: 608, magPower: 609, critDmg: 671, critChance: 670,
  esquive: 666, vit: 648, resOnHitTaken: 694, guardShieldPct: 664, shieldPct: 663, guardBonus: 663, berserk: 694,
  lifestealPct: 676, executePct: 745, resMaxBonus: 611, resRegen: 611, critCombo: 682, finisherRefund: 745,
  dotPct: 674, vsDebuffedPct: 616, healPct: 1057, aoePct: 724, trapPct: 127,
};
export function talentNodeIcon(node, skills = []) {
  if (skills.length) return skillIconIndex(skills[0]);
  for (const group of [node.passive, node.pct, node.flat]) {
    const key = group && Object.keys(group).find((k) => TALENT_STAT_ICONS[k]);
    if (key) return TALENT_STAT_ICONS[key];
  }
  return node.skillMod ? 1000 : 682;
}
