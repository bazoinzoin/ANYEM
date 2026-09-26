// Arbres de compétences (DESIGN_DOC §3). Données pures.
//
// Chaque classe a une orientation par branche. Une branche compte 10 paliers
// (tier 0 à 9) et 50 rangs au total : un héros au niveau maximum (50 points) peut
// compléter une seule orientation. Le palier t se débloque quand t × 5 points sont
// investis dans la branche (voir TALENT_RULES dans config.js) ; le palier 9 est la
// compétence signature de l'orientation.
//
// Modèle d'une branche (rangs par palier) :
//   0 : 2 bonus            1 : compétence + bonus    2 : 2 bonus
//   3 : passif + bonus     4 : compétence + bonus    5 : 2 bonus
//   6 : passif + bonus     7 : compétence + bonus    8 : passif + bonus
//   9 : compétence signature
//
// Nœud : { id, name, tier, ranks, kind, desc, ...effet }
//   kind 'minor'     nœud secondaire : petit bonus, plusieurs rangs
//        'skill'     nœud principal : nouvelle compétence (champ `skill`)
//        'passive'   nœud principal : nouveau passif ou amélioration de compétence
//        'signature' compétence signature (palier 9, champ `skill`)
// Effets, cumulés par rang :
//   flat     { stat: valeur }  ajout aux stats (voir data/stats.js)
//   pct      { stat: % }       % sur la stat finale (pv, def, defMag, physPower, magPower…)
//   passive  { clé: valeur }   passifs de combat :
//     berserk        +% puissance physique par tranche de 10 % de PV manquants
//     vsDebuffedPct  +% de dégâts directs contre une cible qui subit un effet négatif
//     executePct     +% de dégâts directs contre une cible sous 30 % de PV
//     aoePct         +% de dégâts des compétences de zone
//     guardShieldPct Défendre donne un Bouclier de ce % des PV max
//     guardBonus     Défendre réduit les dégâts de ce % en plus
//     shieldPct      +% de valeur des boucliers donnés
//     healPct        +% de soins (soins directs et Régénération)
//     dotPct         +% de dégâts sur la durée
//     lifestealPct   % des dégâts directs infligés rendus en PV
//     resRegen       ressource regagnée en plus au début de chaque tour
//     resMaxBonus    ressource maximum en plus
//     resOnAttack / resOnHitTaken  Rage en plus par attaque / par coup encaissé
//     critCombo      point de combo en plus quand un générateur fait un critique
//     trapPct        +% de dégâts des pièges
//     finisherRefund Énergie rendue par point de combo dépensé
//   skill    compétence accordée (même format que data/classes.js)
//   skillMod { skill: id, powerPct, costDelta, critBonus, dotTurnsDelta, dotPowerPct,
//              effectTurnsDelta, effectPowerPct, addEffects, addSelfEffects } (ou une liste)
// Les buffs/debuffs appliqués par les compétences viennent du catalogue data/effects.js.

// Raccourcis de construction des nœuds.
const minor = (id, name, tier, ranks, desc, fx) => ({ id, name, tier, ranks, kind: 'minor', desc, ...fx });
const passive = (id, name, tier, desc, fx) => ({ id, name, tier, ranks: 1, kind: 'passive', desc, ...fx });
const skill = (tier, def) => ({ id: def.id, name: def.name, tier, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.', skill: def });
const signature = (def) => ({ id: def.id, name: def.name, tier: 9, ranks: 1, kind: 'signature', desc: 'Compétence signature.', skill: def });
const fx = (id, turns, power) => (power === undefined ? { id, turns } : { id, turns, power });

export const TALENTS = {
  guerrier: [
    {
      key: 'gardien', name: 'Gardien', icon: '🛡️',
      desc: 'Tank : boucliers, armure, provocation. Épée et bouclier, armure lourde.',
      nodes: [
        minor('peau-de-fer', 'Peau de fer', 0, 3, '+4 % PV par rang.', { pct: { pv: 4 } }),
        minor('posture-defensive', 'Posture défensive', 0, 2, '+5 % Défense par rang.', { pct: { def: 5 } }),
        skill(1, {
          id: 'provocation', name: 'Provocation', cost: 15, kind: 'support', target: 'self',
          selfEffects: [fx('provocation', 2)],
          desc: 'Force les ennemis à attaquer le Guerrier pendant 2 tours (+30 % Défense)',
        }),
        minor('robustesse', 'Robustesse', 1, 4, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        minor('maitrise-bouclier', 'Maîtrise du bouclier', 2, 3, '+3 % Blocage par rang.', { flat: { blocage: 3 } }),
        minor('colere-contenue', 'Colère contenue', 2, 3, '+3 Rage par coup encaissé, par rang.', { passive: { resOnHitTaken: 3 } }),
        passive('rempart', 'Rempart', 3, 'Défendre donne aussi un Bouclier égal à 15 % des PV max.', { passive: { guardShieldPct: 15 } }),
        minor('endurance', 'Endurance', 3, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        skill(4, {
          id: 'coup-de-bouclier', name: 'Coup de bouclier', cost: 25, kind: 'damage', target: 'enemy', power: 1.1,
          effects: [fx('etourdi', 1)],
          desc: 'Frappe du bouclier : la cible perd son prochain tour',
        }),
        minor('bastion', 'Bastion', 4, 5, '+8 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 8 } }),
        minor('armure-lourde', 'Armure lourde', 5, 3, '+5 % Défense par rang.', { pct: { def: 5 } }),
        minor('tenacite', 'Ténacité', 5, 3, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        passive('garde-de-fer', 'Garde de fer', 6, 'Défendre réduit les dégâts de 65 % au lieu de 50 %.', { passive: { guardBonus: 15 } }),
        minor('inebranlable', 'Inébranlable', 6, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        skill(7, {
          id: 'mur-de-boucliers', name: 'Mur de boucliers', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 2, 0.9)],
          desc: "Bouclier sur toute l'équipe pendant 2 tours",
        }),
        minor('protecteur', 'Protecteur', 7, 5, '+6 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 6 } }),
        passive('cri-de-defi', 'Cri de défi', 8, 'Provocation donne aussi Protection au Guerrier (+50 % Défense et Défense magique).', {
          skillMod: { skill: 'provocation', addSelfEffects: [fx('protection', 2)] },
        }),
        minor('colosse', 'Colosse', 8, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        signature({
          id: 'dernier-rempart', name: 'Dernier rempart', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 3, 1.6), fx('protection', 3)],
          selfEffects: [fx('provocation', 3)],
          desc: "Énorme Bouclier et Protection sur toute l'équipe pendant 3 tours ; le Guerrier provoque les ennemis",
        }),
      ],
    },
    {
      key: 'berserker', name: 'Berserker', icon: '🪓',
      desc: 'Dégâts : plus il est blessé, plus il frappe fort. Arme à deux mains, armure moyenne.',
      nodes: [
        minor('soif-de-sang', 'Soif de sang', 0, 3, '+4 % Puissance physique par rang.', { pct: { physPower: 4 } }),
        minor('brutalite', 'Brutalité', 0, 2, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        skill(1, {
          id: 'frappe-sauvage', name: 'Frappe sauvage', cost: 25, kind: 'damage', target: 'enemy', power: 1.7, critBonus: 25,
          desc: 'Coup violent, +25 % de chance de critique',
        }),
        minor('fureur', 'Fureur', 1, 4, '+2 Rage par attaque simple, par rang.', { passive: { resOnAttack: 2 } }),
        minor('rage-sanguinaire', 'Rage sanguinaire', 2, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        minor('sauvagerie', 'Sauvagerie', 2, 3, '+8 % Dégâts critiques par rang.', { flat: { critDmg: 8 } }),
        passive('berserk', 'Berserk', 3, '+3 % de puissance physique par tranche de 10 % de PV manquants.', { passive: { berserk: 3 } }),
        minor('carnage', 'Carnage', 3, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        skill(4, {
          id: 'tourbillon', name: 'Tourbillon', cost: 40, kind: 'damage', target: 'allEnemies', power: 1.0,
          desc: 'Frappe tous les ennemis',
        }),
        minor('vampirisme', 'Vampirisme', 4, 5, 'Vol de vie : +2 % des dégâts directs infligés rendus en PV, par rang.', { passive: { lifestealPct: 2 } }),
        minor('executeur', 'Exécuteur', 5, 3, '+8 % de dégâts contre une cible sous 30 % de PV, par rang.', { passive: { executePct: 8 } }),
        minor('peau-epaisse', 'Peau épaisse', 5, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('frenesie', 'Frénésie', 6, 'Frappe sauvage coûte 10 Rage de moins et frappe 20 % plus fort.', {
          skillMod: { skill: 'frappe-sauvage', costDelta: -10, powerPct: 20 },
        }),
        minor('colere', 'Colère', 6, 4, '+3 Rage par coup encaissé, par rang.', { passive: { resOnHitTaken: 3 } }),
        skill(7, {
          id: 'execution', name: 'Exécution', cost: 35, kind: 'damage', target: 'enemy', power: 1.6, executePct: 100,
          desc: 'Coup mortel : dégâts doublés contre une cible sous 30 % de PV',
        }),
        minor('soif-de-combat', 'Soif de combat', 7, 5, '+2 % Puissance physique par rang.', { pct: { physPower: 2 } }),
        passive('sang-bouillant', 'Sang bouillant', 8, 'Berserk : +2 % de puissance en plus par tranche de 10 % de PV manquants.', { passive: { berserk: 2 } }),
        minor('rage-eternelle', 'Rage éternelle', 8, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        signature({
          id: 'carnage-sanglant', name: 'Carnage sanglant', cost: 80, kind: 'damage', target: 'allEnemies', power: 2.2,
          selfEffects: [fx('enrage', 3)],
          desc: 'Déferlement de coups sur tous les ennemis, puis Enragé 3 tours (+30 % puissance physique, −20 % Défense)',
        }),
      ],
    },
  ],

  voleur: [
    {
      key: 'assassin', name: 'Assassin', icon: '🗡️',
      desc: "Plus d'Énergie donc plus d'actions par tour, coups critiques et points de combo en rafale. Dagues, armure moyenne.",
      nodes: [
        minor('vivacite', 'Vivacité', 0, 3, '+10 Énergie max et +3 Énergie regagnée par tour, par rang.', { passive: { resMaxBonus: 10, resRegen: 3 } }),
        minor('precision', 'Précision', 0, 2, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        skill(1, {
          id: 'taillade', name: 'Taillade', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, comboGain: 1,
          effects: [fx('ralenti', 2)],
          desc: 'Coup rapide qui ralentit la cible (−30 % Vitesse, 2 tours) et donne 1 point de combo',
        }),
        minor('lames-aiguisees', 'Lames aiguisées', 1, 4, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        minor('reflexes', 'Réflexes', 2, 3, '+2 % Esquive par rang.', { flat: { esquive: 2 } }),
        minor('pas-de-l-ombre', "Pas de l'ombre", 2, 3, '+1 Vitesse par rang.', { flat: { vit: 1 } }),
        passive('sceau-du-destin', 'Sceau du destin', 3, "Un coup critique d'une compétence qui donne des points de combo en donne 1 de plus.", { passive: { critCombo: 1 } }),
        minor('agilite-feline', 'Agilité féline', 3, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        skill(4, {
          id: 'poussee-d-adrenaline', name: "Poussée d'adrénaline", cost: 10, kind: 'support', target: 'self',
          resourceGain: 60, oncePerCombat: true, selfEffects: [fx('hate', 2)],
          desc: "Une fois par combat : rend 60 Énergie et donne Hâte (+25 % Vitesse, 2 tours)",
        }),
        minor('souffle', 'Souffle', 4, 5, '+4 Énergie max par rang.', { passive: { resMaxBonus: 4 } }),
        minor('coup-en-traitre', 'Coup en traître', 5, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        minor('implacable', 'Implacable', 5, 3, 'Chaque finisher rend 2 Énergie par point de combo dépensé, par rang.', { passive: { finisherRefund: 2 } }),
        passive('instinct-du-tueur', 'Instinct du tueur', 6, '+30 % de dégâts contre une cible sous 30 % de PV.', { passive: { executePct: 30 } }),
        minor('adresse', 'Adresse', 6, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        skill(7, {
          id: 'deluge-de-lames', name: 'Déluge de lames', cost: 35, kind: 'damage', target: 'enemy', power: 0.17, hits: 4, finisher: true, critBonus: 15,
          desc: 'Finisher : quatre coups rapides (+15 % de chance de critique), plus forts à chaque point de combo',
        }),
        minor('maitre-des-lames', 'Maître des lames', 7, 5, '+5 % Dégâts critiques par rang.', { flat: { critDmg: 5 } }),
        passive('rafale', 'Rafale', 8, 'Coup Vicieux coûte 5 Énergie de moins et frappe 15 % plus fort.', {
          skillMod: { skill: 'coup-vicieux', costDelta: -5, powerPct: 15 },
        }),
        minor('second-souffle', 'Second souffle', 8, 4, '+3 Énergie regagnée par tour, par rang.', { passive: { resRegen: 3 } }),
        signature({
          id: 'marque-de-la-mort', name: 'Marque de la mort', cost: 40, kind: 'damage', target: 'enemy', power: 0.8, finisher: true, alwaysCrit: true,
          desc: 'Finisher : coup critique garanti dévastateur, plus fort à chaque point de combo',
        }),
      ],
    },
    {
      key: 'empoisonneur', name: 'Empoisonneur', icon: '🧪',
      desc: "Moins d'actions mais des poisons puissants : dégâts physiques sur la durée et affaiblissements. Dagues, armure moyenne.",
      nodes: [
        minor('toxines', 'Toxines', 0, 3, '+8 % de dégâts sur la durée par rang.', { passive: { dotPct: 8 } }),
        minor('opportuniste', 'Opportuniste', 0, 2, '+6 % de dégâts directs contre une cible affaiblie (empoisonnée, ralentie…) par rang.', { passive: { vsDebuffedPct: 6 } }),
        skill(1, {
          id: 'lame-empoisonnee', name: 'Lame empoisonnée', cost: 45, kind: 'damage', target: 'enemy', power: 0.5, comboGain: 1,
          effects: [fx('poison', 4, 0.45)],
          desc: 'Empoisonne la cible pendant 4 tours et donne 1 point de combo',
        }),
        minor('concentration', 'Concentration', 1, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        minor('anatomie', 'Anatomie', 2, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        minor('sang-froid', 'Sang-froid', 2, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('venin-virulent', 'Venin virulent', 3, 'Lame empoisonnée : poison +50 % et rend la cible Affaiblie (−20 % puissance physique et magique, 4 tours).', {
          skillMod: { skill: 'lame-empoisonnee', dotPowerPct: 50, addEffects: [fx('affaibli', 4)] },
        }),
        minor('toxicite', 'Toxicité', 3, 4, '+6 % de dégâts sur la durée par rang.', { passive: { dotPct: 6 } }),
        skill(4, {
          id: 'gaz-nauseabond', name: 'Gaz nauséabond', cost: 40, kind: 'support', target: 'allEnemies', comboGain: 1,
          effects: [fx('poison', 3, 0.25), fx('affaibli', 3)],
          desc: 'Empoisonne et affaiblit tous les ennemis pendant 3 tours, donne 1 point de combo',
        }),
        minor('opportunisme', 'Opportunisme', 4, 5, '+4 % de dégâts directs contre une cible affaiblie, par rang.', { passive: { vsDebuffedPct: 4 } }),
        minor('distillation', 'Distillation', 5, 3, '+6 % de dégâts sur la durée par rang.', { passive: { dotPct: 6 } }),
        minor('patience', 'Patience', 5, 3, '+2 Énergie regagnée par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('hemorragie', 'Hémorragie', 6, 'Lacération : saignement +50 % et 1 tour de plus.', {
          skillMod: { skill: 'laceration', dotPowerPct: 50, dotTurnsDelta: 1 },
        }),
        minor('resistance', 'Résistance', 6, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        skill(7, {
          id: 'fiole-de-peste', name: 'Fiole de peste', cost: 50, kind: 'damage', target: 'allEnemies', power: 0.1, finisher: true,
          effects: [fx('poison', 4, 0.14)],
          desc: 'Finisher : empoisonne tous les ennemis pendant 4 tours, plus fort à chaque point de combo',
        }),
        minor('pestilence', 'Pestilence', 7, 5, '+5 % de dégâts sur la durée par rang.', { passive: { dotPct: 5 } }),
        passive('poison-paralysant', 'Poison paralysant', 8, 'Lame empoisonnée ralentit aussi la cible (−30 % Vitesse, 2 tours).', {
          skillMod: { skill: 'lame-empoisonnee', addEffects: [fx('ralenti', 2)] },
        }),
        minor('venin-concentre', 'Venin concentré', 8, 4, '+4 % de dégâts sur la durée par rang.', { passive: { dotPct: 4 } }),
        signature({
          id: 'mort-lente', name: 'Mort lente', cost: 50, kind: 'damage', target: 'enemy', power: 0.2, finisher: true,
          effects: [fx('poison', 5, 0.35), fx('terreur', 3)],
          desc: 'Finisher : poison foudroyant sur 5 tours et Terreur (−30 % Défenses, 3 tours), plus fort à chaque point de combo',
        }),
      ],
    },
  ],

  pretre: [
    {
      key: 'clerc', name: 'Clerc', icon: '✨',
      desc: 'Soins puissants : soins de groupe, purification et résurrection. Bâton, armure légère.',
      nodes: [
        minor('devotion', 'Dévotion', 0, 3, '+5 % de soins par rang.', { passive: { healPct: 5 } }),
        minor('sagesse', 'Sagesse', 0, 2, '+10 Mana max par rang.', { passive: { resMaxBonus: 10 } }),
        skill(1, {
          id: 'priere-de-soins', name: 'Prière de soins', cost: 40, kind: 'heal', target: 'allAllies', power: 0.55,
          desc: "Soigne toute l'équipe",
        }),
        minor('meditation', 'Méditation', 1, 4, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('lumiere-bienveillante', 'Lumière bienveillante', 2, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('robustesse-sacree', 'Robustesse sacrée', 2, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('grace', 'Grâce', 3, 'Soin Majeur coûte 10 Mana de moins et soigne 20 % de plus.', {
          skillMod: { skill: 'soin-majeur', costDelta: -10, powerPct: 20 },
        }),
        minor('ferveur', 'Ferveur', 3, 4, '+4 % de soins par rang.', { passive: { healPct: 4 } }),
        skill(4, {
          id: 'resurrection', name: 'Résurrection', cost: 60, kind: 'revive', target: 'deadAlly', power: 0.4,
          desc: 'Ramène un allié tombé avec 40 % de ses PV',
        }),
        minor('clarte', 'Clarté', 4, 5, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('benediction-divine', 'Bénédiction divine', 5, 3, '+4 % de soins par rang.', { passive: { healPct: 4 } }),
        minor('esprit-serein', 'Esprit serein', 5, 3, '+8 Mana max par rang.', { passive: { resMaxBonus: 8 } }),
        passive('priere-fervente', 'Prière fervente', 6, 'Prière de soins coûte 5 Mana de moins et soigne 25 % de plus.', {
          skillMod: { skill: 'priere-de-soins', costDelta: -5, powerPct: 25 },
        }),
        minor('aura-sainte', 'Aura sainte', 6, 4, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        skill(7, {
          id: 'purification', name: 'Purification', cost: 25, kind: 'heal', target: 'ally', power: 0.5, cleanse: true,
          desc: "Retire tous les effets négatifs d'un allié et le soigne",
        }),
        minor('misericorde', 'Miséricorde', 7, 5, '+3 % de soins par rang.', { passive: { healPct: 3 } }),
        passive('resurrection-superieure', 'Résurrection supérieure', 8, 'Résurrection coûte 20 Mana de moins et relève avec 70 % des PV.', {
          skillMod: { skill: 'resurrection', costDelta: -20, powerPct: 75 },
        }),
        minor('illumination', 'Illumination', 8, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        signature({
          id: 'miracle', name: 'Miracle', cost: 80, kind: 'heal', target: 'allAllies', power: 1.2, cleanse: true,
          effects: [fx('bouclier', 2, 0.5)],
          desc: "Soin massif de toute l'équipe, retire tous ses effets négatifs et la protège d'un Bouclier",
        }),
      ],
    },
    {
      key: 'precheur', name: 'Prêcheur', icon: '📖',
      desc: 'Hybride : soins sur la durée, boucliers, bénédictions et lumière. Bâton, armure légère.',
      nodes: [
        minor('foi', 'Foi', 0, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('constance', 'Constance', 0, 2, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        skill(1, {
          id: 'renovation', name: 'Rénovation', cost: 25, kind: 'support', target: 'ally',
          effects: [fx('regeneration', 4, 0.35)],
          desc: 'Soigne un allié à chaque fin de tour pendant 4 tours',
        }),
        minor('harmonie', 'Harmonie', 1, 4, '+4 % de soins par rang.', { passive: { healPct: 4 } }),
        minor('bouclier-de-foi', 'Bouclier de foi', 2, 3, '+6 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 6 } }),
        minor('piete', 'Piété', 2, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('renovation-persistante', 'Rénovation persistante', 3, 'Rénovation dure 1 tour de plus et soigne 25 % de plus.', {
          skillMod: { skill: 'renovation', effectTurnsDelta: 1, effectPowerPct: 25 },
        }),
        minor('serenite', 'Sérénité', 3, 4, '+4 % de soins par rang.', { passive: { healPct: 4 } }),
        skill(4, {
          id: 'bouclier-sacre', name: 'Bouclier sacré', cost: 30, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1.2)],
          desc: 'Protège un allié par un Bouclier pendant 3 tours',
        }),
        minor('egide', 'Égide', 4, 5, '+5 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 5 } }),
        minor('lumiere-interieure', 'Lumière intérieure', 5, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('sermon', 'Sermon', 5, 3, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('bouclier-de-lumiere', 'Bouclier de lumière', 6, 'Bouclier sacré donne aussi Régénération pendant 3 tours.', {
          skillMod: { skill: 'bouclier-sacre', addEffects: [fx('regeneration', 3, 0.2)] },
        }),
        minor('grace-celeste', 'Grâce céleste', 6, 4, '+3 % de soins par rang.', { passive: { healPct: 3 } }),
        skill(7, {
          id: 'jugement', name: 'Jugement', cost: 35, kind: 'damage', target: 'enemy', power: 1.5, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe de lumière qui embrase la cible (Brûlure sur 3 tours)',
        }),
        minor('zele', 'Zèle', 7, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        passive('egide-superieure', 'Égide supérieure', 8, 'Bouclier sacré coûte 5 Mana de moins et protège 30 % de plus.', {
          skillMod: { skill: 'bouclier-sacre', costDelta: -5, effectPowerPct: 30 },
        }),
        minor('beatitude', 'Béatitude', 8, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        signature({
          id: 'hymne-divin', name: 'Hymne divin', cost: 75, kind: 'support', target: 'allAllies', magic: true,
          effects: [fx('regeneration', 4, 0.3), fx('bouclier', 3, 0.8), fx('puissance', 3)],
          desc: "Régénération, Bouclier et Puissance sur toute l'équipe",
        }),
      ],
    },
    {
      key: 'profane', name: 'Profane', icon: '🌑',
      desc: 'Ténèbres : dégâts magiques sur la durée, confusion et terreur. Bâton, armure légère.',
      nodes: [
        minor('ombre', 'Ombre', 0, 3, '+8 % de dégâts sur la durée par rang.', { passive: { dotPct: 8 } }),
        minor('esprit-sombre', 'Esprit sombre', 0, 2, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        skill(1, {
          id: 'mot-de-douleur', name: 'Mot de douleur', cost: 20, kind: 'damage', target: 'enemy', power: 0.3, magic: true,
          effects: [fx('tenebres', 4, 0.4)],
          desc: 'Dégâts de ténèbres sur 4 tours',
        }),
        minor('noirceur', 'Noirceur', 1, 4, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('malveillance', 'Malveillance', 2, 3, '+6 % de dégâts sur la durée par rang.', { passive: { dotPct: 6 } }),
        minor('voile-d-ombre', "Voile d'ombre", 2, 3, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        passive('douleur-prolongee', 'Douleur prolongée', 3, 'Mot de douleur dure 2 tours de plus.', {
          skillMod: { skill: 'mot-de-douleur', dotTurnsDelta: 2 },
        }),
        minor('corruption', 'Corruption', 3, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        skill(4, {
          id: 'confusion', name: 'Confusion', cost: 30, kind: 'support', target: 'enemy',
          effects: [fx('confus', 2)],
          desc: 'La cible a une chance sur deux de frapper ses alliés pendant 2 tours',
        }),
        minor('tourment', 'Tourment', 4, 5, '+5 % de dégâts sur la durée par rang.', { passive: { dotPct: 5 } }),
        minor('supplice', 'Supplice', 5, 3, '+5 % de dégâts directs contre une cible affaiblie, par rang.', { passive: { vsDebuffedPct: 5 } }),
        minor('pacte', 'Pacte', 5, 3, '+8 Mana max par rang.', { passive: { resMaxBonus: 8 } }),
        passive('demence', 'Démence', 6, 'Confusion inflige aussi Terreur (−30 % Défense et Défense magique, 2 tours).', {
          skillMod: { skill: 'confusion', addEffects: [fx('terreur', 2)] },
        }),
        minor('desespoir', 'Désespoir', 6, 4, '+4 % de dégâts sur la durée par rang.', { passive: { dotPct: 4 } }),
        skill(7, {
          id: 'fleau', name: 'Fléau', cost: 45, kind: 'support', target: 'allEnemies', magic: true,
          effects: [fx('tenebres', 3, 0.5)],
          desc: 'Dégâts de ténèbres sur 3 tours à tous les ennemis',
        }),
        minor('neant', 'Néant', 7, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        passive('contagion', 'Contagion', 8, 'Fléau dure 1 tour de plus et inflige 25 % de dégâts en plus.', {
          skillMod: { skill: 'fleau', dotTurnsDelta: 1, dotPowerPct: 25 },
        }),
        minor('ombre-devorante', 'Ombre dévorante', 8, 4, '+4 % de dégâts sur la durée par rang.', { passive: { dotPct: 4 } }),
        signature({
          id: 'apocalypse', name: 'Apocalypse', cost: 75, kind: 'damage', target: 'allEnemies', power: 0.8, magic: true,
          effects: [fx('tenebres', 4, 0.7), fx('affaibli', 3)],
          desc: 'Déchaîne les ténèbres sur tous les ennemis : dégâts, Ténèbres sur 4 tours et Affaibli',
        }),
      ],
    },
  ],

  mage: [
    {
      key: 'feu', name: 'Mage de feu', icon: '🔥',
      desc: 'Dégâts sur la durée : brûlures sur une cible ou sur tous les ennemis.',
      nodes: [
        minor('chaleur', 'Chaleur', 0, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('combustion', 'Combustion', 0, 2, '+8 % de dégâts sur la durée par rang.', { passive: { dotPct: 8 } }),
        skill(1, {
          id: 'immolation', name: 'Immolation', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, magic: true,
          effects: [fx('brulure', 3, 0.4)],
          desc: 'Enflamme la cible (Brûlure sur 3 tours)',
        }),
        minor('braises', 'Braises', 1, 4, '+6 % de dégâts sur la durée par rang.', { passive: { dotPct: 6 } }),
        minor('flammes-vives', 'Flammes vives', 2, 3, '+6 % de dégâts sur la durée par rang.', { passive: { dotPct: 6 } }),
        minor('reserve-de-mana', 'Réserve de mana', 2, 3, '+8 Mana max par rang.', { passive: { resMaxBonus: 8 } }),
        passive('boule-ardente', 'Boule ardente', 3, 'Boule de Feu enflamme aussi la cible (Brûlure sur 3 tours).', {
          skillMod: { skill: 'boule-de-feu', addEffects: [fx('brulure', 3, 0.3)] },
        }),
        minor('pyromanie', 'Pyromanie', 3, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        skill(4, {
          id: 'mur-de-flammes', name: 'Mur de flammes', cost: 40, kind: 'damage', target: 'allEnemies', power: 0.4, magic: true,
          effects: [fx('brulure', 3, 0.35)],
          desc: 'Embrase tous les ennemis (Brûlure sur 3 tours)',
        }),
        minor('incendie', 'Incendie', 4, 5, '+5 % de dégâts sur la durée par rang.', { passive: { dotPct: 5 } }),
        minor('brasier', 'Brasier', 5, 3, '+5 % de dégâts des compétences de zone par rang.', { passive: { aoePct: 5 } }),
        minor('concentration-ardente', 'Concentration ardente', 5, 3, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('feu-persistant', 'Feu persistant', 6, 'Immolation brûle 2 tours de plus et 25 % plus fort.', {
          skillMod: { skill: 'immolation', dotTurnsDelta: 2, dotPowerPct: 25 },
        }),
        minor('cendres', 'Cendres', 6, 4, '+4 % de dégâts sur la durée par rang.', { passive: { dotPct: 4 } }),
        skill(7, {
          id: 'pluie-de-feu', name: 'Pluie de feu', cost: 55, kind: 'damage', target: 'allEnemies', power: 0.9, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe et enflamme tous les ennemis',
        }),
        minor('fournaise', 'Fournaise', 7, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        passive('embrasement', 'Embrasement', 8, 'Mur de flammes et Pluie de feu : Brûlure 1 tour de plus et 30 % plus forte.', {
          skillMod: [
            { skill: 'mur-de-flammes', dotTurnsDelta: 1, dotPowerPct: 30 },
            { skill: 'pluie-de-feu', dotTurnsDelta: 1, dotPowerPct: 30 },
          ],
        }),
        minor('ignition', 'Ignition', 8, 4, '+4 % de dégâts sur la durée par rang.', { passive: { dotPct: 4 } }),
        signature({
          id: 'meteore', name: 'Météore', cost: 85, kind: 'damage', target: 'allEnemies', power: 1.4, magic: true,
          effects: [fx('brulure', 4, 0.6)],
          desc: 'Un météore écrase tous les ennemis et les laisse en flammes (Brûlure sur 4 tours)',
        }),
      ],
    },
    {
      key: 'glace', name: 'Mage de glace', icon: '❄️',
      desc: 'Bons dégâts directs et ralentissements ; plus de dégâts contre les cibles affaiblies.',
      nodes: [
        minor('froid', 'Froid', 0, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('armure-de-givre', 'Armure de givre', 0, 2, '+5 % Défense et Défense magique par rang.', { pct: { def: 5, defMag: 5 } }),
        skill(1, {
          id: 'eclat-de-glace', name: 'Éclat de glace', cost: 20, kind: 'damage', target: 'enemy', power: 1.2, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace, ralentit la cible 2 tours',
        }),
        minor('morsure-du-froid', 'Morsure du froid', 1, 4, '+4 % de dégâts contre une cible affaiblie (ralentie…) par rang.', { passive: { vsDebuffedPct: 4 } }),
        minor('hiver', 'Hiver', 2, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('esprit-glace', 'Esprit glacé', 2, 3, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('givre-persistant', 'Givre persistant', 3, 'Éclat de glace ralentit 1 tour de plus et frappe 15 % plus fort.', {
          skillMod: { skill: 'eclat-de-glace', effectTurnsDelta: 1, powerPct: 15 },
        }),
        minor('cristaux', 'Cristaux', 3, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        skill(4, {
          id: 'nova-de-givre', name: 'Nova de givre', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.6, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace et ralentissement sur tous les ennemis',
        }),
        minor('glace-eternelle', 'Glace éternelle', 4, 5, '+3 % de dégâts contre une cible affaiblie, par rang.', { passive: { vsDebuffedPct: 3 } }),
        minor('blizzard-interieur', 'Blizzard intérieur', 5, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('barriere-de-glace', 'Barrière de glace', 5, 3, '+4 % PV par rang.', { pct: { pv: 4 } }),
        passive('eclatement', 'Éclatement', 6, '+15 % de dégâts contre une cible affaiblie.', { passive: { vsDebuffedPct: 15 } }),
        minor('precision-glaciale', 'Précision glaciale', 6, 4, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        skill(7, {
          id: 'lance-de-glace', name: 'Lance de glace', cost: 35, kind: 'damage', target: 'enemy', power: 2.1, magic: true,
          desc: 'Puissante lance de glace sur un ennemi',
        }),
        minor('zero-absolu', 'Zéro absolu', 7, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        passive('gel-profond', 'Gel profond', 8, 'Nova de givre frappe 30 % plus fort et ralentit 1 tour de plus.', {
          skillMod: { skill: 'nova-de-givre', powerPct: 30, effectTurnsDelta: 1 },
        }),
        minor('hivernage', 'Hivernage', 8, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        signature({
          id: 'blizzard', name: 'Blizzard', cost: 80, kind: 'damage', target: 'allEnemies', power: 1.5, magic: true,
          effects: [fx('ralenti', 3), fx('affaibli', 2)],
          desc: 'Tempête de glace sur tous les ennemis : lourds dégâts, Ralenti 3 tours et Affaibli 2 tours',
        }),
      ],
    },
    {
      key: 'foudre', name: 'Mage de foudre', icon: '⚡',
      desc: 'Dégâts directs très élevés, critiques, et un sort qui étourdit.',
      nodes: [
        minor('conductivite', 'Conductivité', 0, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        minor('surtension', 'Surtension', 0, 2, '+8 % Dégâts critiques par rang.', { flat: { critDmg: 8 } }),
        skill(1, {
          id: 'chaine-d-eclairs', name: "Chaîne d'éclairs", cost: 35, kind: 'damage', target: 'allEnemies', power: 0.9, magic: true,
          desc: 'Foudroie tous les ennemis',
        }),
        minor('charge', 'Charge', 1, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('electrisation', 'Électrisation', 2, 3, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        minor('flux', 'Flux', 2, 3, '+8 Mana max par rang.', { passive: { resMaxBonus: 8 } }),
        passive('eclair-renforce', 'Éclair renforcé', 3, 'Éclair coûte 5 Mana de moins et frappe 25 % plus fort.', {
          skillMod: { skill: 'eclair', costDelta: -5, powerPct: 25 },
        }),
        minor('etincelle', 'Étincelle', 3, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        skill(4, {
          id: 'onde-de-choc', name: 'Onde de choc', cost: 40, kind: 'damage', target: 'enemy', power: 1.0, magic: true,
          effects: [fx('etourdi', 1)],
          desc: 'Décharge paralysante : la cible perd son prochain tour',
        }),
        minor('haute-tension', 'Haute tension', 4, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('coup-de-tonnerre', 'Coup de tonnerre', 5, 3, '+8 % de dégâts contre une cible sous 30 % de PV, par rang.', { passive: { executePct: 8 } }),
        minor('recharge', 'Recharge', 5, 3, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('electrocution', 'Électrocution', 6, 'Éclair a +25 % de chance de coup critique.', {
          skillMod: { skill: 'eclair', critBonus: 25 },
        }),
        minor('foudroiement', 'Foudroiement', 6, 4, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        skill(7, {
          id: 'tempete', name: 'Tempête', cost: 60, kind: 'damage', target: 'enemy', power: 3.0, magic: true,
          desc: 'Énorme décharge de foudre sur un ennemi',
        }),
        minor('arc-electrique', 'Arc électrique', 7, 5, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        passive('paralysie', 'Paralysie', 8, 'Onde de choc coûte 10 Mana de moins et frappe 30 % plus fort.', {
          skillMod: { skill: 'onde-de-choc', costDelta: -10, powerPct: 30 },
        }),
        minor('orage', 'Orage', 8, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        signature({
          id: 'jugement-celeste', name: 'Jugement céleste', cost: 90, kind: 'damage', target: 'allEnemies', power: 1.9, magic: true, critBonus: 25,
          effects: [fx('etourdi', 1)],
          desc: 'La foudre frappe tous les ennemis (+25 % de chance de critique) et les étourdit',
        }),
      ],
    },
  ],

  chasseur: [
    {
      key: 'oeilDeFaucon', name: 'Œil de Faucon', icon: '🦅',
      desc: "Dégâts explosifs : tirs très coûteux en Énergie mais dévastateurs. Arc, armure moyenne.",
      nodes: [
        minor('oeil-percant', 'Œil perçant', 0, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        minor('tension-de-la-corde', 'Tension de la corde', 0, 2, '+4 % Puissance physique par rang.', { pct: { physPower: 4 } }),
        skill(1, {
          id: 'tir-percant', name: 'Tir perçant', cost: 55, kind: 'damage', target: 'enemy', power: 1.75, critBonus: 10,
          desc: 'Flèche lourde qui transperce la cible (+10 % de chance de critique)',
        }),
        minor('reserve-d-energie', "Réserve d'énergie", 1, 4, '+8 Énergie max par rang.', { passive: { resMaxBonus: 8 } }),
        minor('visee', 'Visée', 2, 3, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        minor('souffle-retenu', 'Souffle retenu', 2, 3, '+2 Énergie regagnée par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('tir-ajuste', 'Tir ajusté', 3, 'Tir visé frappe 25 % plus fort.', {
          skillMod: { skill: 'tir-vise', powerPct: 25 },
        }),
        minor('precision-mortelle', 'Précision mortelle', 3, 4, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        skill(4, {
          id: 'salve', name: 'Salve', cost: 60, kind: 'damage', target: 'allEnemies', power: 0.95,
          desc: 'Pluie de flèches sur tous les ennemis',
        }),
        minor('puissance-du-tir', 'Puissance du tir', 4, 5, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        minor('chasseur-de-tetes', 'Chasseur de têtes', 5, 3, '+8 % de dégâts contre une cible sous 30 % de PV, par rang.', { passive: { executePct: 8 } }),
        minor('endurance-du-chasseur', 'Endurance du chasseur', 5, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('calme-du-tireur', 'Calme du tireur', 6, '+20 Énergie max et +5 Énergie regagnée par tour.', { passive: { resMaxBonus: 20, resRegen: 5 } }),
        minor('balistique', 'Balistique', 6, 4, '+6 % Dégâts critiques par rang.', { flat: { critDmg: 6 } }),
        skill(7, {
          id: 'tir-de-l-aigle', name: "Tir de l'aigle", cost: 80, kind: 'damage', target: 'enemy', power: 3.0, critBonus: 20,
          desc: 'Tir dévastateur sur un ennemi (+20 % de chance de critique)',
        }),
        minor('oeil-du-faucon', 'Œil du faucon', 7, 5, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        passive('fleche-perforante', 'Flèche perforante', 8, 'Tir perçant coûte 10 Énergie de moins et frappe 20 % plus fort.', {
          skillMod: { skill: 'tir-percant', costDelta: -10, powerPct: 20 },
        }),
        minor('visee-parfaite', 'Visée parfaite', 8, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        signature({
          id: 'tir-fatal', name: 'Tir fatal', cost: 90, kind: 'damage', target: 'enemy', power: 4.5, alwaysCrit: true, executePct: 50,
          desc: 'La flèche parfaite : critique garanti, +50 % de dégâts contre une cible sous 30 % de PV',
        }),
      ],
    },
    {
      key: 'traqueur', name: 'Traqueur', icon: '🐾',
      desc: 'Petits tirs peu coûteux, ralentissements et pièges : beaucoup d\'actions et beaucoup de contrôle. Arc, armure moyenne.',
      nodes: [
        minor('pisteur', 'Pisteur', 0, 3, '+1 Vitesse par rang.', { flat: { vit: 1 } }),
        minor('reflexes-du-traqueur', 'Réflexes du traqueur', 0, 2, '+2 % Esquive par rang.', { flat: { esquive: 2 } }),
        skill(1, {
          id: 'piege-a-machoires', name: 'Piège à mâchoires', cost: 25, kind: 'support', target: 'enemy',
          effects: [fx('piege', 3, 0.8)],
          desc: "Pose un piège sur un ennemi : il se referme à son prochain tour (dégâts, et il perd ce tour)",
        }),
        minor('tir-agile', 'Tir agile', 1, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        minor('economie', 'Économie', 2, 3, '+2 Énergie regagnée par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('camouflage', 'Camouflage', 2, 3, '+2 % Esquive par rang.', { flat: { esquive: 2 } }),
        passive('fleches-barbelees', 'Flèches barbelées', 3, 'Tir rapide fait saigner la cible (2 tours).', {
          skillMod: { skill: 'tir-rapide', addEffects: [fx('saignement', 2, 0.15)] },
        }),
        minor('harcelement', 'Harcèlement', 3, 4, '+4 % de dégâts contre une cible affaiblie (ralentie, piégée…) par rang.', { passive: { vsDebuffedPct: 4 } }),
        skill(4, {
          id: 'tir-incapacitant', name: 'Tir incapacitant', cost: 20, kind: 'damage', target: 'enemy', power: 0.5,
          effects: [fx('ralenti', 2)],
          desc: 'Petite flèche qui ralentit la cible (−30 % Vitesse, 2 tours)',
        }),
        minor('pieges-affutes', 'Pièges affûtés', 4, 5, '+8 % de dégâts des pièges par rang.', { passive: { trapPct: 8 } }),
        minor('vivacite-du-traqueur', 'Vivacité du traqueur', 5, 3, '+2 Énergie regagnée par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('instinct', 'Instinct', 5, 3, '+2 % Taux critique par rang.', { flat: { critChance: 2 } }),
        passive('maitre-piegeur', 'Maître piégeur', 6, 'Piège à mâchoires coûte 10 Énergie de moins et inflige 30 % de dégâts en plus.', {
          skillMod: { skill: 'piege-a-machoires', costDelta: -10, effectPowerPct: 30 },
        }),
        minor('tir-continu', 'Tir continu', 6, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        skill(7, {
          id: 'champ-de-givre', name: 'Champ de givre', cost: 35, kind: 'support', target: 'allEnemies',
          effects: [fx('piegeDeGivre', 3, 0.5)],
          desc: 'Piège de givre sous tous les ennemis : dégâts à leur prochain tour, puis Ralentis 3 tours',
        }),
        minor('harcelement-continu', 'Harcèlement continu', 7, 5, '+3 % de dégâts contre une cible affaiblie, par rang.', { passive: { vsDebuffedPct: 3 } }),
        passive('tir-eclair', 'Tir éclair', 8, 'Tir rapide coûte 5 Énergie de moins et frappe 15 % plus fort.', {
          skillMod: { skill: 'tir-rapide', costDelta: -5, powerPct: 15 },
        }),
        minor('endurance-du-traqueur', 'Endurance du traqueur', 8, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        signature({
          id: 'terrain-piege', name: 'Terrain piégé', cost: 60, kind: 'damage', target: 'allEnemies', power: 0.6,
          effects: [fx('piege', 3, 1.0), fx('ralenti', 3)],
          desc: 'Flèches et pièges partout : dégâts sur tous les ennemis, Ralentis, et un Piège à mâchoires sous chacun',
        }),
      ],
    },
  ],

  paladin: [
    {
      key: 'templier', name: 'Templier', icon: '🛡️',
      desc: "Tank au Mana : se soigne lui-même et encaisse les dégâts de ses alliés. Monte la Force : armure lourde, armes et bouclier de Force.",
      nodes: [
        minor('armure-sacree', 'Armure sacrée', 0, 3, '+4 % Défense par rang.', { pct: { def: 4 } }),
        minor('vigueur', 'Vigueur', 0, 2, '+4 % PV par rang.', { pct: { pv: 4 } }),
        skill(1, {
          id: 'intercession', name: 'Intercession', cost: 20, kind: 'support', target: 'ally',
          effects: [fx('intercession', 3)],
          desc: 'Le Paladin encaisse la moitié des dégâts subis par un allié pendant 3 tours',
        }),
        minor('foi-inebranlable', 'Foi inébranlable', 1, 4, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        minor('bouclier-beni', 'Bouclier béni', 2, 3, '+3 % Blocage par rang.', { flat: { blocage: 3 } }),
        minor('robustesse-du-croise', 'Robustesse du croisé', 2, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('vengeance-sacree', 'Vengeance sacrée', 3, 'Vol de vie : 10 % des dégâts directs infligés rendus en PV.', { passive: { lifestealPct: 10 } }),
        minor('ferveur-du-croise', 'Ferveur du croisé', 3, 4, '+3 % Puissance physique par rang.', { pct: { physPower: 3 } }),
        skill(4, {
          id: 'sceau-de-vie', name: 'Sceau de vie', cost: 30, kind: 'heal', target: 'self', power: 1.0, physHeal: true,
          effects: [fx('regeneration', 3, 0.25)],
          desc: 'Le Paladin se soigne et se régénère pendant 3 tours (soins sur la Force)',
        }),
        minor('rempart-de-foi', 'Rempart de foi', 4, 5, '+6 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 6 } }),
        minor('consecration', 'Consécration', 5, 3, '+4 % Défense par rang.', { pct: { def: 4 } }),
        minor('aura-de-devotion', 'Aura de dévotion', 5, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('garde-du-croise', 'Garde du croisé', 6, 'Défendre donne aussi un Bouclier égal à 12 % des PV max.', { passive: { guardShieldPct: 12 } }),
        minor('endurance-sainte', 'Endurance sainte', 6, 4, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        skill(7, {
          id: 'aura-de-protection', name: 'Aura de protection', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 2), fx('bouclier', 2, 0.6)],
          desc: "Bouclier sur toute l'équipe ; le Paladin encaisse la moitié des dégâts de ses alliés pendant 2 tours",
        }),
        minor('bouclier-des-justes', 'Bouclier des justes', 7, 5, '+5 % de valeur des boucliers donnés, par rang.', { passive: { shieldPct: 5 } }),
        passive('martyr', 'Martyr', 8, 'Intercession coûte 5 Mana de moins et dure 2 tours de plus.', {
          skillMod: { skill: 'intercession', costDelta: -5, effectTurnsDelta: 2 },
        }),
        minor('colosse-sacre', 'Colosse sacré', 8, 4, '+3 % PV par rang.', { pct: { pv: 3 } }),
        signature({
          id: 'sacrifice-divin', name: 'Sacrifice divin', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 3)],
          selfEffects: [fx('bouclier', 3, 2.0), fx('protection', 3), fx('provocation', 3)],
          desc: "Le Paladin attire les ennemis et encaisse la moitié des dégâts de toute l'équipe, protégé par un énorme Bouclier et Protection (3 tours)",
        }),
      ],
    },
    {
      key: 'lumiere', name: 'Lumière', icon: '☀️',
      desc: "Soigneur : soins de groupe et guérison des effets négatifs. Monte l'Intelligence : armure légère, armes d'Intelligence.",
      nodes: [
        minor('eclat-sacre', 'Éclat sacré', 0, 3, '+5 % de soins par rang.', { passive: { healPct: 5 } }),
        minor('sagesse-du-paladin', 'Sagesse du paladin', 0, 2, '+10 Mana max par rang.', { passive: { resMaxBonus: 10 } }),
        skill(1, {
          id: 'lumiere-de-l-aube', name: "Lumière de l'aube", cost: 35, kind: 'heal', target: 'allAllies', power: 0.45,
          desc: "Soigne toute l'équipe",
        }),
        minor('illumination-sainte', 'Illumination sainte', 1, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('meditation-sacree', 'Méditation sacrée', 2, 3, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        minor('devouement', 'Dévouement', 2, 3, '+4 % de soins par rang.', { passive: { healPct: 4 } }),
        passive('main-de-lumiere', 'Main de lumière', 3, 'Lumière sacrée coûte 8 Mana de moins et soigne 20 % de plus.', {
          skillMod: { skill: 'lumiere-sacree', costDelta: -8, powerPct: 20 },
        }),
        minor('armure-de-foi', 'Armure de foi', 3, 4, '+4 % Défense magique par rang.', { pct: { defMag: 4 } }),
        skill(4, {
          id: 'epuration', name: 'Épuration', cost: 20, kind: 'support', target: 'ally', cleanse: true,
          desc: "Retire tous les effets négatifs d'un allié",
        }),
        minor('grace-du-paladin', 'Grâce du paladin', 4, 5, '+3 % de soins par rang.', { passive: { healPct: 3 } }),
        minor('rayonnement', 'Rayonnement', 5, 3, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        minor('benediction-du-paladin', 'Bénédiction du paladin', 5, 3, '+3 % PV par rang.', { pct: { pv: 3 } }),
        passive('lumiere-purifiante', 'Lumière purifiante', 6, "Lumière de l'aube retire aussi tous les effets négatifs de l'équipe.", {
          skillMod: { skill: 'lumiere-de-l-aube', cleanse: true },
        }),
        minor('ferveur-lumineuse', 'Ferveur lumineuse', 6, 4, '+3 % de soins par rang.', { passive: { healPct: 3 } }),
        skill(7, {
          id: 'sceau-de-protection', name: 'Sceau de protection', cost: 35, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1.0), fx('regeneration', 3, 0.25)],
          desc: 'Bouclier et Régénération sur un allié pendant 3 tours',
        }),
        minor('aube-eternelle', 'Aube éternelle', 7, 5, '+2 Mana regagné par tour, par rang.', { passive: { resRegen: 2 } }),
        passive('aura-de-guerison', 'Aura de guérison', 8, '+10 % de soins et +3 Mana regagné par tour.', { passive: { healPct: 10, resRegen: 3 } }),
        minor('clarte-sainte', 'Clarté sainte', 8, 4, '+3 % Puissance magique par rang.', { pct: { magPower: 3 } }),
        signature({
          id: 'lumiere-divine', name: 'Lumière divine', cost: 80, kind: 'heal', target: 'allAllies', power: 0.9, cleanse: true,
          effects: [fx('regeneration', 3, 0.3), fx('protection', 2)],
          desc: "Grand soin de toute l'équipe : retire ses effets négatifs, puis Régénération et Protection",
        }),
      ],
    },
  ],
};
