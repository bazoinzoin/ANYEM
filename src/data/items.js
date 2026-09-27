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
  // Divin : uniquement sur les boss, à partir de la difficulté Guerre (voir DIFFICULTIES).
  // Peut absorber le pouvoir unique d'un légendaire (Forge divine, game/forge.js).
  divin: { label: 'Divin', color: 'var(--r-divin)', secondaries: 5, mult: 1.8, range: [2.8, 3.6] },
};

export const RARITY_ORDER = Object.keys(RARITIES);

// Raretés des matéria : pas de matéria divine (un objet divin se décrafte en
// matéria légendaires et s'améliore avec elles).
export const MATERIA_RARITIES = RARITY_ORDER.filter((r) => r !== 'divin');

// Matéria : une sorte par catégorie d'équipement. Les armes donnent des matéria
// d'arme, les armures et boucliers des matéria d'armure, les bijoux des matéria de bijou.
// Elles servent à améliorer et à fabriquer les objets de leur catégorie.
export const MATERIA_KINDS = {
  arme: { label: "Matéria d'arme", icon: '⚔️' },
  armure: { label: "Matéria d'armure", icon: '🛡️' },
  bijou: { label: 'Matéria de bijou', icon: '💍' },
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
  // Chaque secondaire a la même chance de sortir ; à niveau et rareté égaux, l'esquive
  // (coup entièrement évité) vaut moins que le blocage (moitié des dégâts évitée).
  esquive: { base: 0.5, perLevel: 0.04 },
  blocage: { base: 1.5, perLevel: 0.15 },
  riposte: { base: 1, perLevel: 0.1 },
};

// Objets légendaires : noms tirés (plus ou moins librement) de la littérature française.
// Chaque orientation en a trois, chacun renforçant une compétence ou un passif de ses gros
// paliers ; les légendaires communs (sans classKey) vont à tout le monde. Un légendaire a
// toujours la même base et la même stat principale.
//   classKey  classe qui peut le porter (absent : toutes)
//   branch    orientation dont il renforce un gros palier (information)
//   power :
//     skillMod     modificateur de compétence (ou liste), même format que les talents
//                  (applySkillMod dans game/party.js : powerPct, costDelta, critBonus,
//                  dotPowerPct, dotTurnsDelta, effectTurnsDelta, effectPowerPct,
//                  addEffects, addSelfEffects, cleanse)
//     flat / pct / passive  bonus de stats, comme les talents (voir data/talents.js)
//     requires     id du nœud de talent sans lequel le pouvoir ne fait rien (passif renforcé)
//     startEffects effets posés sur toute l'équipe au début de chaque combat
//   Passifs propres aux légendaires communs (lus en combat, game/combat.js) :
//     freeMove     changer de position ne prend pas le tour, une fois par tour
//     echoChance   % de chance de refaire gratuitement l'attaque ou la compétence
//     dmgDealtPct  +% de dégâts infligés        hpCostPct  % des PV max perdus par attaque ou compétence
const fx = (id, turns, power) => (power === undefined ? { id, turns } : { id, turns, power });
export const LEGENDARIES = {
  // ---- Guerrier · Gardien ----
  statueDuCommandeur: {
    name: 'La Statue du Commandeur', classKey: 'guerrier', branch: 'gardien', slotType: 'plastron', armorType: 'lourde', primary: 'force',
    power: { skillMod: { skill: 'provocation', addSelfEffects: [fx('protection', 2)] } },
    desc: 'Gardien — Provocation donne aussi Protection (+50 % Défense et Défense magique, 2 tours) : on ne déplace pas la statue.',
  },
  lionDYvain: {
    name: "Le Lion d'Yvain", classKey: 'guerrier', branch: 'gardien', slotType: 'bouclier', primary: 'force',
    power: { requires: 'rempart', passive: { guardShieldPct: 15 } },
    desc: 'Gardien — Rempart : Défendre donne un Bouclier de 15 % des PV max en plus.',
  },
  durandal: {
    name: 'Durandal', classKey: 'guerrier', branch: 'gardien', slotType: 'arme', weaponType: 'epee', primary: 'force',
    power: { skillMod: { skill: 'mur-de-boucliers', costDelta: -15, effectPowerPct: 30 } },
    desc: 'Gardien — Mur de boucliers coûte 15 Rage de moins et protège 30 % de plus.',
  },
  // ---- Guerrier · Berserker ----
  lAssommoir: {
    name: "L'Assommoir", classKey: 'guerrier', branch: 'berserker', slotType: 'arme', weaponType: 'masse2m', primary: 'force',
    power: { skillMod: { skill: 'frappe-sauvage', costDelta: -10, powerPct: 20 } },
    desc: 'Berserker — Frappe sauvage coûte 10 Rage de moins et frappe 20 % plus fort.',
  },
  laBeteHumaine: {
    name: 'La Bête humaine', classKey: 'guerrier', branch: 'berserker', slotType: 'plastron', armorType: 'moyenne', primary: 'force',
    power: { requires: 'berserk', passive: { berserk: 2 } },
    desc: 'Berserker — Berserk : +2 % de puissance physique en plus par tranche de 10 % de PV manquants.',
  },
  gargantua: {
    name: 'Gargantua', classKey: 'guerrier', branch: 'berserker', slotType: 'arme', weaponType: 'hache2m', primary: 'force',
    power: { skillMod: { skill: 'tourbillon', powerPct: 35 } },
    desc: 'Berserker — Tourbillon inflige 35 % de dégâts en plus : un appétit de géant.',
  },
  // ---- Voleur · Assassin ----
  lorenzaccio: {
    name: 'Lorenzaccio', classKey: 'voleur', branch: 'assassin', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { skillMod: { skill: 'marque-de-la-mort', powerPct: 25 } },
    desc: 'Assassin — Marque de la mort inflige 25 % de dégâts en plus.',
  },
  leRougeEtLeNoir: {
    name: 'Le Rouge et le Noir', classKey: 'voleur', branch: 'assassin', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'deluge-de-lames', powerPct: 20, critBonus: 10 } },
    desc: 'Assassin — Déluge de lames inflige 20 % de dégâts en plus, avec +10 % de chance de critique.',
  },
  monocleDeLupin: {
    name: "Le Monocle d'Arsène Lupin", classKey: 'voleur', branch: 'assassin', slotType: 'casque', armorType: 'moyenne', primary: 'agilite',
    power: { requires: 'sceau-du-destin', passive: { critCombo: 1 } },
    desc: 'Assassin — Sceau du destin : un critique de générateur donne encore 1 point de combo de plus.',
  },
  // ---- Voleur · Empoisonneur ----
  fleursDuMal: {
    name: 'Les Fleurs du Mal', classKey: 'voleur', branch: 'empoisonneur', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { skillMod: { skill: 'lame-empoisonnee', dotTurnsDelta: 2, dotPowerPct: 25 } },
    desc: 'Empoisonneur — le poison de Lame empoisonnée dure 2 tours de plus et ronge 25 % plus fort.',
  },
  arsenicDEmma: {
    name: "L'Arsenic d'Emma", classKey: 'voleur', branch: 'empoisonneur', slotType: 'anneau', primary: 'agilite',
    power: { requires: 'venin-virulent', skillMod: { skill: 'lame-empoisonnee', addEffects: [fx('ralenti', 2)] } },
    desc: 'Empoisonneur — Venin virulent : Lame empoisonnée ralentit aussi la cible (2 tours).',
  },
  lapesteDOran: {
    name: "La Peste d'Oran", classKey: 'voleur', branch: 'empoisonneur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'fiole-de-peste', dotTurnsDelta: 1, dotPowerPct: 30 } },
    desc: 'Empoisonneur — Fiole de peste dure 1 tour de plus et empoisonne 30 % plus fort.',
  },
  // ---- Prêtre · Clerc ----
  chandeliersDeMyriel: {
    name: 'Les Chandeliers de Monseigneur Myriel', classKey: 'pretre', branch: 'clerc', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'priere-de-soins', costDelta: -5, powerPct: 25 } },
    desc: 'Clerc — Prière de soins coûte 5 Mana de moins et soigne 25 % de plus.',
  },
  graalDePerceval: {
    name: 'Le Graal de Perceval', classKey: 'pretre', branch: 'clerc', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'resurrection', costDelta: -20, powerPct: 75 } },
    desc: 'Clerc — Résurrection coûte 20 Mana de moins et relève avec 75 % de PV en plus (70 % au lieu de 40 %).',
  },
  roseDuPetitPrince: {
    name: 'La Rose du Petit Prince', classKey: 'pretre', branch: 'clerc', slotType: 'anneau', primary: 'intelligence',
    power: { requires: 'grace', skillMod: { skill: 'soin-majeur', addEffects: [fx('regeneration', 3, 0.2)] } },
    desc: 'Clerc — Grâce : Soin majeur laisse aussi une Régénération (3 tours). « C\'est le temps que tu as perdu pour ta rose… »',
  },
  // ---- Prêtre · Prêcheur ----
  oraisonsDeBossuet: {
    name: 'Les Oraisons de Bossuet', classKey: 'pretre', branch: 'precheur', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'renovation', effectTurnsDelta: 1, effectPowerPct: 25 } },
    desc: 'Prêcheur — Rénovation dure 1 tour de plus et soigne 25 % de plus.',
  },
  lesContemplations: {
    name: 'Les Contemplations', classKey: 'pretre', branch: 'precheur', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'bouclier-sacre', costDelta: -5, effectPowerPct: 30 } },
    desc: 'Prêcheur — Bouclier sacré coûte 5 Mana de moins et protège 30 % de plus.',
  },
  mystereDeJeanne: {
    name: 'Le Mystère de Jeanne d\'Arc', classKey: 'pretre', branch: 'precheur', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'jugement', powerPct: 30, dotTurnsDelta: 1 } },
    desc: 'Prêcheur — Jugement frappe 30 % plus fort et sa Brûlure dure 1 tour de plus.',
  },
  // ---- Prêtre · Profane ----
  leHorla: {
    name: 'Le Horla', classKey: 'pretre', branch: 'profane', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'confusion', addEffects: [fx('terreur', 2)] } },
    desc: 'Profane — Confusion inflige aussi la Terreur (−30 % Défenses, 2 tours). Il est là, invisible.',
  },
  chantsDeMaldoror: {
    name: 'Les Chants de Maldoror', classKey: 'pretre', branch: 'profane', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'fleau', dotTurnsDelta: 1, dotPowerPct: 25 } },
    desc: 'Profane — Fléau dure 1 tour de plus et ronge 25 % plus fort.',
  },
  chapeletDeTartuffe: {
    name: 'Le Chapelet de Tartuffe', classKey: 'pretre', branch: 'profane', slotType: 'collier', primary: 'intelligence',
    power: { requires: 'douleur-prolongee', skillMod: { skill: 'mot-de-douleur', dotPowerPct: 30 } },
    desc: 'Profane — Douleur prolongée : Mot de douleur ronge aussi 30 % plus fort, sous des airs de dévot.',
  },
  // ---- Mage · Feu ----
  saisonEnEnfer: {
    name: 'Une saison en enfer', classKey: 'mage', branch: 'feu', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'immolation', dotTurnsDelta: 2, dotPowerPct: 25 } },
    desc: 'Feu — Immolation brûle 2 tours de plus et 25 % plus fort.',
  },
  soleilDeMeursault: {
    name: 'Le Soleil de Meursault', classKey: 'mage', branch: 'feu', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: [{ skill: 'mur-de-flammes', dotTurnsDelta: 1, dotPowerPct: 30 }, { skill: 'pluie-de-feu', dotTurnsDelta: 1, dotPowerPct: 30 }] },
    desc: 'Feu — Mur de flammes et Pluie de feu brûlent 1 tour de plus et 30 % plus fort.',
  },
  salammbo: {
    name: 'Salammbô', classKey: 'mage', branch: 'feu', slotType: 'anneau', primary: 'intelligence',
    power: { skillMod: { skill: 'meteore', costDelta: -15, powerPct: 25 } },
    desc: 'Feu — Météore coûte 15 Mana de moins et frappe 25 % plus fort : Moloch a faim.',
  },
  // ---- Mage · Glace ----
  oTempsSuspendsTonVol: {
    name: 'Ô temps, suspends ton vol', classKey: 'mage', branch: 'glace', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'nova-de-givre', powerPct: 30, effectTurnsDelta: 1 } },
    desc: 'Glace — Nova de givre frappe 30 % plus fort et ralentit 1 tour de plus.',
  },
  soirDHiver: {
    name: "Soir d'hiver", classKey: 'mage', branch: 'glace', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'eclat-de-glace', effectTurnsDelta: 1, powerPct: 20 } },
    desc: 'Glace — Éclat de glace frappe 20 % plus fort et ralentit 1 tour de plus. « Ah ! comme la neige a neigé ! »',
  },
  leNautilus: {
    name: 'Le Nautilus', classKey: 'mage', branch: 'glace', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    power: { requires: 'eclatement', passive: { vsDebuffedPct: 12 } },
    desc: 'Glace — Éclatement : +12 % de dégâts en plus contre une cible qui subit un effet négatif.',
  },
  // ---- Mage · Foudre ----
  leRayonVert: {
    name: 'Le Rayon vert', classKey: 'mage', branch: 'foudre', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { requires: 'eclair-renforce', skillMod: { skill: 'eclair', critBonus: 25 } },
    desc: 'Foudre — Éclair renforcé : Éclair a aussi +25 % de chance de critique.',
  },
  tonnerreDeBrest: {
    name: 'Tonnerre de Brest', classKey: 'mage', branch: 'foudre', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'onde-de-choc', costDelta: -10, powerPct: 30 } },
    desc: 'Foudre — Onde de choc coûte 10 Mana de moins et frappe 30 % plus fort.',
  },
  lesChatiments: {
    name: 'Les Châtiments', classKey: 'mage', branch: 'foudre', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'tempete', costDelta: -15, powerPct: 10 } },
    desc: 'Foudre — Tempête coûte 15 Mana de moins et frappe 10 % plus fort.',
  },
  // ---- Chasseur · Œil de Faucon ----
  lAlbatros: {
    name: "L'Albatros", classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'arme', weaponType: 'arc', primary: 'agilite',
    power: { skillMod: { skill: 'tir-percant', costDelta: -10, powerPct: 20 } },
    desc: 'Œil de Faucon — Tir perçant coûte 10 Énergie de moins et frappe 20 % plus fort.',
  },
  arcDePhiloctete: {
    name: 'L\'Arc de Philoctète', classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'tir-de-l-aigle', costDelta: -15, critBonus: 10 } },
    desc: 'Œil de Faucon — Tir de l\'aigle coûte 15 Énergie de moins, avec +10 % de chance de critique.',
  },
  lievreEtTortue: {
    name: 'Le Lièvre et la Tortue', classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { requires: 'calme-du-tireur', passive: { resMaxBonus: 20, resRegen: 5 } },
    desc: 'Œil de Faucon — Calme du tireur : +20 Énergie maximum et +5 Énergie par tour. Rien ne sert de courir.',
  },
  // ---- Chasseur · Traqueur ----
  romanDeRenart: {
    name: 'Le Roman de Renart', classKey: 'chasseur', branch: 'traqueur', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'piege-a-machoires', costDelta: -10, effectPowerPct: 30 } },
    desc: 'Traqueur — Piège à mâchoires coûte 10 Énergie de moins et mord 30 % plus fort.',
  },
  loupEtAgneau: {
    name: "Le Loup et l'Agneau", classKey: 'chasseur', branch: 'traqueur', slotType: 'arme', weaponType: 'arc', primary: 'agilite',
    power: { requires: 'fleches-barbelees', skillMod: { skill: 'tir-rapide', costDelta: -5, powerPct: 15 } },
    desc: 'Traqueur — Flèches barbelées : Tir rapide coûte aussi 5 Énergie de moins et frappe 15 % plus fort.',
  },
  chevreDeSeguin: {
    name: 'La Chèvre de monsieur Seguin', classKey: 'chasseur', branch: 'traqueur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'champ-de-givre', effectTurnsDelta: 1, effectPowerPct: 30 } },
    desc: 'Traqueur — Champ de givre ralentit 1 tour de plus et ses pièges mordent 30 % plus fort.',
  },
  // ---- Paladin · Templier ----
  panacheDeCyrano: {
    name: 'Le Panache de Cyrano', classKey: 'paladin', branch: 'templier', slotType: 'casque', armorType: 'lourde', primary: 'force',
    power: { skillMod: { skill: 'intercession', costDelta: -5, effectTurnsDelta: 2 } },
    desc: 'Templier — Intercession coûte 5 Mana de moins et dure 2 tours de plus.',
  },
  epeeDeRodrigue: {
    name: 'L\'Épée de Rodrigue', classKey: 'paladin', branch: 'templier', slotType: 'arme', weaponType: 'epee', primary: 'force',
    power: { requires: 'vengeance-sacree', passive: { lifestealPct: 8 } },
    desc: 'Templier — Vengeance sacrée : 8 % des dégâts infligés rendus en PV en plus. « Rodrigue, as-tu du cœur ? »',
  },
  etendardDeLaPucelle: {
    name: "L'Étendard de la Pucelle", classKey: 'paladin', branch: 'templier', slotType: 'bouclier', primary: 'force',
    power: { skillMod: { skill: 'sceau-de-vie', powerPct: 30, effectPowerPct: 30 } },
    desc: 'Templier — Sceau de vie soigne 30 % de plus, sur le coup comme sur la durée.',
  },
  // ---- Paladin · Lumière ----
  demainDesLAube: {
    name: "Demain, dès l'aube", classKey: 'paladin', branch: 'lumiere', slotType: 'arme', weaponType: 'masse', primary: 'intelligence',
    power: { skillMod: { skill: 'lumiere-de-l-aube', cleanse: true } },
    desc: "Lumière — Lumière de l'aube retire aussi tous les effets négatifs de l'équipe.",
  },
  roseEtReseda: {
    name: 'La Rose et le Réséda', classKey: 'paladin', branch: 'lumiere', slotType: 'collier', primary: 'intelligence',
    power: { requires: 'main-de-lumiere', skillMod: { skill: 'lumiere-sacree', costDelta: -5, powerPct: 15 } },
    desc: 'Lumière — Main de lumière : Lumière sacrée coûte encore 5 Mana de moins et soigne 15 % de plus.',
  },
  nourrituresTerrestres: {
    name: 'Les Nourritures terrestres', classKey: 'paladin', branch: 'lumiere', slotType: 'anneau', primary: 'intelligence',
    power: { skillMod: { skill: 'sceau-de-protection', effectTurnsDelta: 1, effectPowerPct: 30 } },
    desc: 'Lumière — Sceau de protection dure 1 tour de plus ; son Bouclier et sa Régénération valent 30 % de plus.',
  },
  // ---- Communs à toutes les classes ----
  plumeLegere: {
    name: 'Plume légère', slotType: 'bottes', armorType: 'legere', primary: 'intelligence',
    power: { passive: { freeMove: 1 } },
    desc: 'Changer de position (avancer ou reculer) ne prend pas le tour, une fois par tour.',
  },
  fratricide: {
    name: 'Fratricide', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { passive: { echoChance: 15 } },
    desc: '15 % de chance de refaire gratuitement la dernière attaque ou compétence.',
  },
  coeurSacrifie: {
    name: 'Cœur sacrifié', slotType: 'collier', primary: 'force',
    power: { passive: { dmgDealtPct: 15, hpCostPct: 10 } },
    desc: 'Les dégâts infligés sont augmentés de 15 %, mais chaque attaque ou compétence coûte 10 % des PV max.',
  },
  bottesDeSeptLieues: {
    name: 'Les Bottes de sept lieues', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { pct: { vit: 25 } },
    desc: '+25 % de Vitesse : on joue plus tôt dans le round.',
  },
  olifantDeRoland: {
    name: "L'Olifant de Roland", slotType: 'collier', primary: 'intelligence',
    power: { startEffects: [fx('puissance', 2)] },
    desc: "Au début de chaque combat, toute l'équipe reçoit Puissance (+25 % de puissance physique et magique, 2 tours).",
  },
};
