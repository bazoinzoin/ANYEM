// Catalogue des effets de combat (buffs et debuffs). Données pures.
//
// Un effet est défini UNE seule fois ici. Une compétence (héros ou ennemi) ne fait
// que l'appliquer, via `effects` (à ses cibles) ou `selfEffects` (au lanceur) :
//   effects: [{ id: 'poison', turns: 3, power: 0.35 }]
// C'est la compétence qui décide qui est touché (un ennemi, un allié, toute l'équipe…),
// jamais l'effet.
//
// Champs d'un effet :
//   kind    'buff' | 'debuff'
//   mods    { stat: % } modificateurs des stats de combat (physPower, magPower, def, vit…)
//   value   l'effet a une valeur calculée à l'application, à partir de la puissance du
//           lanceur × `power` (donné par la compétence) :
//             'dot'    dégâts à chaque fin de tour (ignorent la défense)
//             'hot'    soins à chaque fin de tour (puissance magique)
//             'shield' points de bouclier, absorbés avant les PV
//             'trap'   dégâts du piège quand il se déclenche
//   turns   [min, max] : durée permise pour cet effet, quelle que soit la source (un test le
//           vérifie) ; c'est ce qui distingue le poison (long, faible) du saignement (court, fort)
//   stacks  cumulable : chaque nouvelle dose s'ajoute (dégâts par tour additionnés, durée
//           ramenée à la plus longue), jusqu'à `stacks` doses ; sinon la nouvelle application
//           remplace l'ancienne
//   bonus   { stat: valeur } ajoutée telle quelle aux stats de combat (ex. lifestealPct : un
//           allié sans vol de vie en gagne)
//   revive  l'unité qui tombe se relève aussitôt avec `revive` % de ses PV, une fois
//           (l'effet disparaît alors)
//   lasting dure jusqu'à la fin du combat (`turns` ignoré, jamais décompté)
//   stun    la cible perd ses prochains tours (turns = nombre de tours perdus)
//   taunt   les ennemis doivent attaquer cette unité
//   confuse l'unité peut frapper ses propres alliés
//   redirect % des dégâts subis par l'unité reportés sur le lanceur de l'effet
//            (Intercession du Paladin), s'il est en vie
//   trap    piège : se déclenche au début du prochain tour de l'unité (elle subit
//           ses dégâts, puis les effets `trap.effects`) et disparaît
// Le même effet appliqué une seconde fois remplace le premier (durée et valeur rafraîchies).

export const EFFECTS = {
  // ---- Buffs ----
  bouclier: { name: 'Bouclier', icon: '🛡️', kind: 'buff', value: 'shield', desc: 'Absorbe des dégâts avant les PV.' },
  regeneration: { name: 'Régénération', icon: '💚', kind: 'buff', value: 'hot', desc: 'Soigne à chaque fin de tour.' },
  puissance: { name: 'Puissance', icon: '💪', kind: 'buff', mods: { physPower: 25, magPower: 25 }, desc: '+25 % de puissance physique et magique.' },
  hate: { name: 'Hâte', icon: '💨', kind: 'buff', mods: { vit: 25 }, desc: '+25 % de Vitesse.' },
  protection: { name: 'Protection', icon: '🔰', kind: 'buff', mods: { def: 50, defMag: 50 }, desc: '+50 % de Défense et de Défense magique.' },
  provocation: { name: 'Provocation', icon: '📣', kind: 'buff', taunt: true, mods: { def: 30 }, desc: 'Les ennemis doivent attaquer cette unité ; +30 % de Défense.' },
  enrage: { name: 'Enragé', icon: '🔥', kind: 'buff', mods: { physPower: 30, def: -20 }, desc: '+30 % de puissance physique, mais −20 % de Défense.' },
  intercession: { name: 'Intercession', icon: '🤝', kind: 'buff', redirect: 50, desc: 'La moitié des dégâts subis est encaissée par le protecteur.' },

  // ---- Debuffs ----
  // Poison : long (5 tours et plus) et faible, mais cumulable (3 doses au plus).
  poison: {
    name: 'Poison', icon: '🧪', kind: 'debuff', value: 'dot', turns: [5, 8], stacks: 3,
    desc: 'Dégâts de poison à chaque fin de tour : longue durée, faibles dégâts, cumulable jusqu\'à 3 doses.',
  },
  // Saignement : court (2 ou 3 tours) et fort ; une nouvelle entaille remplace l'ancienne.
  saignement: {
    name: 'Saignement', icon: '🩸', kind: 'debuff', value: 'dot', turns: [2, 3],
    desc: 'Dégâts de saignement à chaque fin de tour : courte durée, gros dégâts, ne se cumule pas.',
  },
  brulure: { name: 'Brûlure', icon: '🔥', kind: 'debuff', value: 'dot', desc: 'Dégâts de feu à chaque fin de tour.' },
  tenebres: { name: 'Ténèbres', icon: '🌑', kind: 'debuff', value: 'dot', desc: 'Dégâts de ténèbres à chaque fin de tour.' },
  ralenti: { name: 'Ralenti', icon: '🐌', kind: 'debuff', mods: { vit: -30 }, desc: '−30 % de Vitesse.' },
  // Scarifié (Liens du sang) : le sang donné rend ses coups voraces, ou le relève.
  'sang-partage': { name: 'Sang partagé', icon: '🩸', kind: 'buff', bonus: { lifestealPct: 25 }, desc: 'Vol de vie : 25 % des dégâts directs infligés sont rendus en PV.' },
  'pacte-de-sang': { name: 'Pacte de sang', icon: '🩸', kind: 'buff', revive: 35, lasting: true, desc: 'Jusqu\'à la fin du combat : s\'il tombe, se relève aussitôt avec 35 % de ses PV (une fois).' },
  etourdi: { name: 'Étourdi', icon: '💫', kind: 'debuff', stun: true, desc: 'Perd son prochain tour.' },
  confus: { name: 'Confus', icon: '🌀', kind: 'debuff', confuse: true, desc: 'Une chance sur deux de frapper un allié au lieu d\'agir.' },
  affaibli: { name: 'Affaibli', icon: '💧', kind: 'debuff', mods: { physPower: -20, magPower: -20 }, desc: '−20 % de puissance physique et magique.' },
  terreur: { name: 'Terreur', icon: '😨', kind: 'debuff', mods: { def: -30, defMag: -30 }, desc: '−30 % de Défense et de Défense magique.' },
  piege: {
    name: 'Piège à mâchoires', icon: '🪤', kind: 'debuff', value: 'trap', trap: { effects: [{ id: 'etourdi', turns: 1 }] },
    desc: 'Se referme au prochain tour : dégâts, et la cible perd ce tour.',
  },
  piegeDeGivre: {
    name: 'Piège de givre', icon: '🧊', kind: 'debuff', value: 'trap', trap: { effects: [{ id: 'ralenti', turns: 3 }] },
    desc: 'Se déclenche au prochain tour : dégâts, et la cible est Ralentie 3 tours.',
  },
};

export const EFFECT_ORDER = Object.keys(EFFECTS);
