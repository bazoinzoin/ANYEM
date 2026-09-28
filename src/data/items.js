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
  // Mana maximum : utile aux seules classes à Mana (les autres la changent chez le Runomancien).
  mana: { base: 1, perLevel: 0.1 },
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
//   quote   citation (clin d'œil discret à l'œuvre dont le nom s'inspire), affichée sous le pouvoir
//   Passifs propres aux légendaires communs (lus en combat, game/combat.js) :
//     freeMove     changer de position ne prend pas le tour, une fois par tour
//     echoChance   % de chance de refaire gratuitement l'attaque ou la compétence
//     dmgDealtPct  +% de dégâts infligés        hpCostPct  % des PV max perdus par attaque ou compétence
const fx = (id, turns, power) => (power === undefined ? { id, turns } : { id, turns, power });
export const LEGENDARIES = {
  // ---- Guerrier · Gardien ----
  statueDuCommandeur: {
    name: 'Le Convive de pierre', classKey: 'guerrier', branch: 'gardien', slotType: 'plastron', armorType: 'lourde', primary: 'force',
    power: { skillMod: { skill: 'provocation', addSelfEffects: [fx('protection', 2)] } },
    desc: 'Gardien — Provocation donne aussi Protection (+50 % Défense et Défense magique, 2 tours).',
    quote: 'Un invité de pierre ne manque jamais le souper.',
  },
  lionDYvain: {
    name: 'Le Lion fidèle', classKey: 'guerrier', branch: 'gardien', slotType: 'bouclier', primary: 'force',
    power: { requires: 'rempart', passive: { guardShieldPct: 15 } },
    desc: 'Gardien — Rempart : Défendre donne un Bouclier de 15 % des PV max en plus.',
    quote: 'Le lion ne quitte plus le chevalier qui l\'a sauvé du serpent.',
  },
  durandal: {
    name: 'Durandal', classKey: 'guerrier', branch: 'gardien', slotType: 'arme', weaponType: 'epee', primary: 'force',
    power: { skillMod: { skill: 'mur-de-boucliers', costDelta: -15, effectPowerPct: 30 } },
    desc: 'Gardien — Mur de boucliers coûte 15 Rage de moins et protège 30 % de plus.',
    quote: 'Roland est preux, et Olivier est sage.',
  },
  // ---- Guerrier · Berserker ----
  lAssommoir: {
    name: 'Vitriol', classKey: 'guerrier', branch: 'berserker', slotType: 'arme', weaponType: 'masse2m', primary: 'force',
    power: { skillMod: { skill: 'frappe-sauvage', costDelta: -10, powerPct: 20 } },
    desc: 'Berserker — Frappe sauvage coûte 10 Rage de moins et frappe 20 % plus fort.',
    quote: 'Encore une tournée, et le zinc se met à tanguer.',
  },
  laBeteHumaine: {
    name: 'La Lison', classKey: 'guerrier', branch: 'berserker', slotType: 'plastron', armorType: 'moyenne', primary: 'force',
    power: { requires: 'berserk', passive: { berserk: 2 } },
    desc: 'Berserker — Berserk : +2 % de puissance physique en plus par tranche de 10 % de PV manquants.',
    quote: 'Sous la vapeur, une faim de sang qui revient par crises.',
  },
  gargantua: {
    name: 'L\'Appétit du géant', classKey: 'guerrier', branch: 'berserker', slotType: 'arme', weaponType: 'hache2m', primary: 'force',
    power: { skillMod: { skill: 'tourbillon', powerPct: 35 } },
    desc: 'Berserker — Tourbillon inflige 35 % de dégâts en plus.',
    quote: 'Fais ce que voudras.',
  },
  // ---- Voleur · Assassin ----
  lorenzaccio: {
    name: 'Lame de Florence', classKey: 'voleur', branch: 'assassin', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { skillMod: { skill: 'marque-de-la-mort', powerPct: 25 } },
    desc: 'Assassin — Marque de la mort inflige 25 % de dégâts en plus.',
    quote: 'Un masque de débauché sur un cœur de tyrannicide.',
  },
  leRougeEtLeNoir: {
    name: 'Gants de Verrières', classKey: 'voleur', branch: 'assassin', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'deluge-de-lames', powerPct: 20, critBonus: 10 } },
    desc: 'Assassin — Déluge de lames inflige 20 % de dégâts en plus, avec +10 % de chance de critique.',
    quote: 'Un roman : c\'est un miroir qu\'on promène le long d\'un chemin.',
  },
  monocleDeLupin: {
    name: 'Monocle du gentleman', classKey: 'voleur', branch: 'assassin', slotType: 'casque', armorType: 'moyenne', primary: 'agilite',
    power: { requires: 'sceau-du-destin', passive: { critCombo: 1 } },
    desc: 'Assassin — Sceau du destin : un critique de générateur donne encore 1 point de combo de plus.',
    quote: 'Un gentleman ne prend que ce qui en vaut la peine.',
  },
  // ---- Voleur · Empoisonneur ----
  fleursDuMal: {
    name: 'Fleur maladive', classKey: 'voleur', branch: 'empoisonneur', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { skillMod: { skill: 'lame-empoisonnee', dotTurnsDelta: 2, dotPowerPct: 25 } },
    desc: 'Empoisonneur — le poison de Lame empoisonnée dure 2 tours de plus et ronge 25 % plus fort.',
    quote: 'Hypocrite lecteur, — mon semblable, — mon frère !',
  },
  arsenicDEmma: {
    name: 'Anneau de Yonville', classKey: 'voleur', branch: 'empoisonneur', slotType: 'anneau', primary: 'agilite',
    power: { requires: 'venin-virulent', skillMod: { skill: 'lame-empoisonnee', addEffects: [fx('ralenti', 2)] } },
    desc: 'Empoisonneur — Venin virulent : Lame empoisonnée ralentit aussi la cible (2 tours).',
    quote: 'Cet affreux goût d\'encre…',
  },
  lapesteDOran: {
    name: 'Gants d\'Oran', classKey: 'voleur', branch: 'empoisonneur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'fiole-de-peste', dotTurnsDelta: 1, dotPowerPct: 30 } },
    desc: 'Empoisonneur — Fiole de peste dure 1 tour de plus et empoisonne 30 % plus fort.',
    quote: 'Le bacille ne meurt ni ne disparaît jamais.',
  },
  // ---- Prêtre · Clerc ----
  chandeliersDeMyriel: {
    name: 'Chandeliers d\'argent', classKey: 'pretre', branch: 'clerc', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'priere-de-soins', costDelta: -5, powerPct: 25 } },
    desc: 'Clerc — Prière de soins coûte 5 Mana de moins et soigne 25 % de plus.',
    quote: 'Je vous avais donné aussi les chandeliers.',
  },
  graalDePerceval: {
    name: 'Coupe du Roi pêcheur', classKey: 'pretre', branch: 'clerc', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'resurrection', costDelta: -20, powerPct: 75 } },
    desc: 'Clerc — Résurrection coûte 20 Mana de moins et relève avec 75 % de PV en plus (70 % au lieu de 40 %).',
    quote: 'Qui sert-on avec cette coupe ?',
  },
  roseDuPetitPrince: {
    name: 'Rose de l\'astéroïde', classKey: 'pretre', branch: 'clerc', slotType: 'anneau', primary: 'intelligence',
    power: { requires: 'grace', skillMod: { skill: 'soin-majeur', addEffects: [fx('regeneration', 3, 0.2)] } },
    desc: 'Clerc — Grâce : Soin majeur laisse aussi une Régénération (3 tours).',
    quote: 'C\'est le temps que tu as perdu pour ta rose…',
  },
  // ---- Prêtre · Prêcheur ----
  oraisonsDeBossuet: {
    name: 'Oraison funèbre', classKey: 'pretre', branch: 'precheur', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'renovation', effectTurnsDelta: 1, effectPowerPct: 25 } },
    desc: 'Prêcheur — Rénovation dure 1 tour de plus et soigne 25 % de plus.',
    quote: 'Madame se meurt, Madame est morte !',
  },
  lesContemplations: {
    name: 'Bâton de Guernesey', classKey: 'pretre', branch: 'precheur', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'bouclier-sacre', costDelta: -5, effectPowerPct: 30 } },
    desc: 'Prêcheur — Bouclier sacré coûte 5 Mana de moins et protège 30 % de plus.',
    quote: 'Elle était pâle, et pourtant rose.',
  },
  mystereDeJeanne: {
    name: 'Flamme de Domrémy', classKey: 'pretre', branch: 'precheur', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'jugement', powerPct: 30, dotTurnsDelta: 1 } },
    desc: 'Prêcheur — Jugement frappe 30 % plus fort et sa Brûlure dure 1 tour de plus.',
    quote: 'Une petite flamme qui ne demande rien, et qui ne s\'éteint pas.',
  },
  // ---- Prêtre · Profane ----
  leHorla: {
    name: 'L\'Invisible', classKey: 'pretre', branch: 'profane', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'confusion', addEffects: [fx('terreur', 2)] } },
    desc: 'Profane — Confusion inflige aussi la Terreur (−30 % Défenses, 2 tours).',
    quote: 'Il est là, près de moi, et je ne le vois pas.',
  },
  chantsDeMaldoror: {
    name: 'Vieil Océan', classKey: 'pretre', branch: 'profane', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'fleau', dotTurnsDelta: 1, dotPowerPct: 25 } },
    desc: 'Profane — Fléau dure 1 tour de plus et ronge 25 % plus fort.',
    quote: 'Beau comme la rencontre fortuite sur une table de dissection d\'une machine à coudre et d\'un parapluie !',
  },
  chapeletDeTartuffe: {
    name: 'Chapelet du dévot', classKey: 'pretre', branch: 'profane', slotType: 'collier', primary: 'intelligence',
    power: { requires: 'douleur-prolongee', skillMod: { skill: 'mot-de-douleur', dotPowerPct: 30 } },
    desc: 'Profane — Douleur prolongée : Mot de douleur ronge aussi 30 % plus fort.',
    quote: 'Couvrez ce sein que je ne saurais voir.',
  },
  // ---- Mage · Feu ----
  saisonEnEnfer: {
    name: 'Bâton du voyant', classKey: 'mage', branch: 'feu', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'immolation', dotTurnsDelta: 2, dotPowerPct: 25 } },
    desc: 'Feu — Immolation brûle 2 tours de plus et 25 % plus fort.',
    quote: 'Jadis, si je me souviens bien, ma vie était un festin.',
  },
  soleilDeMeursault: {
    name: 'Soleil d\'Alger', classKey: 'mage', branch: 'feu', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: [{ skill: 'mur-de-flammes', dotTurnsDelta: 1, dotPowerPct: 30 }, { skill: 'pluie-de-feu', dotTurnsDelta: 1, dotPowerPct: 30 }] },
    desc: 'Feu — Mur de flammes et Pluie de feu brûlent 1 tour de plus et 30 % plus fort.',
    quote: 'C\'était le même soleil, sur la plage, et la même lumière.',
  },
  salammbo: {
    name: 'Voile de Tanit', classKey: 'mage', branch: 'feu', slotType: 'anneau', primary: 'intelligence',
    power: { skillMod: { skill: 'meteore', costDelta: -15, powerPct: 25 } },
    desc: 'Feu — Météore coûte 15 Mana de moins et frappe 25 % plus fort.',
    quote: 'C\'était à Mégara, faubourg de Carthage, dans les jardins d\'Hamilcar.',
  },
  // ---- Mage · Glace ----
  oTempsSuspendsTonVol: {
    name: 'Sablier du lac', classKey: 'mage', branch: 'glace', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'nova-de-givre', powerPct: 30, effectTurnsDelta: 1 } },
    desc: 'Glace — Nova de givre frappe 30 % plus fort et ralentit 1 tour de plus.',
    quote: 'Ô temps, suspends ton vol !',
  },
  soirDHiver: {
    name: 'Vitre de givre', classKey: 'mage', branch: 'glace', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'eclat-de-glace', effectTurnsDelta: 1, powerPct: 20 } },
    desc: 'Glace — Éclat de glace frappe 20 % plus fort et ralentit 1 tour de plus.',
    quote: 'Ah ! comme la neige a neigé !',
  },
  leNautilus: {
    name: 'Mobilis', classKey: 'mage', branch: 'glace', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    power: { requires: 'eclatement', passive: { vsDebuffedPct: 12 } },
    desc: 'Glace — Éclatement : +12 % de dégâts en plus contre une cible qui subit un effet négatif.',
    quote: 'Mobilis in mobili.',
  },
  // ---- Mage · Foudre ----
  leRayonVert: {
    name: 'Le Dernier rayon', classKey: 'mage', branch: 'foudre', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { requires: 'eclair-renforce', skillMod: { skill: 'eclair', critBonus: 25 } },
    desc: 'Foudre — Éclair renforcé : Éclair a aussi +25 % de chance de critique.',
    quote: 'Qui l\'a vu ne peut plus se tromper en amour.',
  },
  tonnerreDeBrest: {
    name: 'Mille sabords', classKey: 'mage', branch: 'foudre', slotType: 'casque', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'onde-de-choc', costDelta: -10, powerPct: 30 } },
    desc: 'Foudre — Onde de choc coûte 10 Mana de moins et frappe 30 % plus fort.',
    quote: 'Mille millions de mille sabords !',
  },
  lesChatiments: {
    name: 'Morne plaine', classKey: 'mage', branch: 'foudre', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'tempete', costDelta: -15, powerPct: 10 } },
    desc: 'Foudre — Tempête coûte 15 Mana de moins et frappe 10 % plus fort.',
    quote: 'Waterloo ! Waterloo ! Waterloo ! morne plaine !',
  },
  // ---- Chasseur · Œil de Faucon ----
  lAlbatros: {
    name: 'Prince des nuées', classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'arme', weaponType: 'arc', primary: 'agilite',
    power: { skillMod: { skill: 'tir-percant', costDelta: -10, powerPct: 20 } },
    desc: 'Œil de Faucon — Tir perçant coûte 10 Énergie de moins et frappe 20 % plus fort.',
    quote: 'Ses ailes de géant l\'empêchent de marcher.',
  },
  arcDePhiloctete: {
    name: 'Gants de Lemnos', classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'tir-de-l-aigle', costDelta: -15, critBonus: 10 } },
    desc: 'Œil de Faucon — Tir de l\'aigle coûte 15 Énergie de moins, avec +10 % de chance de critique.',
    quote: 'Sans cet arc, Troie ne tombera pas.',
  },
  lievreEtTortue: {
    name: 'Partir à point', classKey: 'chasseur', branch: 'oeilDeFaucon', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { requires: 'calme-du-tireur', passive: { resMaxBonus: 20, resRegen: 5 } },
    desc: 'Œil de Faucon — Calme du tireur : +20 Énergie maximum et +5 Énergie par tour.',
    quote: 'Rien ne sert de courir ; il faut partir à point.',
  },
  // ---- Chasseur · Traqueur ----
  romanDeRenart: {
    name: 'Bottes du goupil', classKey: 'chasseur', branch: 'traqueur', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'piege-a-machoires', costDelta: -10, effectPowerPct: 30 } },
    desc: 'Traqueur — Piège à mâchoires coûte 10 Énergie de moins et mord 30 % plus fort.',
    quote: 'Le goupil ne court jamais : il attend que la proie vienne.',
  },
  loupEtAgneau: {
    name: 'La Raison du loup', classKey: 'chasseur', branch: 'traqueur', slotType: 'arme', weaponType: 'arc', primary: 'agilite',
    power: { requires: 'fleches-barbelees', skillMod: { skill: 'tir-rapide', costDelta: -5, powerPct: 15 } },
    desc: 'Traqueur — Flèches barbelées : Tir rapide coûte aussi 5 Énergie de moins et frappe 15 % plus fort.',
    quote: 'La raison du plus fort est toujours la meilleure.',
  },
  chevreDeSeguin: {
    name: 'Blanquette', classKey: 'chasseur', branch: 'traqueur', slotType: 'gants', armorType: 'moyenne', primary: 'agilite',
    power: { skillMod: { skill: 'champ-de-givre', effectTurnsDelta: 1, effectPowerPct: 30 } },
    desc: 'Traqueur — Champ de givre ralentit 1 tour de plus et ses pièges mordent 30 % plus fort.',
    quote: 'Et puis, le matin, le loup la mangea.',
  },
  // ---- Paladin · Templier ----
  panacheDeCyrano: {
    name: 'Le Panache', classKey: 'paladin', branch: 'templier', slotType: 'casque', armorType: 'lourde', primary: 'force',
    power: { skillMod: { skill: 'intercession', costDelta: -5, effectTurnsDelta: 2 } },
    desc: 'Templier — Intercession coûte 5 Mana de moins et dure 2 tours de plus.',
    quote: 'C\'est un roc !… c\'est un pic !… c\'est un cap !',
  },
  epeeDeRodrigue: {
    name: 'Tizona', classKey: 'paladin', branch: 'templier', slotType: 'arme', weaponType: 'epee', primary: 'force',
    power: { requires: 'vengeance-sacree', passive: { lifestealPct: 8 } },
    desc: 'Templier — Vengeance sacrée : 8 % des dégâts infligés rendus en PV en plus.',
    quote: 'À vaincre sans péril, on triomphe sans gloire.',
  },
  etendardDeLaPucelle: {
    name: 'Étendard d\'Orléans', classKey: 'paladin', branch: 'templier', slotType: 'bouclier', primary: 'force',
    power: { skillMod: { skill: 'sceau-de-vie', powerPct: 30, effectPowerPct: 30 } },
    desc: 'Templier — Sceau de vie soigne 30 % de plus, sur le coup comme sur la durée.',
    quote: 'Il avait été à la peine, c\'était bien raison qu\'il fût à l\'honneur.',
  },
  // ---- Paladin · Lumière ----
  demainDesLAube: {
    name: 'Houx et bruyère', classKey: 'paladin', branch: 'lumiere', slotType: 'arme', weaponType: 'masse', primary: 'intelligence',
    power: { skillMod: { skill: 'lumiere-de-l-aube', cleanse: true } },
    desc: "Lumière — Lumière de l'aube retire aussi tous les effets négatifs de l'équipe.",
    quote: 'Demain, dès l\'aube, à l\'heure où blanchit la campagne…',
  },
  roseEtReseda: {
    name: 'Ciel partagé', classKey: 'paladin', branch: 'lumiere', slotType: 'collier', primary: 'intelligence',
    power: { requires: 'main-de-lumiere', skillMod: { skill: 'lumiere-sacree', costDelta: -5, powerPct: 15 } },
    desc: 'Lumière — Main de lumière : Lumière sacrée coûte encore 5 Mana de moins et soigne 15 % de plus.',
    quote: 'Celui qui croyait au ciel, celui qui n\'y croyait pas.',
  },
  nourrituresTerrestres: {
    name: 'Anneau de ferveur', classKey: 'paladin', branch: 'lumiere', slotType: 'anneau', primary: 'intelligence',
    power: { skillMod: { skill: 'sceau-de-protection', effectTurnsDelta: 1, effectPowerPct: 30 } },
    desc: 'Lumière — Sceau de protection dure 1 tour de plus ; son Bouclier et sa Régénération valent 30 % de plus.',
    quote: 'Nathanaël, je t\'enseignerai la ferveur.',
  },
  // ---- Scarifié · Acharné ----
  clefTachee: {
    name: 'Clef tachée', classKey: 'scarifie', branch: 'acharne', slotType: 'collier', primary: 'force',
    power: { skillMod: { skill: 'hemorragie', dotPowerPct: 35, powerPct: 15 } },
    desc: 'Acharné — Hémorragie frappe 15 % plus fort et fait saigner 35 % plus fort.',
    quote: 'Le sang ne partait pas : quand on l\'ôtait d\'un côté, il revenait de l\'autre.',
  },
  masqueEcarlate: {
    name: 'Masque écarlate', classKey: 'scarifie', branch: 'acharne', slotType: 'casque', armorType: 'moyenne', primary: 'force',
    power: { requires: 'sang-appelle-sang', passive: { vsDebuffedPct: 8, lifestealPct: 3 } },
    desc: 'Acharné — Le sang appelle le sang : +8 % de dégâts contre une cible affaiblie et 3 % de vol de vie en plus.',
    quote: 'Et le Sang était son avatar et son sceau.',
  },
  hacheDeLille: {
    name: 'Hache de Lille', classKey: 'scarifie', branch: 'acharne', slotType: 'arme', weaponType: 'hache2m', primary: 'force',
    power: { skillMod: { skill: 'coup-du-boucher', powerPct: 25, costDelta: -3 } },
    desc: 'Acharné — Coup du boucher coûte 3 % de PV de moins et frappe 25 % plus fort.',
    quote: 'Le bourreau ne manqua pas son coup.',
  },
  // ---- Scarifié · Violent ----
  arcDIthaque: {
    name: "Arc d'Ithaque", classKey: 'scarifie', branch: 'violent', slotType: 'arme', weaponType: 'arc', primary: 'force',
    power: { skillMod: { skill: 'fleche-de-sang', powerPct: 25, critBonus: 10 } },
    desc: 'Violent — Flèche de sang frappe 25 % plus fort, avec +10 % de chance de critique.',
    quote: 'Nul autre que lui ne pouvait en tendre la corde.',
  },
  gantsDeSedan: {
    name: 'Gants de Sedan', classKey: 'scarifie', branch: 'violent', slotType: 'gants', armorType: 'moyenne', primary: 'force',
    power: { skillMod: { skill: 'salve-ecarlate', powerPct: 25, costDelta: -3 } },
    desc: 'Violent — Salve écarlate coûte 3 % de PV de moins et frappe 25 % plus fort.',
    quote: 'Il pleuvait du fer, et la plaine buvait.',
  },
  suaireDeLazare: {
    name: 'Suaire de Lazare', classKey: 'scarifie', branch: 'violent', slotType: 'plastron', armorType: 'moyenne', primary: 'force',
    power: { requires: 'revenant', passive: { selfRevive: 20 } },
    desc: 'Violent — Revenant : se relève avec 20 % de PV en plus (50 % au lieu de 30 %).',
    quote: 'Lazare, sors !',
  },
  // ---- Scarifié · Liens du sang ----
  philtreDIseut: {
    name: "Philtre d'Iseut", classKey: 'scarifie', branch: 'liensDuSang', slotType: 'collier', primary: 'intelligence',
    power: { skillMod: { skill: 'pluie-de-sang', powerPct: 25, addEffects: [fx('sang-partage', 2)] } },
    desc: 'Liens du sang — Pluie de sang soigne 25 % de plus et donne Sang partagé (vol de vie) 2 tours.',
    quote: 'Ni vous sans moi, ni moi sans vous.',
  },
  parcheminSigne: {
    name: 'Parchemin signé', classKey: 'scarifie', branch: 'liensDuSang', slotType: 'anneau', primary: 'intelligence',
    power: { skillMod: { skill: 'pacte-de-sang', costDelta: -8, addEffects: [fx('regeneration', 3, 0.3)] } },
    desc: 'Liens du sang — Pacte de sang coûte 8 % de PV de moins et donne aussi une Régénération (3 tours).',
    quote: 'Le sang est un suc tout particulier.',
  },
  batonDeStyrie: {
    name: 'Bâton de Styrie', classKey: 'scarifie', branch: 'liensDuSang', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'lien-vital', costDelta: -3, effectPowerPct: 40 } },
    desc: 'Liens du sang — Lien vital coûte 3 % de PV de moins ; sa Régénération soigne 40 % de plus.',
    quote: 'Ce qui coule en toi coule aussi en moi.',
  },
  // ---- Macabre · Soldat décharné ----
  hacheDuPasseur: {
    name: 'Hache du Passeur', classKey: 'macabre', branch: 'soldat', slotType: 'arme', weaponType: 'hache2m', primary: 'force',
    power: { skillMod: { skill: 'dechainement', powerPct: 25 } },
    desc: 'Soldat décharné — Déchaînement frappe 25 % plus fort.',
    quote: 'Une obole sous la langue, et la barque attend.',
  },
  gorgerinDuPendu: {
    name: 'Gorgerin du Pendu', classKey: 'macabre', branch: 'soldat', slotType: 'collier', primary: 'force',
    power: { requires: 'chair-morte', passive: { soulPhys: 3 } },
    desc: 'Soldat décharné — Chair morte : chaque âme gardée donne encore +3 % de puissance physique.',
    quote: 'Frères humains, qui après nous vivez…',
  },
  cuirasseDeCendre: {
    name: 'Cuirasse de cendre', classKey: 'macabre', branch: 'soldat', slotType: 'plastron', armorType: 'moyenne', primary: 'force',
    power: { skillMod: { skill: 'frappe-d-outre-tombe', powerPct: 20, critBonus: 10 } },
    desc: 'Soldat décharné — Frappe d\'outre-tombe frappe 20 % plus fort, avec +10 % de chance de critique.',
    quote: 'La cendre les surprit debout, et debout ils restèrent.',
  },
  // ---- Macabre · Mur d'os ----
  ecuDesCatacombes: {
    name: 'Écu des Catacombes', classKey: 'macabre', branch: 'murDOs', slotType: 'bouclier', primary: 'force',
    power: { requires: 'ossature-de-fer', passive: { soulWard: 20, guardShieldPct: 10 } },
    desc: 'Mur d\'os — Ossature : contrecoup des âmes réduit de 20 % de plus, et Défendre donne un Bouclier de 10 % des PV max en plus.',
    quote: 'Arrête ! C\'est ici l\'empire de la Mort.',
  },
  heaumeDeLOssuaire: {
    name: 'Heaume de l\'Ossuaire', classKey: 'macabre', branch: 'murDOs', slotType: 'casque', armorType: 'lourde', primary: 'force',
    power: { skillMod: { skill: 'carapace-d-ossements', effectTurnsDelta: 1, effectPowerPct: 30 } },
    desc: 'Mur d\'os — Carapace d\'ossements dure 1 tour de plus et protège 30 % de plus.',
    quote: 'Ce que vous êtes, nous l\'avons été ; ce que nous sommes, vous le serez.',
  },
  masseDeSedlec: {
    name: 'Masse de Sedlec', classKey: 'macabre', branch: 'murDOs', slotType: 'arme', weaponType: 'masse', primary: 'force',
    power: { skillMod: { skill: 'mur-des-morts', costDelta: -1, addEffects: [fx('regeneration', 2, 0.25)] } },
    desc: 'Mur d\'os — Mur des morts ne libère qu\'une âme et donne aussi une Régénération (2 tours).',
    quote: 'Quarante mille os, et pas un de trop pour le lustre.',
  },
  // ---- Macabre · Nécromancien ----
  batonDEndor: {
    name: 'Bâton d\'Endor', classKey: 'macabre', branch: 'necromancien', slotType: 'arme', weaponType: 'baton', primary: 'intelligence',
    power: { skillMod: { skill: 'explosion-d-ame', powerPct: 25 } },
    desc: 'Nécromancien — Explosion d\'âme frappe 25 % plus fort.',
    quote: 'Fais-moi monter celui que je te dirai.',
  },
  anneauDIrem: {
    name: 'Anneau d\'Irem', classKey: 'macabre', branch: 'necromancien', slotType: 'anneau', primary: 'intelligence',
    power: { requires: 'savoir-interdit', passive: { soulMag: 3 } },
    desc: 'Nécromancien — Savoir interdit : chaque âme gardée donne encore +3 % de puissance magique.',
    quote: 'N\'est pas mort ce qui à jamais dort.',
  },
  linceulDeThebes: {
    name: 'Linceul de Thèbes', classKey: 'macabre', branch: 'necromancien', slotType: 'plastron', armorType: 'legere', primary: 'intelligence',
    power: { skillMod: { skill: 'malediction', powerPct: 15, effectPowerPct: 40, effectTurnsDelta: 1 } },
    desc: 'Nécromancien — Malédiction frappe 15 % plus fort ; ses Ténèbres font 40 % de dégâts en plus, et ses effets durent 1 tour de plus.',
    quote: 'La mort viendra sur des ailes rapides pour qui troublera le repos du roi.',
  },
  // ---- Communs à toutes les classes ----
  plumeLegere: {
    name: 'Plume légère', slotType: 'bottes', armorType: 'legere', primary: 'intelligence',
    power: { passive: { freeMove: 1 } },
    desc: 'Changer de position (avancer ou reculer) ne prend pas le tour, une fois par tour.',
    quote: 'Il faut être léger comme l\'oiseau, et non comme la plume.',
  },
  fratricide: {
    name: 'Fratricide', slotType: 'arme', weaponType: 'dague', primary: 'agilite',
    power: { passive: { echoChance: 15 } },
    desc: '15 % de chance de refaire gratuitement la dernière attaque ou compétence.',
    quote: 'L\'œil était dans la tombe et regardait Caïn.',
  },
  coeurSacrifie: {
    name: 'Cœur sacrifié', slotType: 'collier', primary: 'force',
    power: { passive: { dmgDealtPct: 15, hpCostPct: 10 } },
    desc: 'Les dégâts infligés sont augmentés de 15 %, mais chaque attaque ou compétence coûte 10 % des PV max.',
    quote: 'Tout se paie, et le cœur d\'abord.',
  },
  bottesDeSeptLieues: {
    name: 'Bottes de l\'Ogre', slotType: 'bottes', armorType: 'moyenne', primary: 'agilite',
    power: { pct: { vit: 25 } },
    desc: '+25 % de Vitesse : on joue plus tôt dans le round.',
    quote: 'Elles avaient le don de s\'agrandir et de s\'apetisser selon la jambe.',
  },
  olifantDeRoland: {
    name: 'L\'Olifant', slotType: 'collier', primary: 'intelligence',
    power: { startEffects: [fx('puissance', 2)] },
    desc: "Au début de chaque combat, toute l'équipe reçoit Puissance (+25 % de puissance physique et magique, 2 tours).",
    quote: 'On l\'entend à trente lieues.',
  },
};
