// Définition des classes jouables. Données pures : aucune logique ici.
//
// mainStat    stat principale de la classe (affichage, orientation de l'équipement)
// physStat    stat qui renforce les dégâts physiques (attaque de base, compétences
//             non magiques) : Force ou Agilité ; Force par défaut pour les classes magiques,
//             qui restent faibles à l'arme. Les sorts et soins utilisent l'Intelligence.
// base        stats de base, avant équipement (stats absentes = 0)
// resource :
//   regen       gain au début de chaque tour du héros
//   onAttack    gain après une attaque de base (Rage)
//   onHitTaken  gain quand le héros encaisse un coup et survit (Rage)
// gear        ce que la classe peut équiper :
//   weapons     types d'armes en main droite
//   offHand     types d'armes ou 'bouclier' en main gauche
//   armor       types d'armure (bijoux : toujours autorisés)
// starterKit  équipement commun de niveau 1 donné à la création
//
// skills[] :
//   id        identifiant stable (référencé par les légendaires)
//   kind      'damage' | 'heal'
//   target    'enemy' | 'ally' | 'allEnemies'
//   power     multiplicateur appliqué à la puissance du lanceur
//   magic     sort : utilise la puissance magique (Intelligence) et est réduit par la
//             défense magique ; sinon puissance physique (arme + Force/Agilité).
//             Les soins utilisent toujours la puissance magique.
//   bleed     nombre de tours de saignement infligés (optionnel)
//   alwaysCrit  coup critique garanti (optionnel)

export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    icon: '⚔️',
    color: 'var(--guerrier)',
    mainStat: 'force',
    physStat: 'force',
    desc: "Combattant robuste au corps à corps. Accumule de la Rage en combattant et en encaissant des coups, qu'il dépense dans des frappes dévastatrices.",
    base: { pv: 130, atq: 7, vit: 8, force: 6, agilite: 2, intelligence: 1, critChance: 5, critDmg: 50, esquive: 2, blocage: 3 },
    resource: { name: 'Rage', max: 100, start: 20, regen: 5, onAttack: 8, onHitTaken: 15 },
    gear: {
      weapons: ['epee', 'hache', 'marteau', 'epee2m', 'hache2m', 'marteau2m'],
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
    mainStat: 'agilite',
    physStat: 'agilite',
    desc: "Combattant agile et rapide. Son Énergie se régénère chaque tour, lui permettant d'enchaîner coups vicieux et poisons.",
    base: { pv: 95, atq: 7, vit: 15, force: 2, agilite: 6, intelligence: 1, critChance: 10, critDmg: 50, esquive: 6 },
    resource: { name: 'Énergie', max: 60, start: 60, regen: 20 },
    gear: {
      weapons: ['epee', 'hache', 'marteau', 'dague'],
      offHand: ['epee', 'hache', 'marteau', 'dague'],
      armor: ['moyenne'],
    },
    starterKit: [
      { slotType: 'arme', weaponType: 'dague', primary: 'agilite' },
      { slotType: 'plastron', armorType: 'moyenne', primary: 'agilite' },
    ],
    skills: [
      { id: 'coup-vicieux', name: 'Coup Vicieux', cost: 20, kind: 'damage', target: 'enemy', power: 1.3, alwaysCrit: true, desc: 'Frappe critique garantie' },
      { id: 'laceration', name: 'Lacération', cost: 15, kind: 'damage', target: 'enemy', power: 0.8, bleed: 3, desc: 'Saignement sur 3 tours' },
    ],
  },
  pretre: {
    name: 'Prêtre',
    icon: '✨',
    color: 'var(--pretre)',
    mainStat: 'intelligence',
    physStat: 'force',
    desc: 'Soigneur polyvalent. Dépense son Mana pour soigner ses alliés et infliger des dégâts de lumière.',
    base: { pv: 88, atq: 0, vit: 9, force: 1, agilite: 2, intelligence: 6, critChance: 5, critDmg: 50, esquive: 2 },
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
    mainStat: 'intelligence',
    physStat: 'force',
    desc: 'Lanceur de sorts destructeur. Dépense son Mana pour infliger de lourds dégâts élémentaires à distance.',
    base: { pv: 78, atq: 0, vit: 10, force: 1, agilite: 2, intelligence: 6, critChance: 5, critDmg: 50, esquive: 2 },
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
};
