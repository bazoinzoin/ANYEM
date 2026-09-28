// Définition des classes jouables. Données pures : aucune logique ici.
//
// name        nom de la classe dans les phrases, accordé comme un nom ordinaire (« l'Impassible
//             cède à la rage », « réservé aux Vénateurs ») ; nameF : au féminin ; plural : pluriel
// title       nom de la classe dans les menus, avec son article (« Le Dissimulé ») ; titleF :
//             au féminin (« La Dissimulée »), identique quand la classe n'a pas de forme féminine
// position    position de combat par défaut : 'melee' (corps à corps) ou 'ranged'
//             (distance), modifiable au village (écran Stratégie)
// mainStat    stat principale de la classe (affichage, orientation de l'équipement)
// physStat    stat qui renforce les dégâts physiques (attaque de base, compétences
//             non magiques) : Force ou Agilité ; Force par défaut pour les classes magiques,
//             qui restent faibles à l'arme. Les sorts et soins utilisent l'Intelligence.
// base        stats de base, avant équipement (stats absentes = 0)
// resource :
//   regen       gain au début de chaque tour du héros
//   onAttack    gain après une attaque de base (Rage)
//   onHitTaken  gain quand le héros encaisse un coup et survit (Rage)
//   multiAction classe à Énergie : le héros enchaîne plusieurs actions par tour tant
//               qu'il peut les payer, puis finit son tour ; la ressource est pleine
//               au début de chaque combat
//   actionCosts coût des actions de base { attack, defend, item } (classes à Énergie)
// comboMax    maximum de points de combo (Voleur) : gagnés par les compétences
//             `comboGain`, dépensés par les finishers (voir game/combo.js)
// gear        ce que la classe peut équiper :
//   weapons     types d'armes en main droite
//   offHand     types d'armes ou 'bouclier' en main gauche
//   armor       types d'armure (bijoux : toujours autorisés) ; un type ne donne pas accès aux plus
//               légers : chaque classe porte le sien (l'Impassible : lourd en tank, moyen en dégâts)
// starterKit  équipement commun de niveau 1 donné à la création
// starterSpares équipement commun rangé dans le sac à la création (classe dont l'orientation
//             impose ses armes : de quoi s'équiper quelle que soit la première choisie)
// growth      stats gagnées à chaque niveau au-delà du premier
//
// starterSkills[] : sorts de départ de la classe. Un héros commence SANS sort : ils
// s'apprennent au palier 0 des orientations (voir data/talents.js), avec le
// premier point de talent. Format d'une compétence :
//   id        identifiant stable (référencé par les légendaires)
//   kind      'damage' | 'heal'
//   target    'enemy' | 'ally' | 'allEnemies'
//   power     multiplicateur appliqué à la puissance du lanceur
//   magic     sort : utilise la puissance magique (Intelligence) et est réduit par la
//             défense magique ; sinon puissance physique (arme + Force/Agilité).
//             Les soins utilisent toujours la puissance magique.
//   alwaysCrit  coup critique garanti (optionnel)
// Champs avancés (voir aussi data/talents.js) :
//   kind 'revive' (power = part des PV rendus) ou 'support' (effets seuls, sans dégâts/soin)
//   target 'allAllies' | 'self' | 'deadAlly'
//   hits      nombre de coups (multi-frappe)
//   critBonus % de chance de critique en plus pour cette compétence
//   effects     effets du catalogue data/effects.js appliqués à chaque cible :
//               [{ id, turns, power? }] (power : pour les effets à valeur — dégâts ou
//               soins par tour, bouclier — multiplicateur de la puissance du lanceur)
//   selfEffects effets appliqués au lanceur (même format)
//   physHeal    soin (et Régénération) sur la puissance physique au lieu de la
//               magique (Paladin Templier, qui monte la Force)
//   cleanse     retire tous les effets négatifs des cibles
//   comboGain   points de combo gagnés par le lanceur (compétence « générateur »)
//   finisher    dépense tous les points de combo (au moins 1) : `power` et la
//               valeur des effets (power) sont donnés PAR point de combo
//   fullAt      finisher à pleine puissance (celle de 5 points) dès ce nombre de points
//               (Empoisonneur : 3), voir comboFactor dans game/combo.js

export const CLASSES = {
  guerrier: {
    name: 'Impassible', nameF: 'Impassible', plural: 'Impassibles',
    title: 'L\'Impassible', titleF: 'L\'Impassible',
    icon: '⚔️',
    color: 'var(--guerrier)',
    position: 'melee',
    mainStat: 'force',
    physStat: 'force',
    desc: "Combattant robuste au corps à corps. Accumule de la Rage en combattant et en encaissant des coups, qu'il dépense dans des frappes dévastatrices.",
    base: { pv: 130, atq: 7, vit: 8, force: 6, agilite: 2, intelligence: 1, critChance: 5, critDmg: 50, esquive: 2, blocage: 3, riposte: 5 },
    growth: { pv: 12, force: 1 },
    resource: { name: 'Rage', max: 100, start: 20, regen: 5, onAttack: 8, onHitTaken: 15 },
    gear: {
      weapons: ['epee', 'hache', 'masse', 'epee2m', 'hache2m', 'masse2m'],
      offHand: ['bouclier'],
      armor: ['lourde', 'moyenne'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'epee', primary: 'force' },
      { slotType: 'plastron', armorType: 'lourde', primary: 'force' },
    ],
    starterSkills: [
      { id: 'frappe-brutale', name: 'Frappe Brutale', cost: 30, kind: 'damage', target: 'enemy', power: 2.7, desc: 'Coup lourd sur un ennemi' },
      { id: 'cri-de-guerre', name: 'Cri de Guerre', cost: 55, kind: 'damage', target: 'allEnemies', power: 1.1, desc: 'Frappe tous les ennemis' },
    ],
  },
  voleur: {
    name: 'Dissimulé', nameF: 'Dissimulée', plural: 'Dissimulés',
    title: 'Le Dissimulé', titleF: 'La Dissimulée',
    icon: '🗡️',
    color: 'var(--voleur)',
    position: 'melee',
    mainStat: 'agilite',
    physStat: 'agilite',
    desc: "Combattant agile et rapide. Son Énergie lui permet d'agir plusieurs fois par tour : ses coups rapides accumulent des points de combo, que ses finishers dépensent pour frapper d'autant plus fort.",
    base: { pv: 95, atq: 7, vit: 15, force: 2, agilite: 6, intelligence: 1, critChance: 10, critDmg: 50, esquive: 6, riposte: 3 },
    growth: { pv: 8, agilite: 1 },
    resource: { name: 'Énergie', max: 100, start: 100, regen: 45, multiAction: true, actionCosts: { attack: 35, defend: 20, item: 20 } },
    comboMax: 5,
    gear: {
      weapons: ['epee', 'hache', 'masse', 'dague'],
      offHand: ['epee', 'hache', 'masse', 'dague'],
      armor: ['moyenne'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'dague', primary: 'agilite' },
      { slotType: 'plastron', armorType: 'moyenne', primary: 'agilite' },
    ],
    starterSkills: [
      { id: 'coup-vicieux', name: 'Coup Vicieux', cost: 25, kind: 'damage', target: 'enemy', power: 0.7, comboGain: 1, desc: 'Coup rapide qui donne 1 point de combo' },
      { id: 'evisceration', name: 'Éviscération', cost: 35, kind: 'damage', target: 'enemy', power: 0.45, finisher: true, desc: 'Finisher : gros dégâts, plus forts à chaque point de combo' },
      { id: 'laceration', name: 'Entaille venimeuse', cost: 30, kind: 'damage', target: 'enemy', power: 0.1, finisher: true, fullAt: 3, effects: [{ id: 'poison', turns: 6, power: 0.07 }], desc: 'Finisher : une dose de poison sur 6 tours, à pleine puissance dès 3 points de combo' },
    ],
  },
  pretre: {
    name: 'Dévot', nameF: 'Dévote', plural: 'Dévots',
    title: 'Le Dévot', titleF: 'La Dévote',
    icon: '✨',
    color: 'var(--pretre)',
    position: 'ranged',
    mainStat: 'intelligence',
    physStat: 'force',
    desc: 'Soigneur polyvalent. Dépense son Mana pour soigner ses alliés et infliger des dégâts de lumière.',
    base: { pv: 88, atq: 0, vit: 9, force: 1, agilite: 2, intelligence: 6, critChance: 5, critDmg: 50, esquive: 2 },
    growth: { pv: 8, intelligence: 1 },
    resource: { name: 'Mana', max: 80, start: 80, regen: 10 },
    gear: {
      weapons: ['baton', 'dague'],
      offHand: [],
      armor: ['legere'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'baton', primary: 'intelligence' },
      { slotType: 'plastron', armorType: 'legere', primary: 'intelligence' },
    ],
    starterSkills: [
      { id: 'soin-majeur', name: 'Soin Majeur', cost: 35, kind: 'heal', target: 'ally', power: 1.1, desc: 'Soigne fortement un allié' },
      { id: 'eclat-de-lumiere', name: 'Éclat de Lumière', cost: 20, kind: 'damage', target: 'enemy', power: 0.65, magic: true, desc: 'Dégâts de lumière' },
      { id: 'trait-d-ombre', name: "Trait d'ombre", cost: 20, kind: 'damage', target: 'enemy', power: 1.0, magic: true, desc: "Dégâts d'ombre" },
    ],
  },
  mage: {
    name: 'Élémentaliste', nameF: 'Élémentaliste', plural: 'Élémentalistes',
    title: 'L\'Élémentaliste', titleF: 'L\'Élémentaliste',
    icon: '🔥',
    color: 'var(--mage)',
    position: 'ranged',
    mainStat: 'intelligence',
    physStat: 'force',
    desc: 'Lanceur de sorts destructeur. Dépense son Mana pour infliger de lourds dégâts élémentaires à distance.',
    base: { pv: 78, atq: 0, vit: 10, force: 1, agilite: 2, intelligence: 6, critChance: 5, critDmg: 50, esquive: 2 },
    growth: { pv: 7, intelligence: 1 },
    resource: { name: 'Mana', max: 90, start: 90, regen: 10 },
    gear: {
      weapons: ['baton'],
      offHand: [],
      armor: ['legere'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'baton', primary: 'intelligence' },
      { slotType: 'plastron', armorType: 'legere', primary: 'intelligence' },
    ],
    starterSkills: [
      { id: 'boule-de-feu', name: 'Boule de Feu', cost: 30, kind: 'damage', target: 'enemy', power: 1.8, magic: true, desc: 'Dégâts de feu' },
      { id: 'eclair', name: 'Éclair', cost: 25, kind: 'damage', target: 'enemy', power: 1.25, magic: true, desc: 'Dégâts de foudre' },
      { id: 'trait-de-givre', name: 'Trait de givre', cost: 25, kind: 'damage', target: 'enemy', power: 1.7, magic: true, effects: [{ id: 'ralenti', turns: 1 }], desc: 'Dégâts de glace, ralentit la cible 1 tour' },
    ],
  },
  chasseur: {
    name: 'Vénateur', nameF: 'Vénatrice', plural: 'Vénateurs',
    title: 'Le Vénateur', titleF: 'La Vénatrice',
    icon: '🏹',
    color: 'var(--chasseur)',
    position: 'ranged',
    mainStat: 'agilite',
    physStat: 'agilite',
    desc: "Tireur à l'arc, dégâts physiques à distance. Comme le Dissimulé, son Énergie lui permet d'agir plusieurs fois par tour : gros tirs coûteux ou petites flèches rapides, et des pièges pour contrôler l'ennemi.",
    base: { pv: 100, atq: 6, vit: 13, force: 2, agilite: 6, intelligence: 1, critChance: 8, critDmg: 50, esquive: 4 },
    growth: { pv: 9, agilite: 1 },
    resource: { name: 'Énergie', max: 100, start: 100, regen: 45, multiAction: true, actionCosts: { attack: 35, defend: 20, item: 20 } },
    gear: {
      weapons: ['arc'],
      offHand: [],
      armor: ['moyenne'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'arc', primary: 'agilite' },
      { slotType: 'plastron', armorType: 'moyenne', primary: 'agilite' },
    ],
    starterSkills: [
      { id: 'tir-vise', name: 'Tir visé', cost: 45, kind: 'damage', target: 'enemy', power: 1.6, desc: 'Flèche soigneusement ajustée' },
      { id: 'tir-rapide', name: 'Tir rapide', cost: 20, kind: 'damage', target: 'enemy', power: 0.6, desc: 'Petite flèche décochée en un éclair' },
    ],
  },
  paladin: {
    name: 'Lumineux', nameF: 'Lumineuse', plural: 'Lumineux',
    title: 'Le Lumineux', titleF: 'La Lumineuse',
    icon: '⚜️',
    color: 'var(--paladin)',
    position: 'melee',
    mainStat: 'force',
    physStat: 'force',
    desc: "Chevalier sacré au Mana. En Templier, il monte la Force, porte l'armure lourde, se soigne lui-même et encaisse les coups à la place de ses alliés. En Lumière, il monte l'Intelligence, garde son armure lourde et soigne son groupe.",
    base: { pv: 118, atq: 6, vit: 8, force: 5, agilite: 1, intelligence: 4, critChance: 5, critDmg: 50, esquive: 2, blocage: 3, riposte: 3 },
    growth: { pv: 11, force: 1, intelligence: 1 },
    resource: { name: 'Mana', max: 80, start: 80, regen: 10 },
    gear: {
      weapons: ['epee', 'hache', 'masse', 'epee2m', 'hache2m', 'masse2m'],
      offHand: ['bouclier'],
      armor: ['lourde'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'masse', primary: 'force' },
      { slotType: 'plastron', armorType: 'lourde', primary: 'force' },
    ],
    starterSkills: [
      { id: 'frappe-du-croise', name: 'Frappe du croisé', cost: 20, kind: 'damage', target: 'enemy', power: 1.4, desc: "Coup d'arme béni (dégâts physiques, Force)" },
      { id: 'lumiere-sacree', name: 'Lumière sacrée', cost: 30, kind: 'heal', target: 'ally', power: 0.9, desc: 'Soigne un allié (Intelligence)' },
    ],
  },
  scarifie: {
    name: 'Scarifié', nameF: 'Scarifiée', plural: 'Scarifiés',
    title: 'Le Scarifié', titleF: 'La Scarifiée',
    icon: '🩸',
    color: 'var(--scarifie)',
    position: 'melee',
    mainStat: 'force',
    physStat: 'force',
    desc: "Sans Mana, sans Rage : il paie chaque sort de son propre sang. En Acharné, il taille les chairs au corps à corps et fait saigner ; en Violent, il vide ses veines dans des tirs dévastateurs ; en Liens du sang, seule voie à l'Intelligence, il offre son sang pour soigner ses alliés. Il sait aussi se relever quand il tombe.",
    base: { pv: 140, atq: 6, vit: 9, force: 5, agilite: 2, intelligence: 4, critChance: 5, critDmg: 50, esquive: 2, riposte: 3 },
    growth: { pv: 14, force: 1, intelligence: 1 },
    // Pas de ressource : le coût d'une compétence (`cost`) est un % de ses PV max.
    resource: { name: 'PV', hp: true, max: 0, start: 0, regen: 0 },
    gear: {
      weapons: ['dague', 'epee', 'hache', 'masse', 'epee2m', 'hache2m', 'masse2m', 'baton', 'arc'],
      offHand: [],
      armor: ['moyenne'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'hache2m', primary: 'force' },
      { slotType: 'plastron', armorType: 'moyenne', primary: 'force' },
    ],
    starterSkills: [
      { id: 'entaille-rituelle', name: 'Entaille rituelle', cost: 6, kind: 'damage', target: 'enemy', power: 1.6, effects: [{ id: 'saignement', turns: 3, power: 0.35 }], desc: 'Coup qui ouvre une plaie : saignement sur 3 tours' },
      { id: 'decharge-sanglante', name: 'Décharge sanglante', cost: 10, kind: 'damage', target: 'enemy', power: 1.6, desc: 'Frappe de toute la force de son sang versé (dégâts physiques, Force)' },
      { id: 'transfusion', name: 'Transfusion', cost: 8, kind: 'heal', target: 'ally', power: 1.0, effects: [{ id: 'sang-partage', turns: 2 }], desc: 'Donne de son sang pour soigner un allié (Intelligence), qui gagne Sang partagé (vol de vie) 2 tours' },
    ],
  },
  macabre: {
    name: 'Macabre', nameF: 'Macabre', plural: 'Macabres',
    title: 'Le Macabre', titleF: 'La Macabre',
    icon: '💀',
    color: 'var(--macabre)',
    position: 'melee',
    mainStat: 'force',
    physStat: 'force',
    desc: "Il absorbe l'âme des ennemis qui meurent (3 au plus, gardées d'un combat à l'autre). Chaque âme le renforce ou se dépense dans ses compétences, mais les âmes gardées le rongent, et à leur maximum elles rongent aussi ses alliés. En Soldat décharné, il frappe à deux mains ; en Mur d'os, il encaisse derrière son bouclier ; en Nécromancien, seule voie à l'Intelligence, il lance ses sorts à distance.",
    base: { pv: 125, atq: 6, vit: 8, force: 5, agilite: 1, intelligence: 4, critChance: 5, critDmg: 50, esquive: 2, blocage: 2, riposte: 3 },
    growth: { pv: 12, force: 1, intelligence: 1 },
    // Ressource = âmes absorbées (voir game/souls.js) : `cost` = âmes dépensées (0 = gratuit).
    resource: { name: 'Âmes', souls: true, max: 3, start: 0, regen: 0 },
    // L'orientation principale restreint armes et armure (data/talents.js, `gear`).
    gear: {
      weapons: ['hache', 'masse', 'hache2m', 'masse2m', 'baton'],
      offHand: ['bouclier'],
      armor: ['lourde', 'moyenne', 'legere'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'hache2m', primary: 'force' },
      { slotType: 'plastron', armorType: 'moyenne', primary: 'force' },
    ],
    // Équipement des autres orientations, rangé dans le sac à la création (voir starterSpares).
    starterSpares: [
      { slotType: 'arme', weaponType: 'masse', primary: 'force' },
      { slotType: 'bouclier', primary: 'force' },
      { slotType: 'plastron', armorType: 'lourde', primary: 'force' },
      { slotType: 'arme', weaponType: 'baton', primary: 'intelligence' },
      { slotType: 'plastron', armorType: 'legere', primary: 'intelligence' },
    ],
    starterSkills: [
      { id: 'coup-decharne', name: 'Coup décharné', cost: 0, kind: 'damage', target: 'enemy', power: 2.0, desc: 'Coup de sa lourde arme (gratuit)' },
      { id: 'fracas-d-os', name: "Fracas d'os", cost: 0, kind: 'damage', target: 'enemy', power: 1.0, selfEffects: [{ id: 'bouclier', turns: 2, power: 0.35 }], desc: "Coup d'arme qui fait lever des éclats d'os autour de lui : Bouclier 2 tours (gratuit)" },
      { id: 'trait-funeste', name: 'Trait funeste', cost: 0, kind: 'damage', target: 'enemy', power: 0.95, magic: true, desc: "Trait d'énergie nécrotique (dégâts magiques, gratuit)" },
    ],
  },
};
