// Apparence des héros (création de personnage) : coupes, couleurs de cheveux, yeux, peau,
// haut et bas du corps. Les images viennent du pack « Fantasy RPG Heroes » de Franuka :
// les corps (tenues) sont ceux des quatre héros du pack, recolorés ; les têtes sont
// dessinées pixel par pixel dans ui/heroHeads.js et posées sur les corps image par image.
//
// Couleurs : chaînes hexadécimales ; une rampe = [clair, moyen, foncé].

// Coupes : clé → libellé (dessins dans ui/heroHeads.js).
export const HAIR_STYLES = {
  courts: 'Courts',
  meche: 'Mèche',
  longs: 'Longs',
  queue: 'Queue de cheval',
  chignon: 'Chignon',
  herisses: 'Hérissés',
  tresses: 'Tresses',
  rase: 'Rasés',
  crete: 'Crête',
  boucles: 'Bouclés',
};

export const HAIR_COLORS = {
  roux: { label: 'Roux', ramp: ['#ff8933', '#cf752b', '#ab5130'] },
  chatain: { label: 'Châtain', ramp: ['#c78550', '#9a5c38', '#6d3d27'] },
  brun: { label: 'Brun', ramp: ['#8f5a3c', '#6b3f2a', '#4a2a1e'] },
  noir: { label: 'Noir', ramp: ['#4d4f6e', '#2b2b45', '#1b1a2c'] },
  blond: { label: 'Blond', ramp: ['#ffe28f', '#e8b85a', '#b8833a'] },
  blanc: { label: 'Blanc', ramp: ['#f5ffe8', '#d7d3bd', '#9d9387'] },
  bleu: { label: 'Bleu nuit', ramp: ['#6fa8e8', '#4a6fc4', '#2f437a'] },
  rose: { label: 'Rose', ramp: ['#ff9ec0', '#e05a8a', '#9c2a70'] },
  vert: { label: 'Vert', ramp: ['#9be36b', '#63ab3f', '#3b7d4f'] },
  violet: { label: 'Violet', ramp: ['#c08ae8', '#8a52c4', '#56307e'] },
};

// Yeux : couleur (haut, bas de l'œil) et forme ('ronds', 'plisses', 'clos', 'grands').
export const EYES = {
  verts: { label: 'Verts', colors: ['#63ab3f', '#3b7d4f'], shape: 'ronds' },
  bleus: { label: 'Bleus', colors: ['#6fa8e8', '#2f437a'], shape: 'ronds' },
  bruns: { label: 'Bruns', colors: ['#8f5a3c', '#4a2a1e'], shape: 'ronds' },
  gris: { label: 'Gris', colors: ['#9d9387', '#52333f'], shape: 'ronds' },
  violets: { label: 'Violets', colors: ['#9c2a70', '#692464'], shape: 'ronds' },
  dores: { label: 'Dorés', colors: ['#ffc933', '#b8833a'], shape: 'ronds' },
  rouges: { label: 'Rouges', colors: ['#e64539', '#ad2f45'], shape: 'ronds' },
  grands: { label: 'Grands yeux', colors: ['#f5ffe8', '#2f437a'], shape: 'grands' },
  plisses: { label: 'Plissés', colors: ['#52333f', '#52333f'], shape: 'plisses' },
  clos: { label: 'Sereins (clos)', colors: ['#52333f', '#52333f'], shape: 'clos' },
};

// Peau : [claire, ombrée].
export const SKINS = {
  claire: { label: 'Claire', ramp: ['#ffc2a1', '#d09c8e'] },
  pale: { label: 'Pâle', ramp: ['#ffe3d1', '#e0b8a8'] },
  halee: { label: 'Hâlée', ramp: ['#eaa77a', '#bf7d5c'] },
  mate: { label: 'Mate', ramp: ['#c7895e', '#9a6442'] },
  foncee: { label: 'Foncée', ramp: ['#8f5a3c', '#6b3f2a'] },
};

// Corps disponibles (héros du pack) : `robe` = le vêtement du haut descend jusqu'aux
// pieds (le bas ne se voit pas). `bottom` : couleurs de la zone des jambes → rôle
// ('light', 'mid', 'dark' du pantalon, 'bootLight', 'bootDark' des bottes).
export const BODIES = {
  gladiator: {
    sheet: 'heroes/body_gladiator', cut: 24,
    bottom: { '#cc2f7b': 'light', '#9c2a70': 'mid', '#633d4c': 'dark', '#7d3833': 'bootLight', '#4f1d4c': 'bootDark' },
  },
  beastmaster: {
    sheet: 'heroes/body_beastmaster', cut: 27,
    bottom: { '#bd6a62': 'light', '#8f4d57': 'mid', '#63ab3f': 'bootLight', '#3b7d4f': 'bootDark' },
  },
  sorcerer: { sheet: 'heroes/body_sorcerer', cut: 26, robe: true, bottom: {} },
  swashbuckler: {
    sheet: 'heroes/body_swashbuckler', cut: 26,
    bottom: { '#8f4d57': 'mid', '#3a3f5e': 'bootDark' },
  },
};

// Hauts : un corps + remplacement de ses couleurs (au-dessus des jambes, ou partout
// pour une robe). Couleurs de peau des mains : suivent le choix de peau.
export const TOPS = {
  gladiateur: { label: 'Armure de gladiateur', body: 'gladiator', map: {} },
  plates: {
    label: "Plates d'acier", body: 'gladiator',
    map: { '#d7d3bd': '#e9eef2', '#9d9387': '#9aa7b8', '#633d4c': '#3a3f5e', '#8f4d57': '#6b7d99', '#7d3833': '#2b2b45', '#a47d72': '#9aa7b8' },
  },
  doree: {
    label: 'Armure dorée', body: 'gladiator',
    map: { '#d7d3bd': '#ffe28f', '#9d9387': '#e0a63a', '#633d4c': '#6b3f2a', '#8f4d57': '#b8833a', '#7d3833': '#4a2a1e', '#a47d72': '#e0a63a' },
  },
  fourrure: { label: 'Fourrure de bête', body: 'beastmaster', map: {} },
  cuir: {
    label: 'Cuir de chasseur', body: 'beastmaster',
    map: { '#8f4d57': '#7a4a2d', '#bd6a62': '#a8703f', '#63ab3f': '#c8a062', '#3b7d4f': '#8a6a3a' },
  },
  druide: {
    label: 'Tenue de druide', body: 'beastmaster',
    map: { '#8f4d57': '#3b7d4f', '#bd6a62': '#63ab3f', '#63ab3f': '#c8d45d', '#3b7d4f': '#8a6a3a' },
  },
  ecarlate: { label: 'Robe écarlate', body: 'sorcerer', map: {} },
  pretre: {
    label: 'Robe de prêtre', body: 'sorcerer',
    map: { '#e64539': '#f5ffe8', '#ad2f45': '#c9c3a8', '#8f4d57': '#e0a63a', '#ff8933': '#ffc933' },
  },
  mage: {
    label: 'Robe de mage', body: 'sorcerer',
    map: { '#e64539': '#4a6fc4', '#ad2f45': '#2f437a', '#8f4d57': '#e0a63a', '#ff8933': '#ffc933' },
  },
  necro: {
    label: 'Robe du nécromant', body: 'sorcerer',
    map: { '#e64539': '#692464', '#ad2f45': '#4f1d4c', '#8f4d57': '#63ab3f', '#ff8933': '#9be36b' },
  },
  corsaire: { label: 'Manteau de corsaire', body: 'swashbuckler', map: {} },
  voyageur: {
    label: 'Manteau de voyageur', body: 'swashbuckler',
    map: { '#2b2b45': '#6b3f2a', '#3a3f5e': '#8f5a3c', '#e64539': '#63ab3f', '#ad2f45': '#3b7d4f', '#9c2a70': '#3b7d4f' },
  },
  ombre: {
    label: "Tenue d'ombre", body: 'swashbuckler',
    map: { '#2b2b45': '#1b1a2c', '#3a3f5e': '#2b2b45', '#f5ffe8': '#9d9387', '#d7d3bd': '#633d4c', '#e64539': '#8a52c4', '#ad2f45': '#56307e', '#9c2a70': '#56307e' },
  },
};

// Bas : pantalon [clair, moyen, foncé] et bottes [claires, foncées].
export const BOTTOMS = {
  toile: { label: 'Toile brune', pants: ['#bd6a62', '#8f4d57', '#633d4c'], boots: ['#6b3f2a', '#3a3f5e'] },
  cuir: { label: 'Cuir fauve', pants: ['#c78550', '#9a5c38', '#6d3d27'], boots: ['#4a2a1e', '#2b2b45'] },
  sombre: { label: 'Chausses sombres', pants: ['#4d4f6e', '#2b2b45', '#1b1a2c'], boots: ['#52333f', '#1b1a2c'] },
  azur: { label: 'Braies azur', pants: ['#6fa8e8', '#4a6fc4', '#2f437a'], boots: ['#6b3f2a', '#4a2a1e'] },
  foret: { label: 'Braies vertes', pants: ['#9be36b', '#63ab3f', '#3b7d4f'], boots: ['#6b3f2a', '#4a2a1e'] },
  pourpre: { label: 'Chausses pourpres', pants: ['#cc2f7b', '#9c2a70', '#692464'], boots: ['#7d3833', '#4f1d4c'] },
  garance: { label: 'Chausses garance', pants: ['#e64539', '#ad2f45', '#7d3833'], boots: ['#52333f', '#2b2b45'] },
  gris: { label: 'Laine grise', pants: ['#b8b3a8', '#9d9387', '#633d4c'], boots: ['#52333f', '#2b2b45'] },
  lin: { label: 'Lin clair', pants: ['#f5ffe8', '#d7d3bd', '#9d9387'], boots: ['#8f5a3c', '#4a2a1e'] },
  jambieres: { label: 'Jambières de fer', pants: ['#e9eef2', '#9aa7b8', '#3a3f5e'], boots: ['#6b7d99', '#2b2b45'] },
};

// Apparence de départ proposée pour chaque classe.
export const CLASS_LOOKS = {
  guerrier: { hair: 'courts', hairColor: 'brun', eyes: 'bruns', skin: 'claire', top: 'gladiateur', bottom: 'toile' },
  voleur: { hair: 'meche', hairColor: 'noir', eyes: 'violets', skin: 'pale', top: 'ombre', bottom: 'sombre' },
  pretre: { hair: 'longs', hairColor: 'blond', eyes: 'bleus', skin: 'claire', top: 'pretre', bottom: 'lin' },
  mage: { hair: 'chignon', hairColor: 'roux', eyes: 'verts', skin: 'claire', top: 'mage', bottom: 'azur' },
  chasseur: { hair: 'queue', hairColor: 'chatain', eyes: 'verts', skin: 'halee', top: 'druide', bottom: 'cuir' },
  paladin: { hair: 'courts', hairColor: 'blond', eyes: 'dores', skin: 'claire', top: 'plates', bottom: 'jambieres' },
};

// Champs d'une apparence → catalogue de ses choix (ordre de l'écran de création).
export const LOOK_PARTS = {
  hair: HAIR_STYLES,
  hairColor: HAIR_COLORS,
  eyes: EYES,
  skin: SKINS,
  top: TOPS,
  bottom: BOTTOMS,
};
