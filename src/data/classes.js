// Définition des classes jouables. Données pures : aucune logique ici.
//
// resource :
//   regen       gain au début de chaque tour du héros
//   onAttack    gain après une attaque de base (Rage)
//   onHitTaken  gain quand le héros encaisse un coup et survit (Rage)
//
// skills[] :
//   kind    'damage' | 'heal'
//   target  'enemy' | 'ally' | 'allEnemies'
//   power   multiplicateur appliqué à l'attaque du lanceur
//   bleed   nombre de tours de saignement infligés (optionnel)

export const CLASSES = {
  guerrier: {
    name: 'Guerrier',
    icon: '⚔️',
    color: 'var(--guerrier)',
    mainStat: 'Force',
    magic: false,
    desc: "Combattant robuste au corps à corps. Accumule de la Rage en combattant et en encaissant des coups, qu'il dépense dans des frappes dévastatrices.",
    base: { pv: 130, atq: 17, vit: 8 },
    resource: { name: 'Rage', max: 100, start: 20, regen: 5, onAttack: 8, onHitTaken: 15 },
    skills: [
      { name: 'Frappe Brutale', cost: 30, kind: 'damage', target: 'enemy', power: 2.1, desc: 'Coup lourd sur un ennemi' },
      { name: 'Cri de Guerre', cost: 55, kind: 'damage', target: 'allEnemies', power: 1.1, desc: 'Frappe tous les ennemis' },
    ],
  },
  voleur: {
    name: 'Voleur',
    icon: '🗡️',
    color: 'var(--voleur)',
    mainStat: 'Agilité',
    magic: false,
    desc: "Combattant agile et rapide. Son Énergie se régénère chaque tour, lui permettant d'enchaîner coups vicieux et poisons.",
    base: { pv: 95, atq: 16, vit: 15 },
    resource: { name: 'Énergie', max: 60, start: 60, regen: 20 },
    skills: [
      { name: 'Coup Vicieux', cost: 20, kind: 'damage', target: 'enemy', power: 1.9, desc: 'Frappe critique garantie' },
      { name: 'Lacération', cost: 15, kind: 'damage', target: 'enemy', power: 0.8, bleed: 3, desc: 'Saignement sur 3 tours' },
    ],
  },
  pretre: {
    name: 'Prêtre',
    icon: '✨',
    color: 'var(--pretre)',
    mainStat: 'Intelligence',
    magic: true,
    desc: 'Soigneur polyvalent. Dépense son Mana pour soigner ses alliés et infliger des dégâts de lumière.',
    base: { pv: 88, atq: 9, vit: 9 },
    resource: { name: 'Mana', max: 80, start: 80, regen: 10 },
    skills: [
      { name: 'Soin Majeur', cost: 35, kind: 'heal', target: 'ally', power: 2.6, desc: 'Soigne fortement un allié' },
      { name: 'Éclat de Lumière', cost: 20, kind: 'damage', target: 'enemy', power: 1.5, desc: 'Dégâts de lumière' },
    ],
  },
  mage: {
    name: 'Mage',
    icon: '🔥',
    color: 'var(--mage)',
    mainStat: 'Intelligence',
    magic: true,
    desc: 'Lanceur de sorts destructeur. Dépense son Mana pour infliger de lourds dégâts élémentaires à distance.',
    base: { pv: 78, atq: 20, vit: 10 },
    resource: { name: 'Mana', max: 90, start: 90, regen: 10 },
    skills: [
      { name: 'Boule de Feu', cost: 30, kind: 'damage', target: 'enemy', power: 2.3, desc: 'Dégâts de feu' },
      { name: 'Éclair', cost: 25, kind: 'damage', target: 'enemy', power: 1.8, desc: 'Dégâts de foudre' },
    ],
  },
};
