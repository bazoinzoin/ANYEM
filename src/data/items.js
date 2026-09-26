// Données d'équipement (voir DESIGN_DOC §2 « Les Equipements »).

// Emplacements d'un héros. `accepts` : types d'emplacement d'objet acceptés.
export const SLOTS = {
  casque: { label: 'Casque', accepts: ['casque'] },
  epaulieres: { label: 'Épaulières', accepts: ['epaulieres'] },
  plastron: { label: 'Plastron', accepts: ['plastron'] },
  gants: { label: 'Gants', accepts: ['gants'] },
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
  casque: 0.6, epaulieres: 0.5, plastron: 1.0, gants: 0.4, bottes: 0.5,
};

export const ARMOR_TYPES = {
  lourde: {
    label: 'Armure lourde', defMult: 1.5, primaries: ['force', 'agilite', 'intelligence'],
    names: { casque: 'Heaume', epaulieres: 'Spallières', plastron: 'Cuirasse', gants: 'Gantelets', bottes: 'Solerets' },
  },
  moyenne: {
    label: 'Armure moyenne', defMult: 1.0, primaries: ['force', 'agilite', 'intelligence'],
    names: { casque: 'Casque de cuir', epaulieres: 'Épaulières de cuir', plastron: 'Brigandine', gants: 'Gants de cuir', bottes: 'Bottes de cuir' },
  },
  legere: {
    label: 'Armure légère', defMult: 0.6, primaries: ['force', 'agilite', 'intelligence'],
    names: { casque: 'Capuche', epaulieres: 'Mantelet', plastron: 'Robe', gants: 'Mitaines', bottes: 'Sandales' },
  },
};

// Armes, de la plus lente à la plus rapide.
//   atqMult    puissance relative (les armes lentes frappent plus fort)
//   speed      coefficient de vitesse d'attaque : multiplie la Vitesse du héros
//              (moyenne des deux armes en ambidextrie ; 1 sans arme)
//   range      'melee' (corps à corps) ou 'ranged' (distance) : une arme ne sert
//              que depuis la position correspondante (voir game/position.js)
//   twoHanded  occupe les deux mains
// Toute arme peut sortir en Force, Agilité ou Intelligence (stat principale) : une
// épée de Force ira au Guerrier ou au Paladin Templier, d'Agilité au Voleur,
// d'Intelligence au Paladin Lumière.
const ALL_PRIMARIES = ['force', 'agilite', 'intelligence'];
export const WEAPON_TYPES = {
  masse2m: { name: 'Masse à deux mains', label: 'Arme à deux mains', atqMult: 1.8, speed: 0.8, range: 'melee', twoHanded: true, primaries: ALL_PRIMARIES },
  hache2m: { name: 'Hache à deux mains', label: 'Arme à deux mains', atqMult: 1.65, speed: 0.84, range: 'melee', twoHanded: true, primaries: ALL_PRIMARIES },
  epee2m: { name: 'Épée à deux mains', label: 'Arme à deux mains', atqMult: 1.5, speed: 0.88, range: 'melee', twoHanded: true, primaries: ALL_PRIMARIES },
  baton: { name: 'Bâton', label: 'Arme à deux mains', atqMult: 1.45, speed: 0.92, range: 'melee', twoHanded: true, primaries: ALL_PRIMARIES },
  arc: { name: 'Arc', label: 'Arme à deux mains', atqMult: 1.4, speed: 0.96, range: 'ranged', twoHanded: true, primaries: ALL_PRIMARIES },
  masse: { name: 'Masse', label: 'Arme à une main', atqMult: 1.15, speed: 1.0, range: 'melee', primaries: ALL_PRIMARIES },
  hache: { name: 'Hache', label: 'Arme à une main', atqMult: 1.0, speed: 1.04, range: 'melee', primaries: ALL_PRIMARIES },
  epee: { name: 'Épée', label: 'Arme à une main', atqMult: 0.9, speed: 1.08, range: 'melee', primaries: ALL_PRIMARIES },
  dague: { name: 'Dague', label: 'Arme à une main', atqMult: 0.7, speed: 1.12, range: 'melee', primaries: ALL_PRIMARIES },
};

export const RANGE_LABELS = { melee: 'Corps à corps', ranged: 'Distance' };

// Bouclier : exception, deux stats obligatoires (Armure et Blocage). Le Blocage
// peut en plus ressortir en stat secondaire (repeatableSecondaries).
export const SHIELD = { name: 'Bouclier', label: 'Bouclier', primaries: ['force', 'intelligence'], repeatableSecondaries: ['blocage'] };

// Bijoux : troisième catégorie d'équipement (avec les armes et les armures). Aucune
// stat obligatoire : seulement une stat principale (Force, Agilité ou Intelligence),
// plus forte que sur les autres pièces (weight = poids de la stat principale ; une
// arme à deux mains est à 1,6, un plastron à 1), puis les secondaires de la rareté.
export const JEWELS = {
  anneau: { name: 'Anneau', label: 'Bijou', weight: 1.8 },
  collier: { name: 'Collier', label: 'Bijou', weight: 2.2 },
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
  riposte: { base: 1, perLevel: 0.1 },
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
    name: 'Colère Ancestrale', classKey: 'guerrier', slotType: 'arme', weaponType: 'masse2m', primary: 'force',
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
  masseDeLAurore: {
    name: "Masse de l'Aurore", classKey: 'paladin', slotType: 'arme', weaponType: 'masse', primary: 'intelligence',
    passive: { skill: 'lumiere-sacree', costDelta: -8, powerPct: 20 }, desc: 'Lumière — Lumière sacrée coûte 8 Mana de moins et soigne 20 % de plus.',
  },
};
