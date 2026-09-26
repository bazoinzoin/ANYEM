// Définition des classes jouables. Données pures : aucune logique ici.
//
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
//   armor       types d'armure (bijoux : toujours autorisés)
// starterKit  équipement commun de niveau 1 donné à la création
// growth      stats gagnées à chaque niveau au-delà du premier
//
// skills[] :
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

export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
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
    skills: [
      { id: 'frappe-brutale', name: 'Frappe Brutale', cost: 30, kind: 'damage', target: 'enemy', power: 2.1, desc: 'Coup lourd sur un ennemi' },
      { id: 'cri-de-guerre', name: 'Cri de Guerre', cost: 55, kind: 'damage', target: 'allEnemies', power: 1.1, desc: 'Frappe tous les ennemis' },
    ],
  },
  voleur: {
    name: 'Voleur',
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
    skills: [
      { id: 'coup-vicieux', name: 'Coup Vicieux', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, comboGain: 1, desc: 'Coup rapide qui donne 1 point de combo' },
      { id: 'evisceration', name: 'Éviscération', cost: 35, kind: 'damage', target: 'enemy', power: 0.4, finisher: true, desc: 'Finisher : gros dégâts, plus forts à chaque point de combo' },
      { id: 'laceration', name: 'Lacération', cost: 30, kind: 'damage', target: 'enemy', power: 0.1, finisher: true, effects: [{ id: 'saignement', turns: 4, power: 0.1 }], desc: 'Finisher : saignement sur 4 tours, plus fort à chaque point de combo' },
    ],
  },
  pretre: {
    name: 'Prêtre',
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
    skills: [
      { id: 'soin-majeur', name: 'Soin Majeur', cost: 35, kind: 'heal', target: 'ally', power: 1.1, desc: 'Soigne fortement un allié' },
      { id: 'eclat-de-lumiere', name: 'Éclat de Lumière', cost: 20, kind: 'damage', target: 'enemy', power: 0.65, magic: true, desc: 'Dégâts de lumière' },
    ],
  },
  mage: {
    name: 'Mage',
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
    skills: [
      { id: 'boule-de-feu', name: 'Boule de Feu', cost: 30, kind: 'damage', target: 'enemy', power: 2.1, magic: true, desc: 'Dégâts de feu' },
      { id: 'eclair', name: 'Éclair', cost: 25, kind: 'damage', target: 'enemy', power: 1.65, magic: true, desc: 'Dégâts de foudre' },
    ],
  },
  chasseur: {
    name: 'Chasseur',
    icon: '🏹',
    color: 'var(--chasseur)',
    position: 'ranged',
    mainStat: 'agilite',
    physStat: 'agilite',
    desc: "Tireur à l'arc, dégâts physiques à distance. Comme le Voleur, son Énergie lui permet d'agir plusieurs fois par tour : gros tirs coûteux ou petites flèches rapides, et des pièges pour contrôler l'ennemi.",
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
    skills: [
      { id: 'tir-vise', name: 'Tir visé', cost: 45, kind: 'damage', target: 'enemy', power: 1.35, desc: 'Flèche soigneusement ajustée' },
      { id: 'tir-rapide', name: 'Tir rapide', cost: 20, kind: 'damage', target: 'enemy', power: 0.55, desc: 'Petite flèche décochée en un éclair' },
    ],
  },
  paladin: {
    name: 'Paladin',
    icon: '⚜️',
    color: 'var(--paladin)',
    position: 'melee',
    mainStat: 'force',
    physStat: 'force',
    desc: "Chevalier sacré au Mana. En Templier, il monte la Force, porte l'armure lourde, se soigne lui-même et encaisse les coups à la place de ses alliés. En Lumière, il monte l'Intelligence, porte l'armure légère et soigne son groupe.",
    base: { pv: 118, atq: 6, vit: 8, force: 5, agilite: 1, intelligence: 4, critChance: 5, critDmg: 50, esquive: 2, blocage: 3, riposte: 3 },
    growth: { pv: 11, force: 1, intelligence: 1 },
    resource: { name: 'Mana', max: 80, start: 80, regen: 10 },
    gear: {
      weapons: ['epee', 'hache', 'masse', 'epee2m', 'hache2m', 'masse2m'],
      offHand: ['bouclier'],
      armor: ['lourde', 'legere'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'masse', primary: 'force' },
      { slotType: 'plastron', armorType: 'lourde', primary: 'force' },
    ],
    skills: [
      { id: 'frappe-du-croise', name: 'Frappe du croisé', cost: 20, kind: 'damage', target: 'enemy', power: 1.4, desc: "Coup d'arme béni (dégâts physiques, Force)" },
      { id: 'lumiere-sacree', name: 'Lumière sacrée', cost: 30, kind: 'heal', target: 'ally', power: 0.9, desc: 'Soigne un allié (Intelligence)' },
    ],
  },
};
