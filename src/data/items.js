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

// Matéria obtenues au décraft : les armes donnent des matéria d'arme, tout le
// reste (armures, boucliers, bijoux) des matéria d'armure.
export const MATERIA_KINDS = {
  arme: { label: "Matéria d'arme", icon: '⚔️' },
  armure: { label: "Matéria d'armure", icon: '🛡️' },
};

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

// Armes. atqMult : puissance relative ; twoHanded : occupe les deux mains.
// (Un objet commun ne porte que sa stat obligatoire et sa stat principale : pas de
// bonus de vitesse lié au type d'arme.)
export const WEAPON_TYPES = {
  epee: { name: 'Épée', label: 'Arme à une main', atqMult: 0.9, primaries: ['force', 'agilite'] },
  hache: { name: 'Hache', label: 'Arme à une main', atqMult: 1.0, primaries: ['force', 'agilite'] },
  marteau: { name: 'Marteau', label: 'Arme à une main', atqMult: 1.15, primaries: ['force', 'agilite'] },
  dague: { name: 'Dague', label: 'Dague', atqMult: 0.7, primaries: ['agilite', 'intelligence'] },
  sceptre: { name: 'Sceptre', label: 'Arme à une main', atqMult: 0.8, primaries: ['intelligence'] },
  epee2m: { name: 'Espadon', label: 'Arme à deux mains', atqMult: 1.5, primaries: ['force'], twoHanded: true },
  hache2m: { name: 'Grande hache', label: 'Arme à deux mains', atqMult: 1.65, primaries: ['force'], twoHanded: true },
  marteau2m: { name: 'Maillet de guerre', label: 'Arme à deux mains', atqMult: 1.8, primaries: ['force'], twoHanded: true },
  baton: { name: 'Bâton', label: 'Bâton magique', atqMult: 1.4, primaries: ['intelligence'], twoHanded: true },
  arc: { name: 'Arc', label: 'Arc (distance)', atqMult: 1.5, primaries: ['agilite'], twoHanded: true },
};

// Bouclier : exception, deux stats obligatoires (Défense et Blocage). Le Blocage
// peut en plus ressortir en stat secondaire (repeatableSecondaries).
export const SHIELD = { name: 'Bouclier', label: 'Bouclier', primaries: ['force', 'intelligence'], repeatableSecondaries: ['blocage'] };

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

// Objets légendaires : liés à une classe, avec un passif unique qui renforce une
// compétence d'une orientation (même format que les skillMod des talents, voir
// applySkillMod dans game/party.js : powerPct, costDelta, dotPowerPct,
// effectTurnsDelta, effectPowerPct…). Un par orientation.
export const LEGENDARIES = {
  // Guerrier
  rempartDeKaldor: {
    name: 'Rempart de Kaldor', classKey: 'guerrier', slotType: 'bouclier', primary: 'force',
    passive: { skill: 'mur-de-boucliers', costDelta: -15, effectPowerPct: 20 }, desc: 'Gardien — Mur de boucliers coûte 15 Rage de moins et protège 20 % de plus.',
  },
  colereAncestrale: {
    name: 'Colère Ancestrale', classKey: 'guerrier', slotType: 'arme', weaponType: 'marteau2m', primary: 'force',
    passive: { skill: 'tourbillon', powerPct: 30 }, desc: 'Berserker — Tourbillon inflige 30 % de dégâts en plus.',
  },
  // Voleur
  murmureDeLOmbre: {
    name: "Murmure de l'Ombre", classKey: 'voleur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    passive: { skill: 'deluge-de-lames', powerPct: 25 }, desc: 'Assassin — Déluge de lames inflige 25 % de dégâts en plus.',
  },
  crocSanglant: {
    name: 'Croc Sanglant', classKey: 'voleur', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    passive: { skill: 'lame-empoisonnee', dotTurnsDelta: 2 }, desc: 'Empoisonneur — le poison de Lame empoisonnée dure 2 tours de plus.',
  },
  // Prêtre
  benedictionDAube: {
    name: "Bénédiction d'Aube", classKey: 'pretre', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    passive: { skill: 'priere-de-soins', powerPct: 25 }, desc: 'Clerc — Prière de soins soigne 25 % de plus.',
  },
  etoleDuPelerin: {
    name: 'Étole du Pèlerin', classKey: 'pretre', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    passive: { skill: 'renovation', effectTurnsDelta: 2 }, desc: 'Prêcheur — Rénovation dure 2 tours de plus.',
  },
  voileDuNeant: {
    name: 'Voile du Néant', classKey: 'pretre', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    passive: { skill: 'mot-de-douleur', dotPowerPct: 30 }, desc: 'Profane — Mot de douleur inflige 30 % de dégâts de ténèbres en plus.',
  },
  // Mage
  coeurDeBrasier: {
    name: 'Cœur de Brasier', classKey: 'mage', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    passive: { skill: 'immolation', dotPowerPct: 30 }, desc: 'Feu — Immolation brûle 30 % plus fort.',
  },
  larmeDeGlace: {
    name: 'Larme de Glace éternelle', classKey: 'mage', slotType: 'collier', primary: 'intelligence',
    passive: { skill: 'nova-de-givre', powerPct: 25, costDelta: -5 }, desc: 'Glace — Nova de givre inflige 25 % de dégâts en plus et coûte 5 Mana de moins.',
  },
  couronneDOrage: {
    name: "Couronne d'Orage", classKey: 'mage', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    passive: { skill: 'tempete', costDelta: -15 }, desc: 'Foudre — Tempête coûte 15 Mana de moins.',
  },
  // Chasseur
  serreDuFaucon: {
    name: 'Serre du Faucon', classKey: 'chasseur', slotType: 'arme', weaponType: 'arc', primary: 'agilite',
    passive: { skill: 'tir-percant', powerPct: 30 }, desc: 'Œil de Faucon — Tir perçant inflige 30 % de dégâts en plus.',
  },
  bottesDuTraqueur: {
    name: 'Bottes du Traqueur', classKey: 'chasseur', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    passive: { skill: 'piege-a-machoires', effectPowerPct: 40, costDelta: -5 }, desc: 'Traqueur — Piège à mâchoires inflige 40 % de dégâts en plus et coûte 5 Énergie de moins.',
  },
  // Paladin
  egideDuCroise: {
    name: 'Égide du Croisé', classKey: 'paladin', slotType: 'bouclier', primary: 'force',
    passive: { skill: 'sceau-de-vie', powerPct: 30, effectPowerPct: 30 }, desc: 'Templier — Sceau de vie soigne 30 % de plus.',
  },
  sceptreDeLAurore: {
    name: "Sceptre de l'Aurore", classKey: 'paladin', slotType: 'arme', weaponType: 'sceptre', primary: 'intelligence',
    passive: { skill: 'lumiere-sacree', costDelta: -8, powerPct: 20 }, desc: 'Lumière — Lumière sacrée coûte 8 Mana de moins et soigne 20 % de plus.',
  },
};
