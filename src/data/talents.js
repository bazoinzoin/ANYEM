// Arbres de compétences (DESIGN_DOC §3). Données pures.
//
// Chaque classe a une orientation par branche. Une branche alterne gros et petits paliers :
//   palier 0          gros : sort(s) de départ
//   paliers 1,3,5,7,9 petits : 3 bonus de stats au choix, UN SEUL se prend (plusieurs rangs,
//                     CHOICE_RANKS) ; changer d'avis demande une réinitialisation
//   paliers 2,4,6,8   gros : nouvelle compétence ou passif important (un seul nœud, obligatoire)
//   palier 10         gros : compétence signature
// Un palier s'ouvre quand tous les précédents sont complets (gros appris, petit choisi au
// rang maximum) : on passe forcément par chaque gros palier, et on choisit ses petits.
// Une orientation complète coûte 45 points (6 gros + 4 + 6 + 8 + 10 + 11 rangs) : au niveau
// maximum (50 points), une orientation entière et le début d'une autre.
// Les effets des gros paliers suivent la logique de l'orientation (un bonus aux dégâts sur la
// durée ne vient qu'après le premier sort qui en inflige). Les légendaires renforcent les
// compétences et passifs des gros paliers.
//
// Nœud : { id, name, tier, ranks, kind, desc, ...effet }
//   kind 'minor'     petit palier : bonus de stats, plusieurs rangs, exclusif des 2 autres
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

// Rangs des petits paliers (le bonus choisi se prend autant de fois).
export const CHOICE_RANKS = { 1: 4, 3: 6, 5: 8, 7: 10, 9: 11 };
export const SIGNATURE_TIER = 10;

// Libellés des effets, pour décrire un petit palier (« +3 % PV par rang »).
const EFFECT_LABELS = {
  flat: { critChance: ' % Taux critique', critDmg: ' % Dégâts critiques', esquive: ' % Esquive', blocage: ' % Blocage', riposte: ' % Riposte', vit: ' Vitesse' },
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
// Petit palier : trois bonus au choix, chacun avec les rangs du palier.
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
          minor('peau-de-fer', 'Peau de fer', { pct: { pv: 3 } }),
          minor('posture-defensive', 'Posture défensive', { pct: { def: 4 } }),
          minor('robustesse', 'Robustesse', { pct: { defMag: 4 } }),
        ]),
        skill(2, {
          id: 'provocation', name: 'Provocation', cost: 15, kind: 'support', target: 'self',
          selfEffects: [fx('provocation', 2)],
          desc: 'Force les ennemis à attaquer le Guerrier pendant 2 tours (+30 % Défense)',
        }),
        ...choice(3, [
          minor('maitrise-bouclier', 'Maîtrise du bouclier', { flat: { blocage: 2 } }),
          minor('colere-contenue', 'Colère contenue', { passive: { resOnHitTaken: 2 } }),
          minor('endurance', 'Endurance', { pct: { pv: 2 } }),
        ]),
        passive('rempart', 'Rempart', 4, 'Défendre donne aussi un Bouclier égal à 20 % des PV max.', { passive: { guardShieldPct: 20 } }),
        ...choice(5, [
          minor('bastion', 'Bastion', { passive: { shieldPct: 4 } }),
          minor('armure-lourde', 'Armure lourde', { pct: { def: 3 } }),
          minor('tenacite', 'Ténacité', { pct: { defMag: 3 } }),
        ]),
        skill(6, {
          id: 'coup-de-bouclier', name: 'Coup de bouclier', cost: 25, kind: 'damage', target: 'enemy', power: 1.7,
          effects: [fx('etourdi', 1)],
          desc: 'Frappe du bouclier : la cible perd son prochain tour',
        }),
        ...choice(7, [
          minor('inebranlable', 'Inébranlable', { pct: { pv: 2 } }),
          minor('represailles', 'Représailles', { flat: { riposte: 2 } }),
          minor('protecteur', 'Protecteur', { passive: { shieldPct: 4 } }),
        ]),
        skill(8, {
          id: 'mur-de-boucliers', name: 'Mur de boucliers', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 2, 0.9)],
          desc: 'Bouclier sur toute l\'équipe pendant 2 tours',
        }),
        ...choice(9, [
          minor('colosse', 'Colosse', { pct: { pv: 2 } }),
          minor('garde-de-fer', 'Garde de fer', { passive: { guardBonus: 1 } }),
          minor('muraille', 'Muraille', { pct: { def: 2, defMag: 2 } }),
        ]),
        signature({
          id: 'dernier-rempart', name: 'Dernier rempart', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('bouclier', 3, 1.6), fx('protection', 3)],
          selfEffects: [fx('provocation', 3)],
          desc: 'Énorme Bouclier et Protection sur toute l\'équipe pendant 3 tours ; le Guerrier provoque les ennemis',
        }),
      ],
    },
    {
      key: 'berserker', name: 'Berserker', icon: '🪓',
      desc: 'Dégâts : plus il est blessé, plus il frappe fort. Arme à deux mains, armure moyenne.',
      nodes: [
        starter('depart-berserker', 'Frappe brutale', 'guerrier', ['frappe-brutale']),
        ...choice(1, [
          minor('soif-de-sang', 'Soif de sang', { pct: { physPower: 3 } }),
          minor('brutalite', 'Brutalité', { flat: { critDmg: 5 } }),
          minor('fureur', 'Fureur', { passive: { resOnAttack: 2 } }),
        ]),
        skill(2, {
          id: 'frappe-sauvage', name: 'Frappe sauvage', cost: 25, kind: 'damage', target: 'enemy', power: 2.3, critBonus: 25,
          desc: 'Coup violent, +25 % de chance de critique',
        }),
        ...choice(3, [
          minor('rage-sanguinaire', 'Rage sanguinaire', { flat: { critChance: 1 } }),
          minor('sauvagerie', 'Sauvagerie', { flat: { critDmg: 4 } }),
          minor('peau-epaisse', 'Peau épaisse', { pct: { pv: 2 } }),
        ]),
        passive('berserk', 'Berserk', 4, '+4 % de puissance physique par tranche de 10 % de PV manquants.', { passive: { berserk: 4 } }),
        ...choice(5, [
          minor('carnage', 'Carnage', { pct: { physPower: 2 } }),
          minor('vampirisme', 'Vampirisme', { passive: { lifestealPct: 1 } }),
          minor('colere', 'Colère', { passive: { resOnHitTaken: 2 } }),
        ]),
        skill(6, {
          id: 'tourbillon', name: 'Tourbillon', cost: 40, kind: 'damage', target: 'allEnemies', power: 1,
          desc: 'Frappe tous les ennemis',
        }),
        ...choice(7, [
          minor('executeur', 'Exécuteur', { passive: { executePct: 3 } }),
          minor('rage-eternelle', 'Rage éternelle', { flat: { critChance: 1 } }),
          minor('fureur-circulaire', 'Fureur circulaire', { passive: { aoePct: 3 } }),
        ]),
        skill(8, {
          id: 'execution', name: 'Exécution', cost: 35, kind: 'damage', target: 'enemy', power: 2.2, executePct: 100,
          desc: 'Coup mortel : dégâts doublés contre une cible sous 30 % de PV',
        }),
        ...choice(9, [
          minor('soif-de-combat', 'Soif de combat', { pct: { physPower: 2 } }),
          minor('sauvagerie-sanglante', 'Sauvagerie sanglante', { flat: { critDmg: 3 } }),
          minor('fureur-sanglante', 'Fureur sanglante', { passive: { lifestealPct: 1 } }),
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
          minor('vivacite', 'Vivacité', { passive: { resMaxBonus: 5 } }),
          minor('precision', 'Précision', { flat: { critChance: 1 } }),
          minor('lames-aiguisees', 'Lames aiguisées', { flat: { critDmg: 5 } }),
        ]),
        skill(2, {
          id: 'taillade', name: 'Taillade', cost: 25, kind: 'damage', target: 'enemy', power: 0.65, comboGain: 1,
          effects: [fx('ralenti', 2)],
          desc: 'Coup rapide qui ralentit la cible (−30 % Vitesse, 2 tours) et donne 1 point de combo',
        }),
        ...choice(3, [
          minor('reflexes', 'Réflexes', { flat: { esquive: 1 } }),
          minor('pas-de-l-ombre', 'Pas de l\'ombre', { flat: { vit: 1 } }),
          minor('agilite-feline', 'Agilité féline', { pct: { physPower: 2 } }),
        ]),
        passive('sceau-du-destin', 'Sceau du destin', 4, 'Un coup critique d\'une compétence qui donne des points de combo en donne un de plus.', { passive: { critCombo: 1 } }),
        ...choice(5, [
          minor('coup-en-traitre', 'Coup en traître', { flat: { critChance: 1 } }),
          minor('implacable', 'Implacable', { passive: { finisherRefund: 1 } }),
          minor('souffle', 'Souffle', { passive: { resRegen: 2 } }),
        ]),
        skill(6, {
          id: 'deluge-de-lames', name: 'Déluge de lames', cost: 35, kind: 'damage', target: 'enemy', power: 0.2, hits: 4, finisher: true, critBonus: 15,
          desc: 'Finisher : quatre coups rapides (+15 % de chance de critique), plus forts à chaque point de combo',
        }),
        ...choice(7, [
          minor('maitre-des-lames', 'Maître des lames', { flat: { critDmg: 3 } }),
          minor('adresse', 'Adresse', { pct: { physPower: 2 } }),
          minor('second-souffle', 'Second souffle', { passive: { resRegen: 1 } }),
        ]),
        skill(8, {
          id: 'poussee-d-adrenaline', name: 'Poussée d\'adrénaline', cost: 10, kind: 'support', target: 'self', resourceGain: 60, oncePerCombat: true,
          selfEffects: [fx('hate', 2)],
          desc: 'Une fois par combat : rend 60 Énergie et donne Hâte (+25 % Vitesse, 2 tours)',
        }),
        ...choice(9, [
          minor('instinct-du-tueur', 'Instinct du tueur', { passive: { executePct: 3 } }),
          minor('coup-precis', 'Coup précis', { flat: { critChance: 1 } }),
          minor('lames-d-ombre', 'Lames d\'ombre', { flat: { critDmg: 3 } }),
        ]),
        signature({
          id: 'marque-de-la-mort', name: 'Marque de la mort', cost: 40, kind: 'damage', target: 'enemy', power: 0.9, finisher: true, alwaysCrit: true,
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
          minor('toxines', 'Toxines', { passive: { dotPct: 4 } }),
          minor('opportuniste', 'Opportuniste', { passive: { vsDebuffedPct: 3 } }),
          minor('concentration', 'Concentration', { pct: { physPower: 3 } }),
        ]),
        skill(2, {
          id: 'lame-empoisonnee', name: 'Lame empoisonnée', cost: 45, kind: 'damage', target: 'enemy', power: 0.5, comboGain: 2,
          effects: [fx('poison', 4, 0.45)],
          desc: 'Empoisonne la cible pendant 4 tours et donne 2 points de combo',
        }),
        ...choice(3, [
          minor('anatomie', 'Anatomie', { flat: { critChance: 1 } }),
          minor('toxicite', 'Toxicité', { passive: { dotPct: 3 } }),
          minor('sang-froid', 'Sang-froid', { pct: { pv: 2 } }),
        ]),
        passive('venin-virulent', 'Venin virulent', 4, 'Lame empoisonnée : poison +50 % et rend la cible Affaiblie (−20 % puissance physique et magique, 4 tours).', { skillMod: { skill: 'lame-empoisonnee', dotPowerPct: 50, addEffects: [fx('affaibli', 4)] } }),
        ...choice(5, [
          minor('distillation', 'Distillation', { passive: { dotPct: 3 } }),
          minor('patience', 'Patience', { passive: { resRegen: 2 } }),
          minor('opportunisme', 'Opportunisme', { passive: { vsDebuffedPct: 2 } }),
        ]),
        skill(6, {
          id: 'gaz-nauseabond', name: 'Gaz nauséabond', cost: 40, kind: 'support', target: 'allEnemies', comboGain: 1,
          effects: [fx('poison', 3, 0.25), fx('affaibli', 3)],
          desc: 'Empoisonne et affaiblit tous les ennemis pendant 3 tours, donne 1 point de combo',
        }),
        ...choice(7, [
          minor('pestilence', 'Pestilence', { passive: { dotPct: 2 } }),
          minor('resistance', 'Résistance', { pct: { pv: 2 } }),
          minor('doigts-agiles', 'Doigts agiles', { passive: { resRegen: 1 } }),
        ]),
        skill(8, {
          id: 'fiole-de-peste', name: 'Fiole de peste', cost: 50, kind: 'damage', target: 'allEnemies', power: 0.1, finisher: true, fullAt: 3,
          effects: [fx('poison', 4, 0.14)],
          desc: 'Finisher : empoisonne tous les ennemis pendant 4 tours, à pleine puissance dès 3 points de combo',
        }),
        ...choice(9, [
          minor('venin-concentre', 'Venin concentré', { passive: { dotPct: 2 } }),
          minor('dose-mortelle', 'Dose mortelle', { passive: { finisherRefund: 1 } }),
          minor('venin-opportun', 'Venin opportun', { passive: { vsDebuffedPct: 2 } }),
        ]),
        signature({
          id: 'mort-lente', name: 'Mort lente', cost: 50, kind: 'damage', target: 'enemy', power: 0.2, finisher: true, fullAt: 3,
          effects: [fx('poison', 5, 0.35), fx('terreur', 3)],
          desc: 'Finisher : poison foudroyant sur 5 tours et Terreur (−30 % Défenses, 3 tours), à pleine puissance dès 3 points de combo',
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
          minor('devotion', 'Dévotion', { passive: { healPct: 3 } }),
          minor('sagesse', 'Sagesse', { passive: { resMaxBonus: 5 } }),
          minor('piete', 'Piété', { pct: { pv: 3 } }),
        ]),
        skill(2, {
          id: 'priere-de-soins', name: 'Prière de soins', cost: 40, kind: 'heal', target: 'allAllies', power: 0.55,
          desc: 'Soigne toute l\'équipe',
        }),
        ...choice(3, [
          minor('meditation', 'Méditation', { passive: { resRegen: 1 } }),
          minor('lumiere-bienveillante', 'Lumière bienveillante', { pct: { magPower: 2 } }),
          minor('ferveur', 'Ferveur', { passive: { healPct: 2 } }),
        ]),
        passive('grace', 'Grâce', 4, 'Soin Majeur coûte 10 Mana de moins et soigne 20 % de plus.', { skillMod: { skill: 'soin-majeur', costDelta: -10, powerPct: 20 } }),
        ...choice(5, [
          minor('clarte', 'Clarté', { passive: { resRegen: 1 } }),
          minor('esprit-serein', 'Esprit serein', { passive: { resMaxBonus: 3 } }),
          minor('benediction-divine', 'Bénédiction divine', { passive: { healPct: 2 } }),
        ]),
        skill(6, {
          id: 'resurrection', name: 'Résurrection', cost: 60, kind: 'revive', target: 'deadAlly', power: 0.4,
          desc: 'Ramène un allié tombé avec 40 % de ses PV',
        }),
        ...choice(7, [
          minor('aura-sainte', 'Aura sainte', { pct: { defMag: 2 } }),
          minor('misericorde', 'Miséricorde', { passive: { healPct: 2 } }),
          minor('illumination', 'Illumination', { pct: { magPower: 2 } }),
        ]),
        skill(8, {
          id: 'purification', name: 'Purification', cost: 25, kind: 'heal', target: 'ally', power: 0.5, cleanse: true,
          desc: 'Retire tous les effets négatifs d\'un allié et le soigne',
        }),
        ...choice(9, [
          minor('saintete', 'Sainteté', { passive: { healPct: 2 } }),
          minor('recueillement', 'Recueillement', { passive: { resRegen: 1 } }),
          minor('robustesse-sacree', 'Robustesse sacrée', { pct: { pv: 2 } }),
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
          minor('foi', 'Foi', { pct: { magPower: 3 } }),
          minor('constance', 'Constance', { passive: { resRegen: 1 } }),
          minor('harmonie', 'Harmonie', { passive: { healPct: 3 } }),
        ]),
        skill(2, {
          id: 'renovation', name: 'Rénovation', cost: 25, kind: 'support', target: 'ally',
          effects: [fx('regeneration', 4, 0.35)],
          desc: 'Soigne un allié à chaque fin de tour pendant 4 tours',
        }),
        ...choice(3, [
          minor('serenite', 'Sérénité', { passive: { healPct: 2 } }),
          minor('piete-du-precheur', 'Piété du prêcheur', { pct: { pv: 2 } }),
          minor('sermon', 'Sermon', { passive: { resRegen: 1 } }),
        ]),
        skill(4, {
          id: 'bouclier-sacre', name: 'Bouclier sacré', cost: 30, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1.2)],
          desc: 'Protège un allié par un Bouclier pendant 3 tours',
        }),
        ...choice(5, [
          minor('bouclier-de-foi', 'Bouclier de foi', { passive: { shieldPct: 3 } }),
          minor('lumiere-interieure', 'Lumière intérieure', { pct: { magPower: 2 } }),
          minor('grace-celeste', 'Grâce céleste', { passive: { healPct: 2 } }),
        ]),
        passive('bouclier-de-lumiere', 'Bouclier de lumière', 6, 'Bouclier sacré donne aussi Régénération pendant 3 tours.', { skillMod: { skill: 'bouclier-sacre', addEffects: [fx('regeneration', 3, 0.2)] } }),
        ...choice(7, [
          minor('egide', 'Égide', { passive: { shieldPct: 3 } }),
          minor('zele', 'Zèle', { pct: { magPower: 2 } }),
          minor('beatitude', 'Béatitude', { pct: { pv: 2 } }),
        ]),
        skill(8, {
          id: 'jugement', name: 'Jugement', cost: 35, kind: 'damage', target: 'enemy', power: 1, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe de lumière qui embrase la cible (Brûlure sur 3 tours)',
        }),
        ...choice(9, [
          minor('zele-ardent', 'Zèle ardent', { pct: { magPower: 2 } }),
          minor('ferveur-du-precheur', 'Ferveur du prêcheur', { passive: { healPct: 2 } }),
          minor('flammes-sacrees', 'Flammes sacrées', { passive: { dotPct: 3 } }),
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
          minor('esprit-sombre', 'Esprit sombre', { pct: { magPower: 3 } }),
          minor('noirceur', 'Noirceur', { passive: { resRegen: 1 } }),
          minor('voile-d-ombre', 'Voile d\'ombre', { pct: { defMag: 3 } }),
        ]),
        skill(2, {
          id: 'mot-de-douleur', name: 'Mot de douleur', cost: 20, kind: 'damage', target: 'enemy', power: 0.5, magic: true,
          effects: [fx('tenebres', 4, 0.5)],
          desc: 'Dégâts de ténèbres sur 4 tours',
        }),
        ...choice(3, [
          minor('ombre', 'Ombre', { passive: { dotPct: 3 } }),
          minor('corruption', 'Corruption', { pct: { magPower: 2 } }),
          minor('pacte', 'Pacte', { passive: { resMaxBonus: 3 } }),
        ]),
        passive('douleur-prolongee', 'Douleur prolongée', 4, 'Mot de douleur dure 2 tours de plus.', { skillMod: { skill: 'mot-de-douleur', dotTurnsDelta: 2 } }),
        ...choice(5, [
          minor('malveillance', 'Malveillance', { passive: { dotPct: 3 } }),
          minor('supplice', 'Supplice', { passive: { vsDebuffedPct: 2 } }),
          minor('noirceur-profonde', 'Noirceur profonde', { passive: { resRegen: 1 } }),
        ]),
        skill(6, {
          id: 'confusion', name: 'Confusion', cost: 30, kind: 'support', target: 'enemy',
          effects: [fx('confus', 2)],
          desc: 'La cible a une chance sur deux de frapper ses alliés pendant 2 tours',
        }),
        ...choice(7, [
          minor('tourment', 'Tourment', { passive: { dotPct: 2 } }),
          minor('desespoir', 'Désespoir', { passive: { vsDebuffedPct: 2 } }),
          minor('neant', 'Néant', { pct: { magPower: 2 } }),
        ]),
        skill(8, {
          id: 'fleau', name: 'Fléau', cost: 45, kind: 'support', target: 'allEnemies', magic: true,
          effects: [fx('tenebres', 3, 0.5)],
          desc: 'Dégâts de ténèbres sur 3 tours à tous les ennemis',
        }),
        ...choice(9, [
          minor('ombre-devorante', 'Ombre dévorante', { passive: { dotPct: 2 } }),
          minor('abime', 'Abîme', { pct: { magPower: 2 } }),
          minor('voile-noir', 'Voile noir', { pct: { defMag: 2 } }),
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
      key: 'feu', name: 'Mage de feu', icon: '🔥',
      desc: 'Dégâts sur la durée : brûlures sur une cible ou sur tous les ennemis.',
      nodes: [
        starter('depart-feu', 'Boule de feu', 'mage', ['boule-de-feu']),
        ...choice(1, [
          minor('chaleur', 'Chaleur', { pct: { magPower: 3 } }),
          minor('reserve-de-mana', 'Réserve de mana', { passive: { resMaxBonus: 5 } }),
          minor('concentration-ardente', 'Concentration ardente', { passive: { resRegen: 1 } }),
        ]),
        skill(2, {
          id: 'immolation', name: 'Immolation', cost: 25, kind: 'damage', target: 'enemy', power: 0.6, magic: true,
          effects: [fx('brulure', 3, 0.4)],
          desc: 'Enflamme la cible (Brûlure sur 3 tours)',
        }),
        ...choice(3, [
          minor('combustion', 'Combustion', { passive: { dotPct: 3 } }),
          minor('pyromanie', 'Pyromanie', { pct: { magPower: 2 } }),
          minor('etincelles', 'Étincelles', { flat: { critChance: 1 } }),
        ]),
        passive('boule-ardente', 'Boule ardente', 4, 'Boule de feu enflamme aussi la cible (Brûlure sur 3 tours).', { skillMod: { skill: 'boule-de-feu', addEffects: [fx('brulure', 3, 0.2)] } }),
        ...choice(5, [
          minor('braises', 'Braises', { passive: { dotPct: 3 } }),
          minor('flammes-vives', 'Flammes vives', { flat: { critDmg: 3 } }),
          minor('foyer', 'Foyer', { passive: { resMaxBonus: 3 } }),
        ]),
        skill(6, {
          id: 'mur-de-flammes', name: 'Mur de flammes', cost: 40, kind: 'damage', target: 'allEnemies', power: 0.4, magic: true,
          effects: [fx('brulure', 3, 0.35)],
          desc: 'Embrase tous les ennemis (Brûlure sur 3 tours)',
        }),
        ...choice(7, [
          minor('brasier', 'Brasier', { passive: { aoePct: 3 } }),
          minor('incendie', 'Incendie', { passive: { dotPct: 2 } }),
          minor('fournaise', 'Fournaise', { pct: { magPower: 2 } }),
        ]),
        skill(8, {
          id: 'pluie-de-feu', name: 'Pluie de feu', cost: 55, kind: 'damage', target: 'allEnemies', power: 0.9, magic: true,
          effects: [fx('brulure', 3, 0.3)],
          desc: 'Frappe et enflamme tous les ennemis',
        }),
        ...choice(9, [
          minor('cendres', 'Cendres', { passive: { dotPct: 2 } }),
          minor('ignition', 'Ignition', { passive: { aoePct: 2 } }),
          minor('chaleur-intense', 'Chaleur intense', { pct: { magPower: 2 } }),
        ]),
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
        starter('depart-glace', 'Trait de givre', 'mage', ['trait-de-givre']),
        ...choice(1, [
          minor('froid', 'Froid', { pct: { magPower: 3 } }),
          minor('armure-de-givre', 'Armure de givre', { pct: { def: 3, defMag: 3 } }),
          minor('esprit-glace', 'Esprit glacé', { passive: { resRegen: 1 } }),
        ]),
        skill(2, {
          id: 'eclat-de-glace', name: 'Éclat de glace', cost: 20, kind: 'damage', target: 'enemy', power: 1.5, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace, ralentit la cible 2 tours',
        }),
        ...choice(3, [
          minor('morsure-du-froid', 'Morsure du froid', { passive: { vsDebuffedPct: 2 } }),
          minor('hiver', 'Hiver', { pct: { magPower: 2 } }),
          minor('cristaux', 'Cristaux', { flat: { critChance: 1 } }),
        ]),
        skill(4, {
          id: 'nova-de-givre', name: 'Nova de givre', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.6, magic: true,
          effects: [fx('ralenti', 2)],
          desc: 'Dégâts de glace et ralentissement sur tous les ennemis',
        }),
        ...choice(5, [
          minor('glace-eternelle', 'Glace éternelle', { passive: { vsDebuffedPct: 2 } }),
          minor('barriere-de-glace', 'Barrière de glace', { pct: { pv: 2 } }),
          minor('precision-glaciale', 'Précision glaciale', { flat: { critDmg: 3 } }),
        ]),
        passive('eclatement', 'Éclatement', 6, '+15 % de dégâts contre une cible affaiblie.', { passive: { vsDebuffedPct: 15 } }),
        ...choice(7, [
          minor('zero-absolu', 'Zéro absolu', { pct: { magPower: 2 } }),
          minor('hivernage', 'Hivernage', { pct: { pv: 2 } }),
          minor('givre-mordant', 'Givre mordant', { flat: { critChance: 1 } }),
        ]),
        skill(8, {
          id: 'lance-de-glace', name: 'Lance de glace', cost: 35, kind: 'damage', target: 'enemy', power: 2.8, magic: true,
          desc: 'Puissante lance de glace sur un ennemi',
        }),
        ...choice(9, [
          minor('blizzard-interieur', 'Blizzard intérieur', { pct: { magPower: 2 } }),
          minor('gel-acere', 'Gel acéré', { flat: { critDmg: 3 } }),
          minor('froid-eternel', 'Froid éternel', { passive: { vsDebuffedPct: 2 } }),
        ]),
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
        starter('depart-foudre', 'Éclair', 'mage', ['eclair']),
        ...choice(1, [
          minor('conductivite', 'Conductivité', { flat: { critChance: 1 } }),
          minor('surtension', 'Surtension', { flat: { critDmg: 5 } }),
          minor('charge', 'Charge', { pct: { magPower: 3 } }),
        ]),
        skill(2, {
          id: 'chaine-d-eclairs', name: 'Chaîne d\'éclairs', cost: 35, kind: 'damage', target: 'allEnemies', power: 0.9, magic: true,
          desc: 'Foudroie tous les ennemis',
        }),
        ...choice(3, [
          minor('electrisation', 'Électrisation', { flat: { critDmg: 4 } }),
          minor('flux', 'Flux', { passive: { resMaxBonus: 3 } }),
          minor('etincelle', 'Étincelle', { flat: { critChance: 1 } }),
        ]),
        passive('eclair-renforce', 'Éclair renforcé', 4, 'Éclair coûte 5 Mana de moins et frappe 15 % plus fort.', { skillMod: { skill: 'eclair', costDelta: -5, powerPct: 15 } }),
        ...choice(5, [
          minor('haute-tension', 'Haute tension', { pct: { magPower: 2 } }),
          minor('recharge', 'Recharge', { passive: { resRegen: 1 } }),
          minor('coup-de-tonnerre', 'Coup de tonnerre', { passive: { executePct: 3 } }),
        ]),
        skill(6, {
          id: 'onde-de-choc', name: 'Onde de choc', cost: 40, kind: 'damage', target: 'enemy', power: 1, magic: true,
          effects: [fx('etourdi', 1)],
          desc: 'Décharge paralysante : la cible perd son prochain tour',
        }),
        ...choice(7, [
          minor('foudroiement', 'Foudroiement', { flat: { critDmg: 3 } }),
          minor('arc-electrique', 'Arc électrique', { pct: { magPower: 2 } }),
          minor('orage', 'Orage', { flat: { critChance: 1 } }),
        ]),
        skill(8, {
          id: 'tempete', name: 'Tempête', cost: 60, kind: 'damage', target: 'enemy', power: 2.3, magic: true,
          desc: 'Énorme décharge de foudre sur un ennemi',
        }),
        ...choice(9, [
          minor('supraconduction', 'Supraconduction', { flat: { critChance: 1 } }),
          minor('decharge', 'Décharge', { flat: { critDmg: 3 } }),
          minor('surcharge', 'Surcharge', { passive: { aoePct: 3 } }),
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
          minor('tension-de-la-corde', 'Tension de la corde', { pct: { physPower: 3 } }),
          minor('reserve-d-energie', 'Réserve d\'énergie', { passive: { resMaxBonus: 5 } }),
        ]),
        skill(2, {
          id: 'tir-percant', name: 'Tir perçant', cost: 55, kind: 'damage', target: 'enemy', power: 2.1, critBonus: 10,
          desc: 'Flèche lourde qui transperce la cible (+10 % de chance de critique)',
        }),
        ...choice(3, [
          minor('visee', 'Visée', { flat: { critDmg: 4 } }),
          minor('souffle-retenu', 'Souffle retenu', { passive: { resRegen: 2 } }),
          minor('precision-mortelle', 'Précision mortelle', { flat: { critChance: 1 } }),
        ]),
        passive('calme-du-tireur', 'Calme du tireur', 4, '+20 Énergie max et +5 Énergie regagnée par tour.', { passive: { resMaxBonus: 20, resRegen: 5 } }),
        ...choice(5, [
          minor('puissance-du-tir', 'Puissance du tir', { pct: { physPower: 2 } }),
          minor('chasseur-de-tetes', 'Chasseur de têtes', { passive: { executePct: 3 } }),
          minor('endurance-du-chasseur', 'Endurance du chasseur', { pct: { pv: 2 } }),
        ]),
        skill(6, {
          id: 'salve', name: 'Salve', cost: 60, kind: 'damage', target: 'allEnemies', power: 0.95,
          desc: 'Pluie de flèches sur tous les ennemis',
        }),
        ...choice(7, [
          minor('balistique', 'Balistique', { flat: { critDmg: 3 } }),
          minor('oeil-du-faucon', 'Œil du faucon', { flat: { critChance: 1 } }),
          minor('visee-parfaite', 'Visée parfaite', { pct: { physPower: 2 } }),
        ]),
        skill(8, {
          id: 'tir-de-l-aigle', name: 'Tir de l\'aigle', cost: 80, kind: 'damage', target: 'enemy', power: 3.2, critBonus: 20,
          desc: 'Tir dévastateur sur un ennemi (+20 % de chance de critique)',
        }),
        ...choice(9, [
          minor('tir-mortel', 'Tir mortel', { passive: { executePct: 3 } }),
          minor('focalisation', 'Focalisation', { flat: { critDmg: 3 } }),
          minor('pluie-de-fleches', 'Pluie de flèches', { passive: { aoePct: 3 } }),
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
          minor('tir-agile', 'Tir agile', { pct: { physPower: 3 } }),
        ]),
        skill(2, {
          id: 'piege-a-machoires', name: 'Piège à mâchoires', cost: 25, kind: 'support', target: 'enemy',
          effects: [fx('piege', 3, 0.8)],
          desc: 'Pose un piège sur un ennemi : il se referme à son prochain tour (dégâts, et il perd ce tour)',
        }),
        ...choice(3, [
          minor('pieges-affutes', 'Pièges affûtés', { passive: { trapPct: 4 } }),
          minor('economie', 'Économie', { passive: { resRegen: 2 } }),
          minor('camouflage', 'Camouflage', { flat: { esquive: 1 } }),
        ]),
        passive('fleches-barbelees', 'Flèches barbelées', 4, 'Tir rapide fait saigner la cible (2 tours).', { skillMod: { skill: 'tir-rapide', addEffects: [fx('saignement', 2, 0.15)] } }),
        ...choice(5, [
          minor('harcelement', 'Harcèlement', { passive: { vsDebuffedPct: 2 } }),
          minor('vivacite-du-traqueur', 'Vivacité du traqueur', { passive: { resRegen: 1 } }),
          minor('instinct', 'Instinct', { flat: { critChance: 1 } }),
        ]),
        skill(6, {
          id: 'tir-incapacitant', name: 'Tir incapacitant', cost: 20, kind: 'damage', target: 'enemy', power: 0.5,
          effects: [fx('ralenti', 2)],
          desc: 'Petite flèche qui ralentit la cible (−30 % Vitesse, 2 tours)',
        }),
        ...choice(7, [
          minor('tir-continu', 'Tir continu', { pct: { physPower: 2 } }),
          minor('harcelement-continu', 'Harcèlement continu', { passive: { vsDebuffedPct: 2 } }),
          minor('machoires-d-acier', 'Mâchoires d\'acier', { passive: { trapPct: 3 } }),
        ]),
        skill(8, {
          id: 'champ-de-givre', name: 'Champ de givre', cost: 35, kind: 'support', target: 'allEnemies',
          effects: [fx('piegeDeGivre', 3, 0.5)],
          desc: 'Piège de givre sous tous les ennemis : dégâts à leur prochain tour, puis Ralentis 3 tours',
        }),
        ...choice(9, [
          minor('maitre-traqueur', 'Maître traqueur', { passive: { trapPct: 3 } }),
          minor('endurance-du-traqueur', 'Endurance du traqueur', { pct: { pv: 2 } }),
          minor('tireur-vif', 'Tireur vif', { flat: { vit: 1 } }),
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
          minor('armure-sacree', 'Armure sacrée', { pct: { def: 3 } }),
          minor('vigueur', 'Vigueur', { pct: { pv: 3 } }),
          minor('ferveur-du-croise', 'Ferveur du croisé', { pct: { physPower: 3 } }),
        ]),
        skill(2, {
          id: 'intercession', name: 'Intercession', cost: 20, kind: 'support', target: 'ally',
          effects: [fx('intercession', 3)],
          desc: 'Le Paladin encaisse la moitié des dégâts subis par un allié pendant 3 tours',
        }),
        ...choice(3, [
          minor('foi-inebranlable', 'Foi inébranlable', { pct: { defMag: 3 } }),
          minor('bouclier-beni', 'Bouclier béni', { flat: { blocage: 2 } }),
          minor('robustesse-du-croise', 'Robustesse du croisé', { pct: { pv: 2 } }),
        ]),
        skill(4, {
          id: 'sceau-de-vie', name: 'Sceau de vie', cost: 30, kind: 'heal', target: 'self', power: 1, physHeal: true,
          effects: [fx('regeneration', 3, 0.25)],
          desc: 'Le Paladin se soigne et se régénère pendant 3 tours (soins sur la Force)',
        }),
        ...choice(5, [
          minor('consecration', 'Consécration', { pct: { def: 2 } }),
          minor('foi-ardente', 'Foi ardente', { passive: { healPct: 2 } }),
          minor('endurance-sainte', 'Endurance sainte', { passive: { resRegen: 1 } }),
        ]),
        passive('vengeance-sacree', 'Vengeance sacrée', 6, 'Vol de vie : 10 % des dégâts directs infligés rendus en PV.', { passive: { lifestealPct: 10 } }),
        ...choice(7, [
          minor('aura-de-devotion', 'Aura de dévotion', { pct: { pv: 2 } }),
          minor('justice', 'Justice', { pct: { physPower: 2 } }),
          minor('garde-benie', 'Garde bénie', { flat: { blocage: 1 } }),
        ]),
        skill(8, {
          id: 'aura-de-protection', name: 'Aura de protection', cost: 45, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 2), fx('bouclier', 2, 0.6)],
          desc: 'Bouclier sur toute l\'équipe ; le Paladin encaisse la moitié des dégâts de ses alliés pendant 2 tours',
        }),
        ...choice(9, [
          minor('colosse-sacre', 'Colosse sacré', { pct: { pv: 2 } }),
          minor('bouclier-des-justes', 'Bouclier des justes', { passive: { shieldPct: 3 } }),
          minor('garde-du-croise', 'Garde du croisé', { passive: { guardShieldPct: 1 } }),
        ]),
        signature({
          id: 'sacrifice-divin', name: 'Sacrifice divin', cost: 70, kind: 'support', target: 'allAllies',
          effects: [fx('intercession', 3)],
          selfEffects: [fx('bouclier', 3, 2), fx('protection', 3), fx('provocation', 3)],
          desc: 'Le Paladin attire les ennemis et encaisse la moitié des dégâts de toute l\'équipe, protégé par un énorme Bouclier et Protection (3 tours)',
        }),
      ],
    },
    {
      key: 'lumiere', name: 'Lumière', icon: '☀️',
      desc: 'Soigneur : soins de groupe et guérison des effets négatifs. Monte l\'Intelligence : armure légère, armes d\'Intelligence.',
      nodes: [
        starter('depart-lumiere', 'Lumière sacrée', 'paladin', ['lumiere-sacree']),
        ...choice(1, [
          minor('eclat-sacre', 'Éclat sacré', { passive: { healPct: 3 } }),
          minor('sagesse-du-paladin', 'Sagesse du paladin', { passive: { resMaxBonus: 5 } }),
          minor('illumination-sainte', 'Illumination sainte', { pct: { magPower: 3 } }),
        ]),
        skill(2, {
          id: 'lumiere-de-l-aube', name: 'Lumière de l\'aube', cost: 35, kind: 'heal', target: 'allAllies', power: 0.45,
          desc: 'Soigne toute l\'équipe',
        }),
        ...choice(3, [
          minor('meditation-sacree', 'Méditation sacrée', { passive: { resRegen: 1 } }),
          minor('devouement', 'Dévouement', { passive: { healPct: 2 } }),
          minor('armure-de-foi', 'Armure de foi', { pct: { defMag: 3 } }),
        ]),
        passive('main-de-lumiere', 'Main de lumière', 4, 'Lumière sacrée coûte 8 Mana de moins et soigne 20 % de plus.', { skillMod: { skill: 'lumiere-sacree', costDelta: -8, powerPct: 20 } }),
        ...choice(5, [
          minor('grace-du-paladin', 'Grâce du paladin', { passive: { healPct: 2 } }),
          minor('rayonnement', 'Rayonnement', { pct: { magPower: 2 } }),
          minor('benediction-du-paladin', 'Bénédiction du paladin', { pct: { pv: 2 } }),
        ]),
        skill(6, {
          id: 'epuration', name: 'Épuration', cost: 20, kind: 'support', target: 'ally', cleanse: true,
          desc: 'Retire tous les effets négatifs d\'un allié',
        }),
        ...choice(7, [
          minor('ferveur-lumineuse', 'Ferveur lumineuse', { passive: { healPct: 2 } }),
          minor('aube-eternelle', 'Aube éternelle', { passive: { resRegen: 1 } }),
          minor('clarte-sainte', 'Clarté sainte', { pct: { magPower: 2 } }),
        ]),
        skill(8, {
          id: 'sceau-de-protection', name: 'Sceau de protection', cost: 35, kind: 'support', target: 'ally', magic: true,
          effects: [fx('bouclier', 3, 1), fx('regeneration', 3, 0.25)],
          desc: 'Bouclier et Régénération sur un allié pendant 3 tours',
        }),
        ...choice(9, [
          minor('aura-de-guerison', 'Aura de guérison', { passive: { healPct: 2 } }),
          minor('clarte-du-paladin', 'Clarté du paladin', { passive: { resRegen: 1 } }),
          minor('bouclier-de-lumiere-paladin', 'Égide de lumière', { passive: { shieldPct: 3 } }),
        ]),
        signature({
          id: 'lumiere-divine', name: 'Lumière divine', cost: 80, kind: 'heal', target: 'allAllies', power: 0.9, cleanse: true,
          effects: [fx('regeneration', 3, 0.3), fx('protection', 2)],
          desc: 'Grand soin de toute l\'équipe : retire ses effets négatifs, puis Régénération et Protection',
        }),
      ],
    },
  ],
};

// Compétences accordées par un nœud (champ `skill` ou `skills`).
export function nodeSkills(node) {
  return node.skills ?? (node.skill ? [node.skill] : []);
}
