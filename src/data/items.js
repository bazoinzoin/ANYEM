// Données d'équipement (voir DESIGN_DOC §2 « Les Equipements »).

// Emplacements d'un héros. `accepts` : types d'emplacement d'objet acceptés.
export const SLOTS = {
  casque: { label: 'Casque', accepts: ['casque'] },
  epaulieres: { label: 'Épaulières', accepts: ['epaulieres'] },
  plastron: { label: 'Plastron', accepts: ['plastron'] },
  gants: { label: 'Gants', accepts: ['gants'] },
  ceinture: { label: 'Ceinture', accepts: ['ceinture'] },
  bottes: { label: 'Bottes', accepts: ['bottes'] },
  collier: { label: 'Collier', accepts: ['collier'] },
  anneau1: { label: 'Anneau 1', accepts: ['anneau'] },
  anneau2: { label: 'Anneau 2', accepts: ['anneau'] },
  mainDroite: { label: 'Main droite', accepts: ['arme'] },
  mainGauche: { label: 'Main gauche', accepts: ['arme', 'bouclier'] },
};

export const SLOT_ORDER = Object.keys(SLOTS);

// Rareté. secondaries : nombre de stats secondaires aléatoires.
// mult : multiplicateur des stats obligatoire et principale.
// range : fourchette (× valeur unitaire) des stats secondaires.
export const RARITIES = {
  commun: { label: 'Commun', color: 'var(--r-commun)', secondaries: 0, mult: 1.0, range: [0, 0] },
  peuCommun: { label: 'Peu commun', color: 'var(--r-peu-commun)', secondaries: 1, mult: 1.1, range: [0.5, 1.0] },
  rare: { label: 'Rare', color: 'var(--r-rare)', secondaries: 2, mult: 1.25, range: [0.9, 1.5] },
  epique: { label: 'Épique', color: 'var(--r-epique)', secondaries: 3, mult: 1.4, range: [1.4, 2.1] },
  legendaire: { label: 'Légendaire', color: 'var(--r-legendaire)', secondaries: 4, mult: 1.6, range: [2.0, 2.8] },
};

export const RARITY_ORDER = Object.keys(RARITIES);

// Pièces d'armure : poids relatif (part de la défense et de la stat principale).
export const ARMOR_PIECES = {
  casque: 0.6, epaulieres: 0.5, plastron: 1.0, gants: 0.4, ceinture: 0.4, bottes: 0.5,
};

export const ARMOR_TYPES = {
  lourde: {
    label: 'Armure lourde', defMult: 1.5, primaries: ['force'],
    names: { casque: 'Heaume', epaulieres: 'Spallières', plastron: 'Cuirasse', gants: 'Gantelets', ceinture: 'Ceinturon de plates', bottes: 'Solerets' },
  },
  moyenne: {
    label: 'Armure moyenne', defMult: 1.0, primaries: ['force', 'agilite'],
    names: { casque: 'Casque de cuir', epaulieres: 'Épaulières de cuir', plastron: 'Brigandine', gants: 'Gants de cuir', ceinture: 'Ceinture de cuir', bottes: 'Bottes de cuir' },
  },
  legere: {
    label: 'Armure légère', defMult: 0.6, primaries: ['intelligence'],
    names: { casque: 'Capuche', epaulieres: 'Mantelet', plastron: 'Robe', gants: 'Mitaines', ceinture: 'Cordelière', bottes: 'Sandales' },
  },
};

// Armes. atqMult : puissance relative ; vit : bonus/malus de vitesse ;
// twoHanded : occupe les deux mains.
export const WEAPON_TYPES = {
  epee: { name: 'Épée', label: 'Arme à une main', atqMult: 0.9, vit: 1, primaries: ['force', 'agilite'] },
  hache: { name: 'Hache', label: 'Arme à une main', atqMult: 1.0, vit: 0, primaries: ['force', 'agilite'] },
  marteau: { name: 'Marteau', label: 'Arme à une main', atqMult: 1.15, vit: -1, primaries: ['force', 'agilite'] },
  dague: { name: 'Dague', label: 'Dague', atqMult: 0.7, vit: 2, primaries: ['agilite', 'intelligence'] },
  epee2m: { name: 'Espadon', label: 'Arme à deux mains', atqMult: 1.5, vit: -1, primaries: ['force'], twoHanded: true },
  hache2m: { name: 'Grande hache', label: 'Arme à deux mains', atqMult: 1.65, vit: -2, primaries: ['force'], twoHanded: true },
  marteau2m: { name: 'Maillet de guerre', label: 'Arme à deux mains', atqMult: 1.8, vit: -3, primaries: ['force'], twoHanded: true },
  baton: { name: 'Bâton', label: 'Bâton magique', atqMult: 1.4, vit: 0, primaries: ['intelligence'], twoHanded: true },
};

export const SHIELD = { name: 'Bouclier', label: 'Bouclier', primaries: ['force'] };

export const JEWELS = {
  anneau: { name: 'Anneau', label: 'Anneau', weight: 0.4 },
  collier: { name: 'Collier', label: 'Collier', weight: 0.6 },
};

// Suffixe de nom (rareté ≥ peu commun) selon la stat principale.
export const PRIMARY_SUFFIX = {
  force: "de l'Ours",
  agilite: 'du Faucon',
  intelligence: 'du Sage',
};

// Stats secondaires pouvant apparaître, avec leur valeur unitaire au niveau L :
// unit = base + perLevel × L (puis multipliée par la fourchette de rareté).
export const SECONDARY_STATS = {
  pv: { base: 3, perLevel: 1.2 },
  atq: { base: 1, perLevel: 0.25 },
  vit: { base: 1, perLevel: 0.05 },
  critChance: { base: 1, perLevel: 0.1 },
  critDmg: { base: 3, perLevel: 0.3 },
  def: { base: 1, perLevel: 0.4 },
  defMag: { base: 1, perLevel: 0.4 },
  esquive: { base: 1, perLevel: 0.08 },
  blocage: { base: 1, perLevel: 0.1 },
};

// Objets légendaires : liés à une classe, avec un passif unique qui modifie
// une compétence (powerPct : +% de puissance, costDelta : coût, bleedDelta : tours de saignement).
export const LEGENDARIES = {
  colereAncestrale: {
    name: 'Colère Ancestrale', classKey: 'guerrier', slotType: 'arme', weaponType: 'marteau2m', primary: 'force',
    passive: { skill: 'frappe-brutale', powerPct: 30 }, desc: 'Frappe Brutale inflige 30 % de dégâts en plus.',
  },
  rempartDeKaldor: {
    name: 'Rempart de Kaldor', classKey: 'guerrier', slotType: 'bouclier', primary: 'force',
    passive: { skill: 'cri-de-guerre', costDelta: -15 }, desc: 'Cri de Guerre coûte 15 Rage de moins.',
  },
  crocSanglant: {
    name: 'Croc Sanglant', classKey: 'voleur', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    passive: { skill: 'laceration', bleedDelta: 2 }, desc: 'Lacération fait saigner 2 tours de plus.',
  },
  murmureDeLOmbre: {
    name: "Murmure de l'Ombre", classKey: 'voleur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    passive: { skill: 'coup-vicieux', powerPct: 25 }, desc: 'Coup Vicieux inflige 25 % de dégâts en plus.',
  },
  benedictionDAube: {
    name: "Bénédiction d'Aube", classKey: 'pretre', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    passive: { skill: 'soin-majeur', powerPct: 25 }, desc: 'Soin Majeur soigne 25 % de plus.',
  },
  etoleDuPelerin: {
    name: 'Étole du Pèlerin', classKey: 'pretre', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    passive: { skill: 'eclat-de-lumiere', costDelta: -8 }, desc: 'Éclat de Lumière coûte 8 Mana de moins.',
  },
  coeurDeBrasier: {
    name: 'Cœur de Brasier', classKey: 'mage', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    passive: { skill: 'boule-de-feu', powerPct: 30 }, desc: 'Boule de Feu inflige 30 % de dégâts en plus.',
  },
  couronneDOrage: {
    name: "Couronne d'Orage", classKey: 'mage', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    passive: { skill: 'eclair', costDelta: -10 }, desc: 'Éclair coûte 10 Mana de moins.',
  },
};
