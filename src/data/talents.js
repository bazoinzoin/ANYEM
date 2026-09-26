// Arbres de compétences (DESIGN_DOC §3). Données pures.
//
// Chaque classe a une orientation par branche. Une branche compte 5 paliers
// (tier 0 à 4) ; un palier se débloque quand assez de points sont investis dans
// la branche (voir TALENTS_RULES dans config.js).
//
// Nœud : { id, name, tier, ranks, kind, desc, ...effet }
//   kind 'minor'   nœud secondaire : petit bonus, plusieurs rangs
//        'skill'   nœud principal : nouvelle compétence (champ `skill`)
//        'passive' nœud principal : nouveau passif ou amélioration de compétence
// Effets, cumulés par rang :
//   flat     { stat: valeur }  ajout aux stats (voir data/stats.js)
//   pct      { stat: % }       % sur la stat finale (pv, def, defMag, physPower, magPower…)
//   passive  { clé: valeur }   berserk, vsDebuffedPct, guardShieldPct, healPct, dotPct, resRegen,
//                              resMaxBonus (ressource max), critCombo (point de combo en plus sur critique)
//   skill    compétence accordée (même format que data/classes.js)
//   skillMod { skill: id, powerPct, costDelta, dotTurnsDelta, dotPowerPct, addEffects }
// Les buffs/debuffs appliqués par les compétences viennent du catalogue data/effects.js.


export const TALENTS = {
  guerrier: [
    {
      key: 'gardien', name: 'Gardien', icon: '🛡️',
      desc: 'Tank : boucliers, armure, provocation. Épée et bouclier, armure lourde.',
      nodes: [
        { id: 'peau-de-fer', name: 'Peau de fer', tier: 0, ranks: 3, kind: 'minor', desc: '+5 % PV par rang.', pct: { pv: 5 } },
        {
          id: 'provocation', name: 'Provocation', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'provocation', name: 'Provocation', cost: 15, kind: 'support', target: 'self',
            selfEffects: [{ id: 'provocation', turns: 2 }],
            desc: 'Force les ennemis à attaquer le Guerrier pendant 2 tours (+30 % Défense)',
          },
        },
        { id: 'maitrise-bouclier', name: 'Maîtrise du bouclier', tier: 2, ranks: 3, kind: 'minor', desc: '+3 % Blocage et +2 Défense par rang.', flat: { blocage: 3, def: 2 } },
        { id: 'rempart', name: 'Rempart', tier: 3, ranks: 1, kind: 'passive', desc: 'Défendre donne aussi un bouclier égal à 15 % des PV max.', passive: { guardShieldPct: 15 } },
        {
          id: 'mur-de-boucliers', name: 'Mur de boucliers', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'mur-de-boucliers', name: 'Mur de boucliers', cost: 45, kind: 'support', target: 'allAllies',
            effects: [{ id: 'bouclier', turns: 2, power: 0.9 }],
            desc: "Bouclier sur toute l'équipe pendant 2 tours",
          },
        },
      ],
    },
    {
      key: 'berserker', name: 'Berserker', icon: '🪓',
      desc: 'Dégâts : plus il est blessé, plus il frappe fort. Arme à deux mains, armure moyenne.',
      nodes: [
        { id: 'soif-de-sang', name: 'Soif de sang', tier: 0, ranks: 3, kind: 'minor', desc: '+5 % Puissance physique par rang.', pct: { physPower: 5 } },
        {
          id: 'frappe-sauvage', name: 'Frappe sauvage', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'frappe-sauvage', name: 'Frappe sauvage', cost: 25, kind: 'damage', target: 'enemy', power: 1.7, critBonus: 25, desc: 'Coup violent, +25 % de chance de critique' },
        },
        { id: 'furie', name: 'Furie', tier: 2, ranks: 3, kind: 'minor', desc: '+10 % Dégâts critiques par rang.', flat: { critDmg: 10 } },
        { id: 'berserk', name: 'Berserk', tier: 3, ranks: 1, kind: 'passive', desc: '+3 % de puissance physique par tranche de 10 % de PV manquants.', passive: { berserk: 3 } },
        {
          id: 'dechainement', name: 'Déchaînement', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'dechainement', name: 'Déchaînement', cost: 60, kind: 'damage', target: 'allEnemies', power: 1.6,
            selfEffects: [{ id: 'enrage', turns: 2 }],
            desc: 'Frappe tous les ennemis puis enrage (+30 % puissance physique, −20 % Défense, 2 tours)',
          },
        },
      ],
    },
  ],

  voleur: [
    {
      key: 'assassin', name: 'Assassin', icon: '🗡️',
      desc: "Plus d'Énergie donc plus d'actions par tour, coups critiques et points de combo en rafale. Dagues, armure moyenne.",
      nodes: [
        { id: 'vivacite', name: 'Vivacité', tier: 0, ranks: 3, kind: 'minor', desc: '+10 Énergie max et +5 Énergie regagnée par tour, par rang.', passive: { resMaxBonus: 10, resRegen: 5 } },
        {
          id: 'taillade', name: 'Taillade', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'taillade', name: 'Taillade', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, comboGain: 1,
            effects: [{ id: 'ralenti', turns: 2 }],
            desc: 'Coup rapide qui ralentit la cible (−30 % Vitesse, 2 tours) et donne 1 point de combo',
          },
        },
        { id: 'precision', name: 'Précision', tier: 2, ranks: 3, kind: 'minor', desc: '+3 % Taux critique et +5 % Dégâts critiques par rang.', flat: { critChance: 3, critDmg: 5 } },
        { id: 'sceau-du-destin', name: 'Sceau du destin', tier: 3, ranks: 1, kind: 'passive', desc: 'Un coup critique d\'une compétence qui donne des points de combo en donne 1 de plus.', passive: { critCombo: 1 } },
        {
          id: 'deluge-de-lames', name: 'Déluge de lames', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'deluge-de-lames', name: 'Déluge de lames', cost: 35, kind: 'damage', target: 'enemy', power: 0.17, hits: 4, finisher: true, critBonus: 15,
            desc: 'Finisher : quatre coups rapides (+15 % de chance de critique), plus forts à chaque point de combo',
          },
        },
      ],
    },
    {
      key: 'empoisonneur', name: 'Empoisonneur', icon: '🧪',
      desc: "Moins d'actions mais des poisons puissants : dégâts physiques sur la durée et affaiblissements. Dagues, armure moyenne.",
      nodes: [
        { id: 'toxines', name: 'Toxines', tier: 0, ranks: 3, kind: 'minor', desc: '+10 % de dégâts des poisons et saignements par rang.', passive: { dotPct: 10 } },
        {
          id: 'lame-empoisonnee', name: 'Lame empoisonnée', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'lame-empoisonnee', name: 'Lame empoisonnée', cost: 45, kind: 'damage', target: 'enemy', power: 0.5, comboGain: 1,
            effects: [{ id: 'poison', turns: 4, power: 0.45 }],
            desc: 'Empoisonne la cible pendant 4 tours et donne 1 point de combo',
          },
        },
        { id: 'opportuniste', name: 'Opportuniste', tier: 2, ranks: 3, kind: 'minor', desc: '+8 % de dégâts directs contre une cible affaiblie (empoisonnée, ralentie…) par rang.', passive: { vsDebuffedPct: 8 } },
        {
          id: 'venin-virulent', name: 'Venin virulent', tier: 3, ranks: 1, kind: 'passive',
          desc: 'Lame empoisonnée : poison +50 % et rend la cible Affaiblie (−20 % puissance physique et magique, 4 tours).',
          skillMod: { skill: 'lame-empoisonnee', dotPowerPct: 50, addEffects: [{ id: 'affaibli', turns: 4 }] },
        },
        {
          id: 'fiole-de-peste', name: 'Fiole de peste', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'fiole-de-peste', name: 'Fiole de peste', cost: 50, kind: 'damage', target: 'allEnemies', power: 0.1, finisher: true,
            effects: [{ id: 'poison', turns: 4, power: 0.14 }],
            desc: 'Finisher : empoisonne tous les ennemis pendant 4 tours, plus fort à chaque point de combo',
          },
        },
      ],
    },
  ],

  pretre: [
    {
      key: 'clerc', name: 'Clerc', icon: '✨',
      desc: 'Soins puissants : soins de groupe et résurrection. Bâton, armure légère.',
      nodes: [
        { id: 'devotion', name: 'Dévotion', tier: 0, ranks: 3, kind: 'minor', desc: '+6 % de soins par rang.', passive: { healPct: 6 } },
        {
          id: 'priere-de-soins', name: 'Prière de soins', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'priere-de-soins', name: 'Prière de soins', cost: 40, kind: 'heal', target: 'allAllies', power: 0.55, desc: "Soigne toute l'équipe" },
        },
        { id: 'meditation', name: 'Méditation', tier: 2, ranks: 3, kind: 'minor', desc: '+3 Mana regagné par tour, par rang.', passive: { resRegen: 3 } },
        {
          id: 'grace', name: 'Grâce', tier: 3, ranks: 1, kind: 'passive', desc: 'Soin Majeur coûte 10 Mana de moins et soigne 20 % de plus.',
          skillMod: { skill: 'soin-majeur', costDelta: -10, powerPct: 20 },
        },
        {
          id: 'resurrection', name: 'Résurrection', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'resurrection', name: 'Résurrection', cost: 60, kind: 'revive', target: 'deadAlly', power: 0.4, desc: 'Ramène un allié tombé avec 40 % de ses PV' },
        },
      ],
    },
    {
      key: 'precheur', name: 'Prêcheur', icon: '📖',
      desc: 'Hybride : soins sur la durée, boucliers, bénédictions et lumière. Bâton, armure légère.',
      nodes: [
        { id: 'foi', name: 'Foi', tier: 0, ranks: 3, kind: 'minor', desc: '+3 Intelligence par rang.', flat: { intelligence: 3 } },
        {
          id: 'renovation', name: 'Rénovation', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'renovation', name: 'Rénovation', cost: 25, kind: 'support', target: 'ally',
            effects: [{ id: 'regeneration', turns: 4, power: 0.35 }],
            desc: 'Soigne un allié à chaque fin de tour pendant 4 tours',
          },
        },
        { id: 'lumiere-interieure', name: 'Lumière intérieure', tier: 2, ranks: 3, kind: 'minor', desc: '+5 % Puissance magique par rang.', pct: { magPower: 5 } },
        {
          id: 'bouclier-sacre', name: 'Bouclier sacré', tier: 3, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'bouclier-sacre', name: 'Bouclier sacré', cost: 30, kind: 'support', target: 'ally', magic: true,
            effects: [{ id: 'bouclier', turns: 3, power: 1.2 }],
            desc: 'Protège un allié par un bouclier pendant 3 tours',
          },
        },
        {
          id: 'benediction', name: 'Bénédiction', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'benediction', name: 'Bénédiction', cost: 50, kind: 'support', target: 'allAllies',
            effects: [{ id: 'puissance', turns: 3 }],
            desc: "Donne Puissance à toute l'équipe pendant 3 tours",
          },
        },
      ],
    },
    {
      key: 'profane', name: 'Profane', icon: '🌑',
      desc: 'Ténèbres : dégâts magiques sur la durée et confusion. Bâton, armure légère.',
      nodes: [
        { id: 'ombre', name: 'Ombre', tier: 0, ranks: 3, kind: 'minor', desc: '+10 % de dégâts sur la durée par rang.', passive: { dotPct: 10 } },
        {
          id: 'mot-de-douleur', name: 'Mot de douleur', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'mot-de-douleur', name: 'Mot de douleur', cost: 20, kind: 'damage', target: 'enemy', power: 0.3, magic: true,
            effects: [{ id: 'tenebres', turns: 4, power: 0.4 }],
            desc: 'Dégâts de ténèbres sur 4 tours',
          },
        },
        { id: 'esprit-sombre', name: 'Esprit sombre', tier: 2, ranks: 3, kind: 'minor', desc: '+5 % Puissance magique par rang.', pct: { magPower: 5 } },
        {
          id: 'confusion', name: 'Confusion', tier: 3, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'confusion', name: 'Confusion', cost: 30, kind: 'support', target: 'enemy',
            effects: [{ id: 'confus', turns: 2 }],
            desc: 'La cible a une chance sur deux de frapper ses alliés pendant 2 tours',
          },
        },
        {
          id: 'fleau', name: 'Fléau', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'fleau', name: 'Fléau', cost: 45, kind: 'support', target: 'allEnemies', magic: true,
            effects: [{ id: 'tenebres', turns: 3, power: 0.5 }],
            desc: 'Dégâts de ténèbres sur 3 tours à tous les ennemis',
          },
        },
      ],
    },
  ],

  mage: [
    {
      key: 'feu', name: 'Mage de feu', icon: '🔥',
      desc: 'Dégâts magiques de feu, brûlures et dégâts de zone sur la durée.',
      nodes: [
        { id: 'chaleur', name: 'Chaleur', tier: 0, ranks: 3, kind: 'minor', desc: '+5 % Puissance magique par rang.', pct: { magPower: 5 } },
        {
          id: 'immolation', name: 'Immolation', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'immolation', name: 'Immolation', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, magic: true,
            effects: [{ id: 'brulure', turns: 3, power: 0.4 }],
            desc: 'Enflamme la cible (brûlure sur 3 tours)',
          },
        },
        { id: 'combustion', name: 'Combustion', tier: 2, ranks: 3, kind: 'minor', desc: '+10 % de dégâts de brûlure par rang.', passive: { dotPct: 10 } },
        {
          id: 'boule-ardente', name: 'Boule ardente', tier: 3, ranks: 1, kind: 'passive', desc: 'Boule de Feu enflamme aussi la cible (brûlure sur 3 tours).',
          skillMod: { skill: 'boule-de-feu', addEffects: [{ id: 'brulure', turns: 3, power: 0.3 }] },
        },
        {
          id: 'pluie-de-feu', name: 'Pluie de feu', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'pluie-de-feu', name: 'Pluie de feu', cost: 55, kind: 'damage', target: 'allEnemies', power: 1.1, magic: true,
            effects: [{ id: 'brulure', turns: 3, power: 0.3 }],
            desc: 'Frappe et enflamme tous les ennemis',
          },
        },
      ],
    },
    {
      key: 'glace', name: 'Mage de glace', icon: '❄️',
      desc: 'Contrôle : ralentissements et étourdissements, avec de bons dégâts.',
      nodes: [
        { id: 'givre', name: 'Givre', tier: 0, ranks: 3, kind: 'minor', desc: '+3 Défense et +3 Défense magique par rang.', flat: { def: 3, defMag: 3 } },
        {
          id: 'eclat-de-glace', name: 'Éclat de glace', tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'eclat-de-glace', name: 'Éclat de glace', cost: 20, kind: 'damage', target: 'enemy', power: 1.2, magic: true, effects: [{ id: 'ralenti', turns: 2 }], desc: 'Dégâts de glace, ralentit la cible 2 tours' },
        },
        { id: 'hiver', name: 'Hiver', tier: 2, ranks: 3, kind: 'minor', desc: '+5 % Puissance magique par rang.', pct: { magPower: 5 } },
        {
          id: 'nova-de-givre', name: 'Nova de givre', tier: 3, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'nova-de-givre', name: 'Nova de givre', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.6, magic: true, effects: [{ id: 'ralenti', turns: 2 }], desc: 'Dégâts de glace et ralentissement sur tous les ennemis' },
        },
        {
          id: 'prison-de-glace', name: 'Prison de glace', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'prison-de-glace', name: 'Prison de glace', cost: 45, kind: 'damage', target: 'enemy', power: 1.0, magic: true,
            effects: [{ id: 'etourdi', turns: 1 }],
            desc: 'Dégâts de glace, la cible perd son prochain tour',
          },
        },
      ],
    },
    {
      key: 'foudre', name: 'Mage de foudre', icon: '⚡',
      desc: 'Gros dégâts directs et renforcement des alliés.',
      nodes: [
        { id: 'conductivite', name: 'Conductivité', tier: 0, ranks: 3, kind: 'minor', desc: '+3 % Taux critique par rang.', flat: { critChance: 3 } },
        {
          id: 'chaine-d-eclairs', name: "Chaîne d'éclairs", tier: 1, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'chaine-d-eclairs', name: "Chaîne d'éclairs", cost: 35, kind: 'damage', target: 'allEnemies', power: 0.9, magic: true, desc: 'Foudroie tous les ennemis' },
        },
        { id: 'surtension', name: 'Surtension', tier: 2, ranks: 3, kind: 'minor', desc: '+10 % Dégâts critiques par rang.', flat: { critDmg: 10 } },
        {
          id: 'surcharge', name: 'Surcharge', tier: 3, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: {
            id: 'surcharge', name: 'Surcharge', cost: 25, kind: 'support', target: 'ally',
            effects: [{ id: 'puissance', turns: 3 }],
            desc: 'Donne Puissance à un allié pendant 3 tours',
          },
        },
        {
          id: 'tempete', name: 'Tempête', tier: 4, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.',
          skill: { id: 'tempete', name: 'Tempête', cost: 60, kind: 'damage', target: 'enemy', power: 3.3, magic: true, desc: 'Énorme décharge de foudre sur un ennemi' },
        },
      ],
    },
  ],
};
