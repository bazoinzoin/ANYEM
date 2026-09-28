// Arbres de compétences (DESIGN_DOC §3). Données pures.
//
// Chaque classe a une orientation par branche. Une branche alterne gros et petits paliers :
//   palier 0                   gros : sort(s) de départ
//   paliers 1,3,5,7,9,11,13    petits : 3 bonus de stats, on en prend DEUX (CHOICE_PICKS),
//                              chacun à ses rangs (CHOICE_RANKS) ; changer d'avis demande
//                              une réinitialisation
//   paliers 2,4,6,8,10,12      gros : nouvelle compétence ou passif important (un seul nœud,
//                              obligatoire)
//   palier 14                  gros : compétence signature
// Un palier s'ouvre quand tous les précédents sont complets (gros appris, petit : deux bonus
// au rang maximum) : on passe forcément par chaque gros palier, et on choisit ses petits.
// Une orientation complète coûte 36 points (8 gros + 7 petits × 2 bonus × 2 rangs) : au niveau
// maximum (50 points), une orientation entière et une bonne partie d'une autre.
// Les effets des gros paliers suivent la logique de l'orientation (un bonus aux dégâts sur la
// durée ne vient qu'après le premier sort qui en inflige). Les légendaires renforcent les
// compétences et passifs des gros paliers.
//
// Nœud : { id, name, tier, ranks, kind, desc, ...effet }
//   kind 'minor'     petit palier : bonus de stats, plusieurs rangs, 2 au choix parmi 3
//        'skill'     gros palier : nouvelle compétence (champ `skill`, ou `skills` au palier 0)
//        'passive'   gros palier : nouveau passif ou amélioration de compétence
//        'signature' compétence signature (dernier palier, champ `skill`)
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
//   skills   plusieurs compétences accordées (sorts de départ du palier 0)
//   skillMod { skill: id, powerPct, costDelta, critBonus, dotTurnsDelta, dotPowerPct,
//              effectTurnsDelta, effectPowerPct, addEffects, addSelfEffects } (ou une liste)
// Les buffs/debuffs appliqués par les compétences viennent du catalogue data/effects.js.

import { CLASSES } from './classes.js';

// Rangs des petits paliers (chaque bonus choisi se prend autant de fois).
export const CHOICE_RANKS = { 1: 2, 3: 2, 5: 2, 7: 2, 9: 2, 11: 2, 13: 2 };
// Bonus à prendre dans chaque petit palier (parmi trois).
export const CHOICE_PICKS = 2;
export const SIGNATURE_TIER = 14;

// Libellés des effets, pour décrire un petit palier (« +3 % PV par rang »).
const EFFECT_LABELS = {
  flat: { critChance: ' % Coup critique', critDmg: ' % Dégâts critiques', esquive: ' % Esquive', blocage: ' % Blocage', riposte: ' % Riposte', vit: ' Vitesse' },
  pct: { pv: ' % PV', def: ' % Défense', defMag: ' % Défense magique', physPower: ' % Puissance physique', magPower: ' % Puissance magique' },
  passive: {
    dotPct: ' % de dégâts sur la durée', healPct: ' % de soins', shieldPct: ' % de valeur des boucliers donnés',
    vsDebuffedPct: ' % de dégâts contre une cible qui subit un effet négatif', executePct: ' % de dégâts contre une cible sous 30 % de PV',
    aoePct: ' % de dégâts des compétences de zone', lifestealPct: ' % des dégâts infligés rendus en PV',
    resRegen: ' de ressource regagnée par tour', resMaxBonus: ' de ressource maximum', resOnAttack: ' Rage par attaque',
    resOnHitTaken: ' Rage par coup encaissé', trapPct: ' % de dégâts des pièges', finisherRefund: ' Énergie rendue par point de combo dépensé',
    guardBonus: ' % de dégâts en moins en défendant', guardShieldPct: ' % des PV max en Bouclier en défendant',
  },
};

export function describeEffect(fx) {
  const parts = [];
  for (const group of ['flat', 'pct', 'passive']) {
    for (const [k, v] of Object.entries(fx[group] ?? {})) parts.push(`+${String(v).replace('.', ',')}${EFFECT_LABELS[group][k] ?? ` ${k}`}`);
  }
  return parts.join(', ');
}

// Raccourcis de construction des nœuds.
const minor = (id, name, fx) => ({ id, name, kind: 'minor', ...fx });
// Petit palier : trois bonus, deux au choix, chacun avec les rangs du palier.
const choice = (tier, options) => options.map((o) => ({ ...o, tier, ranks: CHOICE_RANKS[tier], desc: `${describeEffect(o)} par rang.` }));
const passive = (id, name, tier, desc, fx) => ({ id, name, tier, ranks: 1, kind: 'passive', desc, ...fx });
const skill = (tier, def) => ({ id: def.id, name: def.name, tier, ranks: 1, kind: 'skill', desc: 'Nouvelle compétence.', skill: def });
const signature = (def) => ({ id: def.id, name: def.name, tier: SIGNATURE_TIER, ranks: 1, kind: 'signature', desc: 'Compétence signature.', skill: def });
// Nœud du palier 0 : le(s) sort(s) de départ de l'orientation (voir starterSkills
// dans data/classes.js). Un héros commence sans sort et apprend celui-ci avec son
// premier point de talent.
const starter = (id, name, classKey, ids) => ({
  id, name, tier: 0, ranks: 1, kind: 'skill', desc: 'Sort de départ.',
  skills: ids.map((sid) => {
    const skill = CLASSES[classKey].starterSkills.find((sk) => sk.id === sid);
    if (!skill) throw new Error(`Sort de départ inconnu : ${sid}`);
    return skill;
  }),
});
const fx = (id, turns, power) => (power === undefined ? { id, turns } : { id, turns, power });

export const TALENTS = {
  guerrier: [
    {
      key: 'gardien', name: 'Gardien', icon: '🛡️',
      desc: 'Tank : boucliers, armure, provocation. Épée et bouclier, armure lourde.',
      nodes: [
        starter('depart-gardien', 'Cri de guerre', 'guerrier', ['cri-de-guerre']),
        ...choice(1, [
          minor('peau-de-fer', 'Peau de fer', { pct: { pv: 2.5 } }),
          minor('posture-defensive', 'Posture défensive', { pct: { def: 3 } }),
          minor('robustesse', 'Robustesse', { pct: { defMag: 3 } }),
        ]),
        skill(2, {
          id: 'provocation', name: 'Provocation', cost: 15, kind: 'support', target: 'self',
          selfEffects: [fx('provocation', 2)],
          desc: 'Force les ennemis à l\'attaquer pendant 2 tours (+30 % Défense)',
        }),
        ...choice(3, [
          minor('maitrise-bouclier', 'Maîtrise du bouclier', { flat: { blocage: 2.5 } }),
          minor('colere-contenue', 'Colère contenue', { passive: { resOnHitTaken: 2 } }),
          minor('endurance', 'Endurance', { pct: { pv: 2.5 } }),
        ]),
        passive('rempart', 'Rempart', 4, 'Défendre donne aussi un Bouclier égal à 20 % des PV max.', { passive: { guardShieldPct: 20 } }),
        ...choice(5, [
          minor('bastion', 'Bastion', { passive: { shieldPct: 6.5 } }),
          minor('armure-lourde', 'Armure lourde', { pct: { def: 5 } }),
          minor('tenacite', 'Ténacité', { pct: { defMag: 5 } }),
        ]),
        skill(6, {
          id: 'coup-de-bouclier', name: 'Coup de bouclier', cost: 25, kind: 'damage', target: 'enemy', power: 1.85,
          effects: [fx('etourdi', 1)],
          desc: 'Frappe du bouclier : la cible perd son prochain tour',
        }),
        ...choice(7, [
          minor('garde-vigilante', 'Garde vigilante', { passive: { guardBonus: 3.5 } }),
          minor('cuirasse', 'Cuirasse', { pct: { def: 3.5 } }),
          minor('sang-de-fer', 'Sang de fer', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'cri-de-defi', name: 'Cri de défi', cost: 30, kind: 'support', target: 'allEnemies',
          effects: [fx('affaibli', 2)],
          desc: 'Rugit à la face des ennemis : tous sont Affaiblis pendant 2 tours (−20 % de puissance)',
        }),
        ...choice(9, [
          minor('inebranlable', 'Inébranlable', { pct: { pv: 4 } }),
          minor('represailles', 'Représailles', { flat: { riposte: 4 } }),
          minor('protecteur', 'Protecteur', { passive: { shieldPct: 8 } }),
        ]),
        skill(10, {
          id: 'mur-de-boucliers', name: 'Mur de boucliers', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 2, 0.9)],
          desc: 'Bouclier sur toute l\'équipe pendant 2 tours',
        }),
        ...choice(11, [
          minor('bouclier-vivant', 'Bouclier vivant', { passive: { shieldPct: 6.5 } }),
          minor('riposte-ferme', 'Riposte ferme', { flat: { riposte: 5 } }),
          minor('volonte-de-fer', 'Volonté de fer', { pct: { defMag: 5 } }),
        ]),
        passive('contre-attaque', 'Contre-attaque', 12, '+15 % de Riposte et +3 Rage par coup encaissé.', { flat: { riposte: 15 }, passive: { resOnHitTaken: 3 } }),
        ...choice(13, [
          minor('colosse', 'Colosse', { pct: { pv: 4.5 } }),
          minor('garde-de-fer', 'Garde de fer', { passive: { guardBonus: 2 } }),
          minor('muraille', 'Muraille', { pct: { def: 4.5, defMag: 4.5 } }),
        ]),
        signature({
          id: 'dernier-rempart', name: 'Dernier rempart', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 3, 1.6), fx('protection', 3)],
          selfEffects: [fx('provocation', 3)],
          desc: 'Énorme Bouclier et Protection sur toute l\'équipe pendant 3 tours ; provoque aussi les ennemis',
        }),
      ],
    },
    {
      key: 'berserker', name: 'Berserker', icon: '🪓',
      desc: 'Dégâts : plus il est blessé, plus il frappe fort. Arme à deux mains, armure moyenne.',
      nodes: [
        starter('depart-berserker', 'Frappe brutale', 'guerrier', ['frappe-brutale']),
        ...choice(1, [
          minor('soif-de-sang', 'Soif de sang', { pct: { physPower: 2.5 } }),
          minor('brutalite', 'Brutalité', { flat: { critDmg: 4 } }),
          minor('fureur', 'Fureur', { passive: { resOnAttack: 2 } }),
        ]),
        skill(2, {
          id: 'frappe-sauvage', name: 'Frappe sauvage', cost: 25, kind: 'damage', target: 'enemy', power: 2.9, critBonus: 25,
          desc: 'Coup violent, +25 % de chance de critique',
        }),
        ...choice(3, [
          minor('rage-sanguinaire', 'Rage sanguinaire', { flat: { critChance: 1 } }),
          minor('sauvagerie', 'Sauvagerie', { flat: { critDmg: 5 } }),
          minor('peau-epaisse', 'Peau épaisse', { pct: { pv: 2.5 } }),
        ]),
        passive('berserk', 'Berserk', 4, '+4 % de puissance physique par tranche de 10 % de PV manquants.', { passive: { berserk: 4 } }),
        ...choice(5, [
          minor('carnage', 'Carnage', { pct: { physPower: 3 } }),
          minor('vampirisme', 'Vampirisme', { passive: { lifestealPct: 1.5 } }),
          minor('colere', 'Colère', { passive: { resOnHitTaken: 3 } }),
        ]),
        skill(6, {
          id: 'rage-aveugle', name: 'Rage aveugle', cost: 15, kind: 'support', target: 'self',
          selfEffects: [fx('enrage', 3)],
          desc: 'Cède à la rage : Enragé pendant 3 tours (+30 % de puissance physique, −20 % de Défense)',
        }),
        ...choice(7, [
          minor('frenesie', 'Frénésie', { passive: { resOnAttack: 2 } }),
          minor('coups-lourds', 'Coups lourds', { pct: { physPower: 3.5 } }),
          minor('cuir-tanne', 'Cuir tanné', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'tourbillon', name: 'Tourbillon', cost: 40, kind: 'damage', target: 'allEnemies', power: 1,
          desc: 'Frappe tous les ennemis',
        }),
        ...choice(9, [
          minor('executeur', 'Exécuteur', { passive: { executePct: 6 } }),
          minor('rage-eternelle', 'Rage éternelle', { flat: { critChance: 2 } }),
          minor('fureur-circulaire', 'Fureur circulaire', { passive: { aoePct: 6 } }),
        ]),
        skill(10, {
          id: 'execution', name: 'Exécution', cost: 35, kind: 'damage', target: 'enemy', power: 2.5, executePct: 100,
          desc: 'Coup mortel : dégâts doublés contre une cible sous 30 % de PV',
        }),
        ...choice(11, [
          minor('boucher', 'Boucher', { passive: { executePct: 6.5 } }),
          minor('sang-bouillant', 'Sang bouillant', { flat: { critDmg: 8 } }),
          minor('festin-de-sang', 'Festin de sang', { passive: { lifestealPct: 1.5 } }),
        ]),
        passive('soif-de-carnage', 'Soif de carnage', 12, '+22 % de puissance physique ; vol de vie : 8 % des dégâts directs infligés rendus en PV.', { pct: { physPower: 22 }, passive: { lifestealPct: 8 } }),
        ...choice(13, [
          minor('soif-de-combat', 'Soif de combat', { pct: { physPower: 4.5 } }),
          minor('sauvagerie-sanglante', 'Sauvagerie sanglante', { flat: { critDmg: 6.5 } }),
          minor('fureur-sanglante', 'Fureur sanglante', { passive: { lifestealPct: 2 } }),
        ]),
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
      desc: 'Plus d\'Énergie donc plus d\'actions par tour, coups critiques et points de combo en rafale. Dagues, armure moyenne.',
      nodes: [
        starter('depart-assassin', 'Lames jumelles', 'voleur', ['coup-vicieux', 'evisceration']),
        ...choice(1, [
          minor('vivacite', 'Vivacité', { passive: { resMaxBonus: 4 } }),
          minor('precision', 'Précision', { flat: { critChance: 1 } }),
          minor('lames-aiguisees', 'Lames aiguisées', { flat: { critDmg: 4 } }),
        ]),
        skill(2, {
          id: 'taillade', name: 'Taillade', cost: 25, kind: 'damage', target: 'enemy', power: 0.65, comboGain: 1,
          effects: [fx('ralenti', 2)],
          desc: 'Coup rapide qui ralentit la cible (−30 % Vitesse, 2 tours) et donne 1 point de combo',
        }),
        ...choice(3, [
          minor('reflexes', 'Réflexes', { flat: { esquive: 1 } }),
          minor('pas-de-l-ombre', 'Pas de l\'ombre', { flat: { vit: 1 } }),
          minor('agilite-feline', 'Agilité féline', { pct: { physPower: 2.5 } }),
        ]),
        passive('sceau-du-destin', 'Sceau du destin', 4, 'Un coup critique d\'une compétence qui donne des points de combo en donne un de plus.', { passive: { critCombo: 1 } }),
        ...choice(5, [
          minor('coup-en-traitre', 'Coup en traître', { flat: { critChance: 1.5 } }),
          minor('implacable', 'Implacable', { passive: { finisherRefund: 2 } }),
          minor('souffle', 'Souffle', { passive: { resRegen: 3 } }),
        ]),
        skill(6, {
          id: 'frappe-de-l-ombre', name: 'Frappe de l\'ombre', cost: 35, kind: 'damage', target: 'enemy', power: 0.5, critBonus: 20, comboGain: 2,
          desc: 'Surgit dans le dos de la cible : coup précis (+20 % de chance de critique) qui donne 2 points de combo',
        }),
        ...choice(7, [
          minor('ombre-furtive', 'Ombre furtive', { flat: { esquive: 1 } }),
          minor('lame-effilee', 'Lame effilée', { flat: { critDmg: 5 } }),
          minor('rythme', 'Rythme', { passive: { resRegen: 2 } }),
        ]),
        skill(8, {
          id: 'deluge-de-lames', name: 'Déluge de lames', cost: 35, kind: 'damage', target: 'enemy', power: 0.12, hits: 4, finisher: true, critBonus: 15,
          desc: 'Finisher : quatre coups rapides (+15 % de chance de critique), plus forts à chaque point de combo',
        }),
        ...choice(9, [
          minor('maitre-des-lames', 'Maître des lames', { flat: { critDmg: 6 } }),
          minor('adresse', 'Adresse', { pct: { physPower: 4 } }),
          minor('second-souffle', 'Second souffle', { passive: { resRegen: 2 } }),
        ]),
        skill(10, {
          id: 'poussee-d-adrenaline', name: 'Poussée d\'adrénaline', cost: 10, kind: 'support', target: 'self', resourceGain: 60, oncePerCombat: true,
          selfEffects: [fx('hate', 2)],
          desc: 'Une fois par combat : rend 60 Énergie et donne Hâte (+25 % Vitesse, 2 tours)',
        }),
        ...choice(11, [
          minor('coup-de-grace', 'Coup de grâce', { passive: { executePct: 6.5 } }),
          minor('oeil-du-tueur', 'Œil du tueur', { flat: { critChance: 1.5 } }),
          minor('frappe-nette', 'Frappe nette', { pct: { physPower: 5 } }),
        ]),
        passive('lames-dansantes', 'Lames dansantes', 12, '+5 % de chance de critique et +15 % de dégâts critiques.', { flat: { critChance: 5, critDmg: 15 } }),
        ...choice(13, [
          minor('instinct-du-tueur', 'Instinct du tueur', { passive: { executePct: 6.5 } }),
          minor('coup-precis', 'Coup précis', { flat: { critChance: 2 } }),
          minor('lames-d-ombre', 'Lames d\'ombre', { flat: { critDmg: 6.5 } }),
        ]),
        signature({
          id: 'marque-de-la-mort', name: 'Marque de la mort', cost: 40, kind: 'damage', target: 'enemy', power: 0.65, finisher: true, alwaysCrit: true,
          desc: 'Finisher : coup critique garanti dévastateur, plus fort à chaque point de combo',
        }),
      ],
    },
    {
      key: 'empoisonneur', name: 'Empoisonneur', icon: '🧪',
      desc: 'Moins d\'actions mais des poisons puissants : dégâts physiques sur la durée et affaiblissements. Dagues, armure moyenne.',
      nodes: [
        starter('depart-empoisonneur', 'Lames sales', 'voleur', ['coup-vicieux', 'laceration']),
        ...choice(1, [
          minor('toxines', 'Toxines', { passive: { dotPct: 3 } }),
          minor('opportuniste', 'Opportuniste', { passive: { vsDebuffedPct: 2.5 } }),
          minor('concentration', 'Concentration', { pct: { physPower: 2.5 } }),
        ]),
        skill(2, {
          id: 'lame-empoisonnee', name: 'Lame empoisonnée', cost: 45, kind: 'damage', target: 'enemy', power: 0.5, comboGain: 2,
          effects: [fx('poison', 6, 0.28)],
          desc: 'Une dose de poison sur 6 tours (cumulable) et 2 points de combo',
        }),
        ...choice(3, [
          minor('anatomie', 'Anatomie', { flat: { critChance: 1 } }),
          minor('toxicite', 'Toxicité', { passive: { dotPct: 3.5 } }),
          minor('sang-froid', 'Sang-froid', { pct: { pv: 2.5 } }),
        ]),
        passive('venin-virulent', 'Venin virulent', 4, 'Lame empoisonnée : poison +40 % et rend la cible Affaiblie (−20 % puissance physique et magique, 4 tours).', { skillMod: { skill: 'lame-empoisonnee', dotPowerPct: 40, addEffects: [fx('affaibli', 4)] } }),
        ...choice(5, [
          minor('distillation', 'Distillation', { passive: { dotPct: 5 } }),
          minor('patience', 'Patience', { passive: { resRegen: 3 } }),
          minor('opportunisme', 'Opportunisme', { passive: { vsDebuffedPct: 3 } }),
        ]),
        skill(6, {
          id: 'poison-paralysant', name: 'Poison paralysant', cost: 35, kind: 'damage', target: 'enemy', power: 0.4, comboGain: 1,
          effects: [fx('poison', 5, 0.099), fx('ralenti', 3)],
          desc: 'Entaille enduite de venin : une dose de poison sur 5 tours, cible Ralentie 3 tours, 1 point de combo',
        }),
        ...choice(7, [
          minor('venin-epais', 'Venin épais', { passive: { dotPct: 5 } }),
          minor('cruaute', 'Cruauté', { passive: { vsDebuffedPct: 3.5 } }),
          minor('poumons-solides', 'Poumons solides', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'gaz-nauseabond', name: 'Gaz nauséabond', cost: 40, kind: 'support', target: 'allEnemies', comboGain: 1,
          effects: [fx('poison', 5, 0.083), fx('affaibli', 3)],
          desc: 'Une dose de poison sur 5 tours à tous les ennemis, affaiblis 3 tours ; 1 point de combo',
        }),
        ...choice(9, [
          minor('pestilence', 'Pestilence', { passive: { dotPct: 4 } }),
          minor('resistance', 'Résistance', { pct: { pv: 4 } }),
          minor('doigts-agiles', 'Doigts agiles', { passive: { resRegen: 2 } }),
        ]),
        skill(10, {
          id: 'fiole-de-peste', name: 'Fiole de peste', cost: 50, kind: 'damage', target: 'allEnemies', power: 0.1, finisher: true, fullAt: 3,
          effects: [fx('poison', 6, 0.05)],
          desc: 'Finisher : une dose de poison sur 6 tours à tous les ennemis, à pleine puissance dès 3 points de combo',
        }),
        ...choice(11, [
          minor('alchimie-noire', 'Alchimie noire', { passive: { dotPct: 6.5 } }),
          minor('main-sure', 'Main sûre', { flat: { critChance: 1.5 } }),
          minor('recuperation', 'Récupération', { passive: { resRegen: 3 } }),
        ]),
        skill(12, {
          id: 'poison-foudroyant', name: 'Poison foudroyant', cost: 55, kind: 'damage', target: 'enemy', power: 0.4, detonate: 'poison',
          desc: 'Fait agir d\'un coup tout le poison de la cible : elle subit sur-le-champ les dégâts de toutes ses doses pour les tours restants, et le poison disparaît',
        }),
        ...choice(13, [
          minor('venin-concentre', 'Venin concentré', { passive: { dotPct: 4.5 } }),
          minor('dose-mortelle', 'Dose mortelle', { passive: { finisherRefund: 2 } }),
          minor('venin-opportun', 'Venin opportun', { passive: { vsDebuffedPct: 4.5 } }),
        ]),
        signature({
          id: 'mort-lente', name: 'Mort lente', cost: 50, kind: 'damage', target: 'enemy', power: 0.2, finisher: true, fullAt: 3,
          effects: [fx('poison', 6, 0.07), fx('terreur', 3)],
          desc: 'Finisher : forte dose de poison sur 6 tours et Terreur (−30 % Défenses, 3 tours), à pleine puissance dès 3 points de combo',
        }),
      ],
    },
  ],
  pretre: [
    {
      key: 'clerc', name: 'Clerc', icon: '✨',
      desc: 'Soins puissants : soins de groupe, purification et résurrection. Bâton, armure légère.',
      nodes: [
        starter('depart-clerc', 'Soin majeur', 'pretre', ['soin-majeur']),
        ...choice(1, [
          minor('devotion', 'Dévotion', { passive: { healPct: 2.5 } }),
          minor('sagesse', 'Sagesse', { passive: { resMaxBonus: 4 } }),
          minor('piete', 'Piété', { pct: { pv: 2.5 } }),
        ]),
        skill(2, {
          id: 'priere-de-soins', name: 'Prière de soins', cost: 40, kind: 'heal', target: 'allAllies', power: 0.55,
          desc: 'Soigne toute l\'équipe',
        }),
        ...choice(3, [
          minor('meditation', 'Méditation', { passive: { resRegen: 1 } }),
          minor('lumiere-bienveillante', 'Lumière bienveillante', { pct: { magPower: 2.5 } }),
          minor('ferveur', 'Ferveur', { passive: { healPct: 2.5 } }),
        ]),
        passive('grace', 'Grâce', 4, 'Soin Majeur coûte 10 Mana de moins et soigne 20 % de plus.', { skillMod: { skill: 'soin-majeur', costDelta: -10, powerPct: 20 } }),
        ...choice(5, [
          minor('clarte', 'Clarté', { passive: { resRegen: 2 } }),
          minor('esprit-serein', 'Esprit serein', { passive: { resMaxBonus: 5 } }),
          minor('benediction-divine', 'Bénédiction divine', { passive: { healPct: 3 } }),
        ]),
        skill(6, {
          id: 'benediction', name: 'Bénédiction', cost: 30, kind: 'support', target: 'ally', magic: true,
          effects: [fx('puissance', 3), fx('regeneration', 3, 0.2)],
          desc: 'Bénit un allié : Puissance (+25 % de puissance) et Régénération pendant 3 tours',
        }),
        ...choice(7, [
          minor('priere-fervente', 'Prière fervente', { passive: { healPct: 3.5 } }),
          minor('calme-interieur', 'Calme intérieur', { passive: { resRegen: 1 } }),
          minor('chair-benie', 'Chair bénie', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'resurrection', name: 'Résurrection', cost: 60, kind: 'revive', target: 'deadAlly', power: 0.4,
          desc: 'Ramène un allié tombé avec 40 % de ses PV',
        }),
        ...choice(9, [
          minor('aura-sainte', 'Aura sainte', { pct: { defMag: 4 } }),
          minor('misericorde', 'Miséricorde', { passive: { healPct: 4 } }),
          minor('illumination', 'Illumination', { pct: { magPower: 4 } }),
        ]),
        skill(10, {
          id: 'purification', name: 'Purification', cost: 25, kind: 'heal', target: 'ally', power: 0.5, cleanse: true,
          desc: 'Retire tous les effets négatifs d\'un allié et le soigne',
        }),
        ...choice(11, [
          minor('lumiere-guerisseuse', 'Lumière guérisseuse', { passive: { healPct: 5 } }),
          minor('foi-profonde', 'Foi profonde', { passive: { resMaxBonus: 8 } }),
          minor('voile-sacre', 'Voile sacré', { pct: { defMag: 5 } }),
        ]),
        passive('ame-charitable', 'Âme charitable', 12, '+15 % de soins et +3 Mana regagnés par tour.', { passive: { healPct: 15, resRegen: 3 } }),
        ...choice(13, [
          minor('saintete', 'Sainteté', { passive: { healPct: 4.5 } }),
          minor('recueillement', 'Recueillement', { passive: { resRegen: 2 } }),
          minor('robustesse-sacree', 'Robustesse sacrée', { pct: { pv: 4.5 } }),
        ]),
        signature({
          id: 'miracle', name: 'Miracle', cost: 80, kind: 'heal', target: 'allAllies', power: 1.2, cleanse: true,
          effects: [fx('bouclier', 2, 0.5)],
          desc: 'Soin massif de toute l\'équipe, retire tous ses effets négatifs et la protège d\'un Bouclier',
        }),
      ],
    },
    {
      key: 'precheur', name: 'Prêcheur', icon: '📖',
      desc: 'Hybride : soins sur la durée, boucliers, bénédictions et lumière. Bâton, armure légère.',
      nodes: [
        starter('depart-precheur', 'Soin et lumière', 'pretre', ['soin-majeur', 'eclat-de-lumiere']),
        ...choice(1, [
          minor('foi', 'Foi', { pct: { magPower: 2.5 } }),
          minor('constance', 'Constance', { passive: { resRegen: 1 } }),
          minor('harmonie', 'Harmonie', { passive: { healPct: 2.5 } }),
        ]),
        skill(2, {
          id: 'renovation', name: 'Rénovation', cost: 25, kind: 'support', target: 'ally',
          effects: [fx('regeneration', 4, 0.35)],
          desc: 'Soigne un allié à chaque fin de tour pendant 4 tours',
        }),
        ...choice(3, [
          minor('serenite', 'Sérénité', { passive: { healPct: 2.5 } }),
          minor('piete-du-precheur', 'Piété du prêcheur', { pct: { pv: 2.5 } }),
          minor('sermon', 'Sermon', { passive: { resRegen: 1 } }),
        ]),
        skill(4, {
          id: 'bouclier-sacre', name: 'Bouclier sacré', cost: 30, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1.2)],
          desc: 'Protège un allié par un Bouclier pendant 3 tours',
        }),
        ...choice(5, [
          minor('bouclier-de-foi', 'Bouclier de foi', { passive: { shieldPct: 5 } }),
          minor('lumiere-interieure', 'Lumière intérieure', { pct: { magPower: 3 } }),
          minor('grace-celeste', 'Grâce céleste', { passive: { healPct: 3 } }),
        ]),
        passive('bouclier-de-lumiere', 'Bouclier de lumière', 6, 'Bouclier sacré donne aussi Régénération pendant 3 tours.', { skillMod: { skill: 'bouclier-sacre', addEffects: [fx('regeneration', 3, 0.2)] } }),
        ...choice(7, [
          minor('verbe-ardent', 'Verbe ardent', { pct: { magPower: 3.5 } }),
          minor('aureole', 'Auréole', { passive: { shieldPct: 5 } }),
          minor('prieres-du-soir', 'Prières du soir', { passive: { healPct: 3.5 } }),
        ]),
        skill(8, {
          id: 'flamme-sacree', name: 'Flamme sacrée', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.5, magic: true,
          effects: [fx('brulure', 3, 0.25)],
          desc: 'Le feu sacré s\'abat sur tous les ennemis (dégâts, puis Brûlure sur 3 tours)',
        }),
        ...choice(9, [
          minor('egide', 'Égide', { passive: { shieldPct: 6 } }),
          minor('zele', 'Zèle', { pct: { magPower: 4 } }),
          minor('beatitude', 'Béatitude', { pct: { pv: 4 } }),
        ]),
        skill(10, {
          id: 'jugement', name: 'Jugement', cost: 35, kind: 'damage', target: 'enemy', power: 1, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe de lumière qui embrase la cible (Brûlure sur 3 tours)',
        }),
        ...choice(11, [
          minor('feu-divin', 'Feu divin', { passive: { dotPct: 6.5 } }),
          minor('esprit-clair', 'Esprit clair', { passive: { resRegen: 2 } }),
          minor('protection-divine', 'Protection divine', { passive: { shieldPct: 6.5 } }),
        ]),
        passive('parole-ardente', 'Parole ardente', 12, '+10 % de puissance magique et +10 % de soins.', { pct: { magPower: 10 }, passive: { healPct: 10 } }),
        ...choice(13, [
          minor('zele-ardent', 'Zèle ardent', { pct: { magPower: 4.5 } }),
          minor('ferveur-du-precheur', 'Ferveur du prêcheur', { passive: { healPct: 4.5 } }),
          minor('flammes-sacrees', 'Flammes sacrées', { passive: { dotPct: 6.5 } }),
        ]),
        signature({
          id: 'hymne-divin', name: 'Hymne divin', cost: 75, kind: 'support', target: 'allAllies', magic: true,
          effects: [fx('regeneration', 4, 0.3), fx('bouclier', 3, 0.8), fx('puissance', 3)],
          desc: 'Régénération, Bouclier et Puissance sur toute l\'équipe',
        }),
      ],
    },
    {
      key: 'profane', name: 'Profane', icon: '🌑',
      desc: 'Ténèbres : dégâts magiques sur la durée, confusion et terreur. Bâton, armure légère.',
      nodes: [
        starter('depart-profane', 'Trait d\'ombre', 'pretre', ['trait-d-ombre']),
        ...choice(1, [
          minor('esprit-sombre', 'Esprit sombre', { pct: { magPower: 2.5 } }),
          minor('noirceur', 'Noirceur', { passive: { resRegen: 1 } }),
          minor('voile-d-ombre', 'Voile d\'ombre', { pct: { defMag: 2.5 } }),
        ]),
        skill(2, {
          id: 'mot-de-douleur', name: 'Mot de douleur', cost: 20, kind: 'damage', target: 'enemy', power: 0.5, magic: true,
          effects: [fx('tenebres', 4, 0.5)],
          desc: 'Dégâts de ténèbres sur 4 tours',
        }),
        ...choice(3, [
          minor('ombre', 'Ombre', { passive: { dotPct: 3.5 } }),
          minor('corruption', 'Corruption', { pct: { magPower: 2.5 } }),
          minor('pacte', 'Pacte', { passive: { resMaxBonus: 4 } }),
        ]),
        passive('douleur-prolongee', 'Douleur prolongée', 4, 'Mot de douleur dure 2 tours de plus.', { skillMod: { skill: 'mot-de-douleur', dotTurnsDelta: 2 } }),
        ...choice(5, [
          minor('malveillance', 'Malveillance', { passive: { dotPct: 5 } }),
          minor('supplice', 'Supplice', { passive: { vsDebuffedPct: 3 } }),
          minor('noirceur-profonde', 'Noirceur profonde', { passive: { resRegen: 2 } }),
        ]),
        skill(6, {
          id: 'siphon-d-ame', name: 'Siphon d\'âme', cost: 30, kind: 'damage', target: 'enemy', power: 1.2, magic: true,
          selfEffects: [fx('regeneration', 3, 0.25)],
          desc: 'Aspire l\'âme de la cible : dégâts d\'ombre, et le lanceur se régénère pendant 3 tours',
        }),
        ...choice(7, [
          minor('murmures', 'Murmures', { passive: { vsDebuffedPct: 3.5 } }),
          minor('ombre-rampante', 'Ombre rampante', { passive: { dotPct: 5 } }),
          minor('pacte-sombre', 'Pacte sombre', { pct: { magPower: 3.5 } }),
        ]),
        skill(8, {
          id: 'confusion', name: 'Confusion', cost: 30, kind: 'support', target: 'enemy',
          effects: [fx('confus', 2)],
          desc: 'La cible a une chance sur deux de frapper ses alliés pendant 2 tours',
        }),
        ...choice(9, [
          minor('tourment', 'Tourment', { passive: { dotPct: 4 } }),
          minor('desespoir', 'Désespoir', { passive: { vsDebuffedPct: 4 } }),
          minor('neant', 'Néant', { pct: { magPower: 4 } }),
        ]),
        skill(10, {
          id: 'fleau', name: 'Fléau', cost: 45, kind: 'support', target: 'allEnemies', magic: true,
          effects: [fx('tenebres', 3, 0.5)],
          desc: 'Dégâts de ténèbres sur 3 tours à tous les ennemis',
        }),
        ...choice(11, [
          minor('agonie', 'Agonie', { passive: { dotPct: 6.5 } }),
          minor('coeur-noir', 'Cœur noir', { pct: { pv: 5 } }),
          minor('vide', 'Vide', { passive: { resMaxBonus: 8 } }),
        ]),
        passive('voile-de-l-abime', 'Voile de l\'abîme', 12, '+15 % de dégâts sur la durée et +10 % de Défense magique.', { passive: { dotPct: 15 }, pct: { defMag: 10 } }),
        ...choice(13, [
          minor('ombre-devorante', 'Ombre dévorante', { passive: { dotPct: 4.5 } }),
          minor('abime', 'Abîme', { pct: { magPower: 4.5 } }),
          minor('voile-noir', 'Voile noir', { pct: { defMag: 4.5 } }),
        ]),
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
      key: 'feu', name: 'Feu', icon: '🔥',
      desc: 'Dégâts sur la durée : brûlures sur une cible ou sur tous les ennemis.',
      nodes: [
        starter('depart-feu', 'Boule de feu', 'mage', ['boule-de-feu']),
        ...choice(1, [
          minor('chaleur', 'Chaleur', { pct: { magPower: 2.5 } }),
          minor('reserve-de-mana', 'Réserve de mana', { passive: { resMaxBonus: 4 } }),
          minor('concentration-ardente', 'Concentration ardente', { passive: { resRegen: 1 } }),
        ]),
        skill(2, {
          id: 'immolation', name: 'Immolation', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, magic: true,
          effects: [fx('brulure', 3, 0.4)],
          desc: 'Enflamme la cible (Brûlure sur 3 tours)',
        }),
        ...choice(3, [
          minor('combustion', 'Combustion', { passive: { dotPct: 3.5 } }),
          minor('pyromanie', 'Pyromanie', { pct: { magPower: 2.5 } }),
          minor('etincelles', 'Étincelles', { flat: { critChance: 1 } }),
        ]),
        passive('boule-ardente', 'Boule ardente', 4, 'Boule de feu enflamme aussi la cible (Brûlure sur 3 tours).', { skillMod: { skill: 'boule-de-feu', addEffects: [fx('brulure', 3, 0.2)] } }),
        ...choice(5, [
          minor('braises', 'Braises', { passive: { dotPct: 5 } }),
          minor('flammes-vives', 'Flammes vives', { flat: { critDmg: 5 } }),
          minor('foyer', 'Foyer', { passive: { resMaxBonus: 5 } }),
        ]),
        skill(6, {
          id: 'mur-de-flammes', name: 'Mur de flammes', cost: 40, kind: 'damage', target: 'allEnemies', power: 0.4, magic: true,
          effects: [fx('brulure', 3, 0.35)],
          desc: 'Embrase tous les ennemis (Brûlure sur 3 tours)',
        }),
        ...choice(7, [
          minor('flammeche', 'Flammèche', { flat: { critChance: 1 } }),
          minor('feu-interieur', 'Feu intérieur', { pct: { magPower: 3.5 } }),
          minor('brulure-vive', 'Brûlure vive', { passive: { dotPct: 5 } }),
        ]),
        skill(8, {
          id: 'pyroclasme', name: 'Pyroclasme', cost: 50, kind: 'damage', target: 'enemy', power: 2.3, magic: true, critBonus: 15,
          desc: 'Une boule de feu géante s\'écrase sur un ennemi (+15 % de chance de critique)',
        }),
        ...choice(9, [
          minor('brasier', 'Brasier', { passive: { aoePct: 6 } }),
          minor('incendie', 'Incendie', { passive: { dotPct: 4 } }),
          minor('fournaise', 'Fournaise', { pct: { magPower: 4 } }),
        ]),
        skill(10, {
          id: 'pluie-de-feu', name: 'Pluie de feu', cost: 55, kind: 'damage', target: 'allEnemies', power: 0.8, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe et enflamme tous les ennemis',
        }),
        ...choice(11, [
          minor('conflagration', 'Conflagration', { passive: { aoePct: 6.5 } }),
          minor('cendre-ardente', 'Cendre ardente', { flat: { critDmg: 6.5 } }),
          minor('source-de-mana', 'Source de mana', { passive: { resRegen: 2 } }),
        ]),
        passive('coeur-de-brasier', 'Cœur de brasier', 12, '+10 % de dégâts critiques et +10 % de dégâts sur la durée.', { flat: { critDmg: 10 }, passive: { dotPct: 10 } }),
        ...choice(13, [
          minor('cendres', 'Cendres', { passive: { dotPct: 4.5 } }),
          minor('ignition', 'Ignition', { passive: { aoePct: 4.5 } }),
          minor('chaleur-intense', 'Chaleur intense', { pct: { magPower: 4.5 } }),
        ]),
        signature({
          id: 'meteore', name: 'Météore', cost: 85, kind: 'damage', target: 'allEnemies', power: 1.25, magic: true,
          effects: [fx('brulure', 4, 0.6)],
          desc: 'Un météore écrase tous les ennemis et les laisse en flammes (Brûlure sur 4 tours)',
        }),
      ],
    },
    {
      key: 'glace', name: 'Glace', icon: '❄️',
      desc: 'Bons dégâts directs et ralentissements ; plus de dégâts contre les cibles affaiblies.',
      nodes: [
        starter('depart-glace', 'Trait de givre', 'mage', ['trait-de-givre']),
        ...choice(1, [
          minor('froid', 'Froid', { pct: { magPower: 2.5 } }),
          minor('armure-de-givre', 'Armure de givre', { pct: { def: 2.5, defMag: 2.5 } }),
          minor('esprit-glace', 'Esprit glacé', { passive: { resRegen: 1 } }),
        ]),
        skill(2, {
          id: 'eclat-de-glace', name: 'Éclat de glace', cost: 20, kind: 'damage', target: 'enemy', power: 1.5, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace, ralentit la cible 2 tours',
        }),
        ...choice(3, [
          minor('morsure-du-froid', 'Morsure du froid', { passive: { vsDebuffedPct: 2.5 } }),
          minor('hiver', 'Hiver', { pct: { magPower: 2.5 } }),
          minor('cristaux', 'Cristaux', { flat: { critChance: 1 } }),
        ]),
        skill(4, {
          id: 'nova-de-givre', name: 'Nova de givre', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.6, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace et ralentissement sur tous les ennemis',
        }),
        ...choice(5, [
          minor('glace-eternelle', 'Glace éternelle', { passive: { vsDebuffedPct: 3 } }),
          minor('barriere-de-glace', 'Barrière de glace', { pct: { pv: 3 } }),
          minor('precision-glaciale', 'Précision glaciale', { flat: { critDmg: 5 } }),
        ]),
        passive('eclatement', 'Éclatement', 6, '+15 % de dégâts contre une cible affaiblie.', { passive: { vsDebuffedPct: 15 } }),
        ...choice(7, [
          minor('givre-percant', 'Givre perçant', { flat: { critChance: 1 } }),
          minor('peau-de-givre', 'Peau de givre', { pct: { def: 2.5, defMag: 2.5 } }),
          minor('froid-mordant', 'Froid mordant', { passive: { vsDebuffedPct: 3.5 } }),
        ]),
        skill(8, {
          id: 'armure-de-glace', name: 'Armure de glace', cost: 30, kind: 'support', target: 'self', magic: true,
          selfEffects: [fx('bouclier', 3, 1.2), fx('protection', 2)],
          desc: 'Se couvre de glace : Bouclier pendant 3 tours et Protection pendant 2 tours',
        }),
        ...choice(9, [
          minor('zero-absolu', 'Zéro absolu', { pct: { magPower: 4 } }),
          minor('hivernage', 'Hivernage', { pct: { pv: 4 } }),
          minor('givre-mordant', 'Givre mordant', { flat: { critChance: 2 } }),
        ]),
        skill(10, {
          id: 'lance-de-glace', name: 'Lance de glace', cost: 35, kind: 'damage', target: 'enemy', power: 2.8, magic: true,
          desc: 'Puissante lance de glace sur un ennemi',
        }),
        ...choice(11, [
          minor('stalactites', 'Stalactites', { flat: { critDmg: 6.5 } }),
          minor('calme-glacial', 'Calme glacial', { passive: { resRegen: 2 } }),
          minor('coeur-de-glace', 'Cœur de glace', { pct: { magPower: 5 } }),
        ]),
        passive('hiver-eternel', 'Hiver éternel', 12, '+12 % de dégâts contre une cible qui subit un effet négatif et +6 % de puissance magique.', { passive: { vsDebuffedPct: 12 }, pct: { magPower: 6 } }),
        ...choice(13, [
          minor('blizzard-interieur', 'Blizzard intérieur', { pct: { magPower: 4.5 } }),
          minor('gel-acere', 'Gel acéré', { flat: { critDmg: 6.5 } }),
          minor('froid-eternel', 'Froid éternel', { passive: { vsDebuffedPct: 4.5 } }),
        ]),
        signature({
          id: 'blizzard', name: 'Blizzard', cost: 80, kind: 'damage', target: 'allEnemies', power: 1.5, magic: true,
          effects: [fx('ralenti', 3), fx('affaibli', 2)],
          desc: 'Tempête de glace sur tous les ennemis : lourds dégâts, Ralenti 3 tours et Affaibli 2 tours',
        }),
      ],
    },
    {
      key: 'foudre', name: 'Foudre', icon: '⚡',
      desc: 'Dégâts directs très élevés, critiques, et un sort qui étourdit.',
      nodes: [
        starter('depart-foudre', 'Éclair', 'mage', ['eclair']),
        ...choice(1, [
          minor('conductivite', 'Conductivité', { flat: { critChance: 1 } }),
          minor('surtension', 'Surtension', { flat: { critDmg: 4 } }),
          minor('charge', 'Charge', { pct: { magPower: 2.5 } }),
        ]),
        skill(2, {
          id: 'chaine-d-eclairs', name: 'Chaîne d\'éclairs', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.8, magic: true,
          desc: 'Foudroie tous les ennemis',
        }),
        ...choice(3, [
          minor('electrisation', 'Électrisation', { flat: { critDmg: 5 } }),
          minor('flux', 'Flux', { passive: { resMaxBonus: 4 } }),
          minor('etincelle', 'Étincelle', { flat: { critChance: 1 } }),
        ]),
        passive('eclair-renforce', 'Éclair renforcé', 4, 'Éclair coûte 5 Mana de moins et frappe 10 % plus fort.', { skillMod: { skill: 'eclair', costDelta: -5, powerPct: 10 } }),
        ...choice(5, [
          minor('haute-tension', 'Haute tension', { pct: { magPower: 3 } }),
          minor('recharge', 'Recharge', { passive: { resRegen: 2 } }),
          minor('coup-de-tonnerre', 'Coup de tonnerre', { passive: { executePct: 5 } }),
        ]),
        skill(6, {
          id: 'onde-de-choc', name: 'Onde de choc', cost: 40, kind: 'damage', target: 'enemy', power: 1, magic: true,
          effects: [fx('etourdi', 1)],
          desc: 'Décharge paralysante : la cible perd son prochain tour',
        }),
        ...choice(7, [
          minor('ionisation', 'Ionisation', { flat: { critDmg: 5 } }),
          minor('champ-statique', 'Champ statique', { passive: { aoePct: 5 } }),
          minor('dynamo', 'Dynamo', { passive: { resRegen: 1 } }),
        ]),
        skill(8, {
          id: 'canalisation', name: 'Canalisation', cost: 10, kind: 'support', target: 'self', resourceGain: 30, oncePerCombat: true,
          selfEffects: [fx('hate', 2)],
          desc: 'Une fois par combat : canalise l\'orage, regagne 30 Mana et gagne Hâte pendant 2 tours',
        }),
        ...choice(9, [
          minor('foudroiement', 'Foudroiement', { flat: { critDmg: 6 } }),
          minor('arc-electrique', 'Arc électrique', { pct: { magPower: 4 } }),
          minor('orage', 'Orage', { flat: { critChance: 2 } }),
        ]),
        skill(10, {
          id: 'tempete', name: 'Tempête', cost: 60, kind: 'damage', target: 'enemy', power: 2.3, magic: true,
          desc: 'Énorme décharge de foudre sur un ennemi',
        }),
        ...choice(11, [
          minor('eclair-noir', 'Éclair noir', { pct: { magPower: 5 } }),
          minor('coup-de-foudre', 'Coup de foudre', { flat: { critChance: 1.5 } }),
          minor('paratonnerre', 'Paratonnerre', { pct: { defMag: 5 } }),
        ]),
        passive('conducteur', 'Conducteur', 12, '+4 % de chance de critique et +10 % de dégâts contre une cible sous 30 % de PV.', { flat: { critChance: 4 }, passive: { executePct: 10 } }),
        ...choice(13, [
          minor('supraconduction', 'Supraconduction', { flat: { critChance: 2 } }),
          minor('decharge', 'Décharge', { flat: { critDmg: 6.5 } }),
          minor('surcharge', 'Surcharge', { passive: { aoePct: 6.5 } }),
        ]),
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
      desc: 'Dégâts explosifs : tirs très coûteux en Énergie mais dévastateurs. Arc, armure moyenne.',
      nodes: [
        starter('depart-oeil', 'Tir visé', 'chasseur', ['tir-vise']),
        ...choice(1, [
          minor('oeil-percant', 'Œil perçant', { flat: { critChance: 1 } }),
          minor('tension-de-la-corde', 'Tension de la corde', { pct: { physPower: 2.5 } }),
          minor('reserve-d-energie', 'Réserve d\'énergie', { passive: { resMaxBonus: 4 } }),
        ]),
        skill(2, {
          id: 'tir-percant', name: 'Tir perçant', cost: 55, kind: 'damage', target: 'enemy', power: 2.1, critBonus: 10,
          desc: 'Flèche lourde qui transperce la cible (+10 % de chance de critique)',
        }),
        ...choice(3, [
          minor('visee', 'Visée', { flat: { critDmg: 5 } }),
          minor('souffle-retenu', 'Souffle retenu', { passive: { resRegen: 2 } }),
          minor('precision-mortelle', 'Précision mortelle', { flat: { critChance: 1 } }),
        ]),
        passive('calme-du-tireur', 'Calme du tireur', 4, '+20 Énergie max et +5 Énergie regagnée par tour.', { passive: { resMaxBonus: 20, resRegen: 5 } }),
        ...choice(5, [
          minor('puissance-du-tir', 'Puissance du tir', { pct: { physPower: 3 } }),
          minor('chasseur-de-tetes', 'Chasseur de têtes', { passive: { executePct: 5 } }),
          minor('endurance-du-chasseur', 'Endurance du chasseur', { pct: { pv: 3 } }),
        ]),
        skill(6, {
          id: 'salve', name: 'Salve', cost: 60, kind: 'damage', target: 'allEnemies', power: 0.95,
          desc: 'Pluie de flèches sur tous les ennemis',
        }),
        ...choice(7, [
          minor('vent-favorable', 'Vent favorable', { flat: { critChance: 1 } }),
          minor('fleches-lourdes', 'Flèches lourdes', { pct: { physPower: 3.5 } }),
          minor('respiration', 'Respiration', { passive: { resRegen: 2 } }),
        ]),
        skill(8, {
          id: 'tir-en-pleine-tete', name: 'Tir en pleine tête', cost: 50, kind: 'damage', target: 'enemy', power: 2, executePct: 100,
          desc: 'Vise la tête : dégâts doublés contre une cible sous 30 % de PV',
        }),
        ...choice(9, [
          minor('balistique', 'Balistique', { flat: { critDmg: 6 } }),
          minor('oeil-du-faucon', 'Œil du faucon', { flat: { critChance: 2 } }),
          minor('visee-parfaite', 'Visée parfaite', { pct: { physPower: 4 } }),
        ]),
        skill(10, {
          id: 'tir-de-l-aigle', name: 'Tir de l\'aigle', cost: 80, kind: 'damage', target: 'enemy', power: 3.2, critBonus: 20,
          desc: 'Tir dévastateur sur un ennemi (+20 % de chance de critique)',
        }),
        ...choice(11, [
          minor('tir-parfait', 'Tir parfait', { flat: { critDmg: 6.5 } }),
          minor('achevement', 'Achèvement', { passive: { executePct: 6.5 } }),
          minor('affut', 'Affût', { flat: { esquive: 1.5 } }),
        ]),
        passive('patience-du-predateur', 'Patience du prédateur', 12, '+20 % de dégâts critiques et +5 % de puissance physique.', { flat: { critDmg: 20 }, pct: { physPower: 5 } }),
        ...choice(13, [
          minor('tir-mortel', 'Tir mortel', { passive: { executePct: 6.5 } }),
          minor('focalisation', 'Focalisation', { flat: { critDmg: 6.5 } }),
          minor('pluie-de-fleches', 'Pluie de flèches', { passive: { aoePct: 6.5 } }),
        ]),
        signature({
          id: 'tir-fatal', name: 'Tir fatal', cost: 90, kind: 'damage', target: 'enemy', power: 4.8, alwaysCrit: true, executePct: 50,
          desc: 'La flèche parfaite : critique garanti, +50 % de dégâts contre une cible sous 30 % de PV',
        }),
      ],
    },
    {
      key: 'traqueur', name: 'Traqueur', icon: '🐾',
      desc: 'Petits tirs peu coûteux, ralentissements et pièges : beaucoup d\'actions et beaucoup de contrôle. Arc, armure moyenne.',
      nodes: [
        starter('depart-traqueur', 'Tir rapide', 'chasseur', ['tir-rapide']),
        ...choice(1, [
          minor('pisteur', 'Pisteur', { flat: { vit: 1 } }),
          minor('reflexes-du-traqueur', 'Réflexes du traqueur', { flat: { esquive: 1 } }),
          minor('tir-agile', 'Tir agile', { pct: { physPower: 2.5 } }),
        ]),
        skill(2, {
          id: 'piege-a-machoires', name: 'Piège à mâchoires', cost: 25, kind: 'support', target: 'enemy',
          effects: [fx('piege', 3, 0.8)],
          desc: 'Pose un piège sur un ennemi : il se referme à son prochain tour (dégâts, et il perd ce tour)',
        }),
        ...choice(3, [
          minor('pieges-affutes', 'Pièges affûtés', { passive: { trapPct: 5 } }),
          minor('economie', 'Économie', { passive: { resRegen: 2 } }),
          minor('camouflage', 'Camouflage', { flat: { esquive: 1 } }),
        ]),
        passive('fleches-barbelees', 'Flèches barbelées', 4, 'Tir rapide fait saigner la cible (2 tours).', { skillMod: { skill: 'tir-rapide', addEffects: [fx('saignement', 2, 0.15)] } }),
        ...choice(5, [
          minor('harcelement', 'Harcèlement', { passive: { vsDebuffedPct: 3 } }),
          minor('vivacite-du-traqueur', 'Vivacité du traqueur', { passive: { resRegen: 2 } }),
          minor('instinct', 'Instinct', { flat: { critChance: 1.5 } }),
        ]),
        skill(6, {
          id: 'fleche-empoisonnee', name: 'Flèche empoisonnée', cost: 30, kind: 'damage', target: 'enemy', power: 0.8,
          effects: [fx('poison', 6, 0.27)],
          desc: 'Flèche trempée dans le venin : poison sur 4 tours',
        }),
        ...choice(7, [
          minor('acier-trempe', 'Acier trempé', { passive: { trapPct: 5 } }),
          minor('traque', 'Traque', { passive: { vsDebuffedPct: 3.5 } }),
          minor('pas-leger', 'Pas léger', { flat: { vit: 1 } }),
        ]),
        skill(8, {
          id: 'tir-incapacitant', name: 'Tir incapacitant', cost: 20, kind: 'damage', target: 'enemy', power: 0.5,
          effects: [fx('ralenti', 2)],
          desc: 'Petite flèche qui ralentit la cible (−30 % Vitesse, 2 tours)',
        }),
        ...choice(9, [
          minor('tir-continu', 'Tir continu', { pct: { physPower: 4 } }),
          minor('harcelement-continu', 'Harcèlement continu', { passive: { vsDebuffedPct: 4 } }),
          minor('machoires-d-acier', 'Mâchoires d\'acier', { passive: { trapPct: 6 } }),
        ]),
        skill(10, {
          id: 'champ-de-givre', name: 'Champ de givre', cost: 35, kind: 'support', target: 'allEnemies',
          effects: [fx('piegeDeGivre', 3, 0.5)],
          desc: 'Piège de givre sous tous les ennemis : dégâts à leur prochain tour, puis Ralentis 3 tours',
        }),
        ...choice(11, [
          minor('venin-de-serpent', 'Venin de serpent', { passive: { dotPct: 6.5 } }),
          minor('ruse', 'Ruse', { flat: { esquive: 1.5 } }),
          minor('piegeur-ne', 'Piégeur né', { passive: { trapPct: 6.5 } }),
        ]),
        passive('maitre-des-pieges', 'Maître des pièges', 12, '+25 % de dégâts des pièges, +10 % de dégâts contre une cible qui subit un effet négatif et +6 % de puissance physique.', { pct: { physPower: 6 }, passive: { trapPct: 25, vsDebuffedPct: 10 } }),
        ...choice(13, [
          minor('maitre-traqueur', 'Maître traqueur', { passive: { trapPct: 6.5 } }),
          minor('endurance-du-traqueur', 'Endurance du traqueur', { pct: { pv: 4.5 } }),
          minor('tireur-vif', 'Tireur vif', { flat: { vit: 2 } }),
        ]),
        signature({
          id: 'terrain-piege', name: 'Terrain piégé', cost: 60, kind: 'damage', target: 'allEnemies', power: 0.6,
          effects: [fx('piege', 3, 1), fx('ralenti', 3)],
          desc: 'Flèches et pièges partout : dégâts sur tous les ennemis, Ralentis, et un Piège à mâchoires sous chacun',
        }),
      ],
    },
  ],
  paladin: [
    {
      key: 'templier', name: 'Templier', icon: '🛡️',
      desc: 'Tank au Mana : se soigne lui-même et encaisse les dégâts de ses alliés. Monte la Force : armure lourde, armes et bouclier de Force.',
      nodes: [
        starter('depart-templier', 'Frappe du croisé', 'paladin', ['frappe-du-croise']),
        ...choice(1, [
          minor('armure-sacree', 'Armure sacrée', { pct: { def: 2.5 } }),
          minor('vigueur', 'Vigueur', { pct: { pv: 2.5 } }),
          minor('ferveur-du-croise', 'Ferveur du croisé', { pct: { physPower: 2.5 } }),
        ]),
        skill(2, {
          id: 'intercession', name: 'Intercession', cost: 20, kind: 'support', target: 'ally',
          effects: [fx('intercession', 3)],
          desc: 'Encaisse la moitié des dégâts subis par un allié pendant 3 tours',
        }),
        ...choice(3, [
          minor('foi-inebranlable', 'Foi inébranlable', { pct: { defMag: 3.5 } }),
          minor('bouclier-beni', 'Bouclier béni', { flat: { blocage: 2.5 } }),
          minor('robustesse-du-croise', 'Robustesse du croisé', { pct: { pv: 2.5 } }),
        ]),
        skill(4, {
          id: 'sceau-de-vie', name: 'Sceau de vie', cost: 30, kind: 'heal', target: 'self', power: 1, physHeal: true,
          effects: [fx('regeneration', 3, 0.25)],
          desc: 'Se soigne et se régénère pendant 3 tours (soins sur la Force)',
        }),
        ...choice(5, [
          minor('consecration', 'Consécration', { pct: { def: 3 } }),
          minor('foi-ardente', 'Foi ardente', { passive: { healPct: 3 } }),
          minor('endurance-sainte', 'Endurance sainte', { passive: { resRegen: 2 } }),
        ]),
        passive('vengeance-sacree', 'Vengeance sacrée', 6, 'Vol de vie : 10 % des dégâts directs infligés rendus en PV.', { passive: { lifestealPct: 10 } }),
        ...choice(7, [
          minor('bras-de-la-foi', 'Bras de la foi', { pct: { physPower: 3.5 } }),
          minor('cotte-benie', 'Cotte bénie', { pct: { def: 3.5 } }),
          minor('coeur-vaillant', 'Cœur vaillant', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'marteau-de-justice', name: 'Marteau de justice', cost: 35, kind: 'damage', target: 'enemy', power: 1.5,
          effects: [fx('etourdi', 1)],
          desc: 'Coup de marteau béni : la cible perd son prochain tour',
        }),
        ...choice(9, [
          minor('aura-de-devotion', 'Aura de dévotion', { pct: { pv: 4 } }),
          minor('justice', 'Justice', { pct: { physPower: 4 } }),
          minor('garde-benie', 'Garde bénie', { flat: { blocage: 2 } }),
        ]),
        skill(10, {
          id: 'aura-de-protection', name: 'Aura de protection', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 2), fx('bouclier', 2, 0.6)],
          desc: 'Bouclier sur toute l\'équipe ; encaisse aussi la moitié des dégâts de ses alliés pendant 2 tours',
        }),
        ...choice(11, [
          minor('chatiment', 'Châtiment', { flat: { riposte: 5 } }),
          minor('sang-sacre', 'Sang sacré', { passive: { lifestealPct: 1.5 } }),
          minor('egide-du-croise', 'Égide du croisé', { flat: { blocage: 3 } }),
        ]),
        passive('rempart-de-foi', 'Rempart de foi', 12, '+10 % de PV ; Défendre donne un Bouclier égal à 15 % des PV max.', { pct: { pv: 10 }, passive: { guardShieldPct: 15 } }),
        ...choice(13, [
          minor('colosse-sacre', 'Colosse sacré', { pct: { pv: 4.5 } }),
          minor('bouclier-des-justes', 'Bouclier des justes', { passive: { shieldPct: 6.5 } }),
          minor('garde-du-croise', 'Garde du croisé', { passive: { guardShieldPct: 2 } }),
        ]),
        signature({
          id: 'sacrifice-divin', name: 'Sacrifice divin', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 3)],
          selfEffects: [fx('bouclier', 3, 2), fx('protection', 3), fx('provocation', 3)],
          desc: 'Attire les ennemis et encaisse la moitié des dégâts de toute l\'équipe, protégé par un énorme Bouclier et Protection (3 tours)',
        }),
      ],
    },
    {
      key: 'lumiere', name: 'Lumière', icon: '☀️',
      desc: 'Soigneur : soins de groupe et guérison des effets négatifs. Monte l\'Intelligence : armure légère, armes d\'Intelligence.',
      nodes: [
        starter('depart-lumiere', 'Lumière sacrée', 'paladin', ['lumiere-sacree']),
        ...choice(1, [
          minor('eclat-sacre', 'Éclat sacré', { passive: { healPct: 2.5 } }),
          minor('sagesse-du-paladin', 'Sagesse du paladin', { passive: { resMaxBonus: 4 } }),
          minor('illumination-sainte', 'Illumination sainte', { pct: { magPower: 2.5 } }),
        ]),
        skill(2, {
          id: 'lumiere-de-l-aube', name: 'Lumière de l\'aube', cost: 35, kind: 'heal', target: 'allAllies', power: 0.45,
          desc: 'Soigne toute l\'équipe',
        }),
        ...choice(3, [
          minor('meditation-sacree', 'Méditation sacrée', { passive: { resRegen: 1 } }),
          minor('devouement', 'Dévouement', { passive: { healPct: 2.5 } }),
          minor('armure-de-foi', 'Armure de foi', { pct: { defMag: 3.5 } }),
        ]),
        passive('main-de-lumiere', 'Main de lumière', 4, 'Lumière sacrée coûte 8 Mana de moins et soigne 20 % de plus.', { skillMod: { skill: 'lumiere-sacree', costDelta: -8, powerPct: 20 } }),
        ...choice(5, [
          minor('grace-du-paladin', 'Grâce du paladin', { passive: { healPct: 3 } }),
          minor('rayonnement', 'Rayonnement', { pct: { magPower: 3 } }),
          minor('benediction-du-paladin', 'Bénédiction du paladin', { pct: { pv: 3 } }),
        ]),
        skill(6, {
          id: 'epuration', name: 'Épuration', cost: 20, kind: 'support', target: 'ally', cleanse: true,
          desc: 'Retire tous les effets négatifs d\'un allié',
        }),
        ...choice(7, [
          minor('lumiere-douce', 'Lumière douce', { passive: { healPct: 3.5 } }),
          minor('priere-du-paladin', 'Prière du paladin', { passive: { resRegen: 1 } }),
          minor('aura-sereine', 'Aura sereine', { pct: { defMag: 3.5 } }),
        ]),
        skill(8, {
          id: 'cercle-de-guerison', name: 'Cercle de guérison', cost: 40, kind: 'support', target: 'allAllies', magic: true,
          effects: [fx('regeneration', 3, 0.3)],
          desc: 'Un cercle de lumière régénère toute l\'équipe pendant 3 tours',
        }),
        ...choice(9, [
          minor('ferveur-lumineuse', 'Ferveur lumineuse', { passive: { healPct: 4 } }),
          minor('aube-eternelle', 'Aube éternelle', { passive: { resRegen: 2 } }),
          minor('clarte-sainte', 'Clarté sainte', { pct: { magPower: 4 } }),
        ]),
        skill(10, {
          id: 'sceau-de-protection', name: 'Sceau de protection', cost: 35, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1), fx('regeneration', 3, 0.25)],
          desc: 'Bouclier et Régénération sur un allié pendant 3 tours',
        }),
        ...choice(11, [
          minor('soleil-levant', 'Soleil levant', { pct: { magPower: 5 } }),
          minor('coeur-pur', 'Cœur pur', { passive: { healPct: 5 } }),
          minor('bouclier-de-l-aube', 'Bouclier de l\'aube', { passive: { shieldPct: 6.5 } }),
        ]),
        passive('foi-rayonnante', 'Foi rayonnante', 12, '+15 % de soins et +20 Mana maximum.', { passive: { healPct: 15, resMaxBonus: 20 } }),
        ...choice(13, [
          minor('aura-de-guerison', 'Aura de guérison', { passive: { healPct: 4.5 } }),
          minor('clarte-du-paladin', 'Clarté du paladin', { passive: { resRegen: 2 } }),
          minor('bouclier-de-lumiere-paladin', 'Égide de lumière', { passive: { shieldPct: 6.5 } }),
        ]),
        signature({
          id: 'lumiere-divine', name: 'Lumière divine', cost: 80, kind: 'heal', target: 'allAllies', power: 0.9, cleanse: true,
          effects: [fx('regeneration', 3, 0.3), fx('protection', 2)],
          desc: 'Grand soin de toute l\'équipe : retire ses effets négatifs, puis Régénération et Protection',
        }),
      ],
    },
  ],
  scarifie: [
    {
      key: 'acharne', name: 'Acharné', icon: '🩸',
      desc: 'Corps à corps : il paie de son sang des entailles qui font saigner, et des coups de boucher. Force, armure moyenne.',
      nodes: [
        starter('depart-acharne', 'Entaille rituelle', 'scarifie', ['entaille-rituelle']),
        ...choice(1, [
          minor('sc-lame-avide', 'Lame avide', { pct: { physPower: 2.5 } }),
          minor('sc-plaies-profondes', 'Plaies profondes', { passive: { dotPct: 3 } }),
          minor('sc-peau-tannee', 'Peau tannée', { pct: { pv: 2.5 } }),
        ]),
        skill(2, {
          id: 'lacerations', name: 'Lacérations', cost: 7, kind: 'damage', target: 'enemy', power: 0.9, hits: 2,
          effects: [fx('saignement', 2, 0.3)],
          desc: 'Deux entailles rapides : saignement sur 2 tours',
        }),
        ...choice(3, [
          minor('sc-oeil-rouge', 'Œil rouge', { flat: { critChance: 1 } }),
          minor('sc-gorgee', 'Gorgée', { passive: { lifestealPct: 1.5 } }),
          minor('sc-hemophilie', 'Hémophilie', { passive: { dotPct: 3.5 } }),
        ]),
        passive('sang-appelle-sang', 'Le sang appelle le sang', 4, '+12 % de dégâts directs contre une cible qui subit un effet négatif (un saignement…) ; vol de vie : 4 % des dégâts directs infligés rendus en PV.', { passive: { vsDebuffedPct: 12, lifestealPct: 4 } }),
        ...choice(5, [
          minor('sc-fureur-froide', 'Fureur froide', { pct: { physPower: 3 } }),
          minor('sc-contre-entaille', 'Contre-entaille', { flat: { riposte: 2 } }),
          minor('sc-cicatrices', 'Cicatrices', { pct: { pv: 3 } }),
        ]),
        skill(6, {
          id: 'hemorragie', name: 'Hémorragie', cost: 10, kind: 'damage', target: 'enemy', power: 1.5,
          effects: [fx('saignement', 3, 0.75)],
          desc: 'Ouvre une plaie béante : gros saignement sur 3 tours',
        }),
        ...choice(7, [
          minor('sc-sang-noir', 'Sang noir', { passive: { dotPct: 4 } }),
          minor('sc-coups-sales', 'Coups sales', { flat: { critDmg: 5 } }),
          minor('sc-festin', 'Festin', { passive: { lifestealPct: 2 } }),
        ]),
        skill(8, {
          id: 'moisson-rouge', name: 'Moisson rouge', cost: 12, kind: 'damage', target: 'allEnemies', power: 0.9,
          effects: [fx('saignement', 2, 0.25)],
          desc: 'Fauche tous les ennemis : saignement sur 2 tours pour chacun',
        }),
        ...choice(9, [
          minor('sc-acharnement', 'Acharnement', { pct: { physPower: 3.5 } }),
          minor('sc-curee', 'Curée', { passive: { executePct: 5 } }),
          minor('sc-chair-dure', 'Chair dure', { pct: { pv: 3.5 } }),
        ]),
        skill(10, {
          id: 'coup-du-boucher', name: 'Coup du boucher', cost: 9, kind: 'damage', target: 'enemy', power: 2.0, executePct: 60,
          desc: 'Coup lourd, +60 % de dégâts contre une cible sous 30 % de PV',
        }),
        ...choice(11, [
          minor('sc-veines-ouvertes', 'Veines ouvertes', { passive: { dotPct: 5 } }),
          minor('sc-precision-cruelle', 'Précision cruelle', { flat: { critChance: 1.5 } }),
          minor('sc-soif-inextinguible', 'Soif inextinguible', { passive: { lifestealPct: 2.5 } }),
        ]),
        passive('increvable', 'Increvable', 12, 'Une fois par combat, se relève aussitôt avec 30 % de ses PV quand il tombe.', { passive: { selfRevive: 30 } }),
        ...choice(13, [
          minor('sc-rage-froide', 'Rage froide', { pct: { physPower: 4.5 } }),
          minor('sc-sang-maudit', 'Sang maudit', { passive: { dotPct: 5.5 } }),
          minor('sc-cuir-de-fer', 'Cuir de fer', { pct: { pv: 4.5 } }),
        ]),
        signature({
          id: 'saignee-totale', name: 'Saignée totale', cost: 18, kind: 'damage', target: 'enemy', power: 1.8,
          effects: [fx('saignement', 3, 0.7)],
          desc: 'Coup terrible : la cible se vide de son sang (énorme saignement sur 3 tours)',
        }),
      ],
    },
    {
      key: 'violent', name: 'Violent', icon: '💥',
      desc: 'Distance : il vide ses veines dans des tirs dévastateurs, plus coûteux en PV que ceux de l\'Acharné. Force, arc.',
      nodes: [
        starter('depart-violent', 'Décharge sanglante', 'scarifie', ['decharge-sanglante']),
        ...choice(1, [
          minor('sc-bras-tendu', 'Bras tendu', { pct: { physPower: 2.5 } }),
          minor('sc-pointe-cruelle', 'Pointe cruelle', { flat: { critDmg: 4 } }),
          minor('sc-sang-epais', 'Sang épais', { pct: { pv: 2.5 } }),
        ]),
        skill(2, {
          id: 'fleche-de-sang', name: 'Flèche de sang', cost: 13, kind: 'damage', target: 'enemy', power: 2.1, critBonus: 15,
          desc: 'Trait trempé dans son sang, +15 % de chance de critique',
        }),
        ...choice(3, [
          minor('sc-oeil-fixe', 'Œil fixe', { flat: { critChance: 1 } }),
          minor('sc-tension', 'Tension', { pct: { physPower: 3 } }),
          minor('sc-sang-repris', 'Sang repris', { passive: { lifestealPct: 1.5 } }),
        ]),
        passive('sang-bouillonnant', 'Sang bouillonnant', 4, '+6 % de puissance physique et +15 % de dégâts critiques.', { pct: { physPower: 6 }, flat: { critDmg: 15 } }),
        ...choice(5, [
          minor('sc-rictus', 'Rictus', { flat: { critDmg: 5 } }),
          minor('sc-poigne', 'Poigne', { pct: { physPower: 3 } }),
          minor('sc-carcasse', 'Carcasse', { pct: { pv: 3 } }),
        ]),
        skill(6, {
          id: 'salve-ecarlate', name: 'Salve écarlate', cost: 15, kind: 'damage', target: 'allEnemies', power: 1.1,
          desc: 'Pluie de traits sanglants sur tous les ennemis',
        }),
        ...choice(7, [
          minor('sc-demesure', 'Démesure', { pct: { physPower: 3.5 } }),
          minor('sc-oeil-du-boucher', 'Œil du boucher', { flat: { critChance: 1.5 } }),
          minor('sc-sang-lourd', 'Sang lourd', { pct: { pv: 3.5 } }),
        ]),
        skill(8, {
          id: 'transpercement', name: 'Transpercement', cost: 17, kind: 'damage', target: 'enemy', power: 3.0,
          desc: 'Tir dévastateur qui transperce la cible',
        }),
        ...choice(9, [
          minor('sc-fracas', 'Fracas', { flat: { critDmg: 6 } }),
          minor('sc-coup-de-grace', 'Coup de grâce', { passive: { executePct: 5 } }),
          minor('sc-reins-solides', 'Reins solides', { pct: { pv: 4 } }),
        ]),
        passive('prix-du-sang', 'Prix du sang', 10, 'Vol de vie : 6 % des dégâts directs infligés rendus en PV ; +15 % de dégâts contre une cible sous 30 % de PV.', { passive: { lifestealPct: 6, executePct: 15 } }),
        ...choice(11, [
          minor('sc-ruine', 'Ruine', { pct: { physPower: 4 } }),
          minor('sc-cruaute-froide', 'Cruauté froide', { flat: { critChance: 2 } }),
          minor('sc-sang-repris-2', 'Sang bu', { passive: { lifestealPct: 2.5 } }),
        ]),
        passive('revenant', 'Revenant', 12, 'Une fois par combat, se relève avec 30 % de ses PV quand il tombe, mais perd son tour suivant.', { passive: { selfRevive: 30, reviveStun: 1 } }),
        ...choice(13, [
          minor('sc-carnage-froid', 'Carnage froid', { pct: { physPower: 4.5 } }),
          minor('sc-demolition', 'Démolition', { flat: { critDmg: 6.5 } }),
          minor('sc-coeur-dur', 'Cœur dur', { pct: { pv: 4.5 } }),
        ]),
        signature({
          id: 'dernier-souffle', name: 'Dernier souffle', cost: 0, kind: 'damage', target: 'enemy', power: 1.5, sacrifice: 8, oncePerCombat: true,
          desc: 'Une fois par combat : tombe à 1 PV et frappe d\'autant plus fort qu\'il a sacrifié de PV (puissance 1,5 + 8 × la part des PV max sacrifiés)',
        }),
      ],
    },
    {
      key: 'liensDuSang', name: 'Liens du sang', icon: '❤️',
      desc: 'Soins : il sacrifie ses PV pour soigner ses alliés et leur donner du vol de vie, et peut les empêcher de mourir. Seule orientation à l\'Intelligence, armure moyenne.',
      nodes: [
        starter('depart-liens', 'Transfusion', 'scarifie', ['transfusion']),
        ...choice(1, [
          minor('sc-sang-clair', 'Sang clair', { pct: { magPower: 2.5 } }),
          minor('sc-don-de-soi', 'Don de soi', { passive: { healPct: 3 } }),
          minor('sc-veines-larges', 'Veines larges', { pct: { pv: 2.5 } }),
        ]),
        skill(2, {
          id: 'pluie-de-sang', name: 'Pluie de sang', cost: 12, kind: 'heal', target: 'allAllies', power: 0.5,
          desc: 'Soigne toute l\'équipe',
        }),
        ...choice(3, [
          minor('sc-offrande', 'Offrande', { passive: { healPct: 3.5 } }),
          minor('sc-clarte-rouge', 'Clarté rouge', { pct: { magPower: 3 } }),
          minor('sc-sang-riche', 'Sang riche', { pct: { pv: 3 } }),
        ]),
        passive('sang-tenace', 'Sang tenace', 4, 'Une fois par combat, se relève aussitôt avec 30 % de ses PV quand il tombe.', { passive: { selfRevive: 30 } }),
        ...choice(5, [
          minor('sc-coeur-ouvert', 'Cœur ouvert', { passive: { healPct: 4 } }),
          minor('sc-flux', 'Flux', { pct: { magPower: 3.5 } }),
          minor('sc-sang-neuf', 'Sang neuf', { pct: { pv: 3.5 } }),
        ]),
        skill(6, {
          id: 'lien-vital', name: 'Lien vital', cost: 9, kind: 'support', target: 'ally',
          effects: [fx('regeneration', 3, 0.35), fx('sang-partage', 3)],
          desc: 'Relie un allié à ses veines : Régénération et Sang partagé (vol de vie) pendant 3 tours',
        }),
        ...choice(7, [
          minor('sc-transfuseur', 'Transfuseur', { passive: { healPct: 4.5 } }),
          minor('sc-fievre', 'Fièvre', { pct: { magPower: 4 } }),
          minor('sc-endurance', 'Endurance', { pct: { pv: 4 } }),
        ]),
        skill(8, {
          id: 'fievre-rouge', name: 'Fièvre rouge', cost: 8, kind: 'damage', target: 'enemy', power: 1.2, magic: true,
          effects: [fx('saignement', 2, 0.3)],
          desc: 'Fait bouillir le sang d\'un ennemi (dégâts magiques) : saignement sur 2 tours',
        }),
        ...choice(9, [
          minor('sc-sang-lumineux', 'Sang lumineux', { passive: { healPct: 5 } }),
          minor('sc-intuition', 'Intuition', { pct: { magPower: 4.5 } }),
          minor('sc-veines-dures', 'Veines dures', { pct: { pv: 4.5 } }),
        ]),
        skill(10, {
          id: 'pacte-de-sang', name: 'Pacte de sang', cost: 20, kind: 'support', target: 'ally', oncePerCombat: true,
          effects: [fx('pacte-de-sang', 1)],
          desc: 'Une fois par combat : jusqu\'à la fin du combat, l\'allié se relèvera aussitôt avec 35 % de ses PV s\'il tombe',
        }),
        ...choice(11, [
          minor('sc-vaisseaux', 'Vaisseaux', { passive: { healPct: 5.5 } }),
          minor('sc-sang-savant', 'Sang savant', { pct: { magPower: 5 } }),
          minor('sc-coeur-solide', 'Cœur solide', { pct: { pv: 5 } }),
        ]),
        passive('sang-genereux', 'Sang généreux', 12, '+15 % de soins et +5 % de PV.', { passive: { healPct: 15 }, pct: { pv: 5 } }),
        ...choice(13, [
          minor('sc-communion', 'Communion', { passive: { healPct: 6 } }),
          minor('sc-sang-sacre', 'Sang sacré', { pct: { magPower: 5.5 } }),
          minor('sc-coeur-de-pierre', 'Cœur de pierre', { pct: { pv: 5.5 } }),
        ]),
        signature({
          id: 'communion-sanglante', name: 'Communion sanglante', cost: 25, kind: 'heal', target: 'allAllies', power: 1.3,
          effects: [fx('sang-partage', 3)],
          desc: 'Soigne fortement toute l\'équipe, qui gagne Sang partagé (vol de vie) pendant 3 tours',
        }),
      ],
    },
  ],
};

// Compétences accordées par un nœud (champ `skill` ou `skills`).
export function nodeSkills(node) {
  return node.skills ?? (node.skill ? [node.skill] : []);
}
