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
//   stun    la cible perd ses prochains tours (turns = nombre de tours perdus)
//   taunt   les ennemis doivent attaquer cette unité
//   confuse l'unité peut frapper ses propres alliés
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

  // ---- Debuffs ----
  poison: { name: 'Poison', icon: '🧪', kind: 'debuff', value: 'dot', desc: 'Dégâts de poison à chaque fin de tour.' },
  saignement: { name: 'Saignement', icon: '🩸', kind: 'debuff', value: 'dot', desc: 'Dégâts de saignement à chaque fin de tour.' },
  brulure: { name: 'Brûlure', icon: '🔥', kind: 'debuff', value: 'dot', desc: 'Dégâts de feu à chaque fin de tour.' },
  tenebres: { name: 'Ténèbres', icon: '🌑', kind: 'debuff', value: 'dot', desc: 'Dégâts de ténèbres à chaque fin de tour.' },
  ralenti: { name: 'Ralenti', icon: '🐌', kind: 'debuff', mods: { vit: -30 }, desc: '−30 % de Vitesse.' },
  etourdi: { name: 'Étourdi', icon: '💫', kind: 'debuff', stun: true, desc: 'Perd son prochain tour.' },
  confus: { name: 'Confus', icon: '🌀', kind: 'debuff', confuse: true, desc: 'Une chance sur deux de frapper un allié au lieu d\'agir.' },
  affaibli: { name: 'Affaibli', icon: '💧', kind: 'debuff', mods: { physPower: -20, magPower: -20 }, desc: '−20 % de puissance physique et magique.' },
  terreur: { name: 'Terreur', icon: '😨', kind: 'debuff', mods: { def: -30, defMag: -30 }, desc: '−30 % de Défense et de Défense magique.' },
};

export const EFFECT_ORDER = Object.keys(EFFECTS);
