// Tableau des stats finales d'un héros (feuilles de personnage, écran d'équipement).

import { STATS, STAT_ORDER } from '../data/stats.js';
import { COMBAT } from '../config.js';
import { getClass, getStats, usesMana, usesHp } from '../game/party.js';
import { tip } from './html.js';

const STAT_TIPS = {
  atq: 'Attaque apportée par les armes (et bonus d\'objets). Compte pour la puissance physique.',
  critChance: `Chance de coup critique (max ${COMBAT.caps.critChance} %).`,
  critDmg: 'Dégâts supplémentaires infligés par un coup critique.',
  armure: 'Apportée par les armures et boucliers : compte à la fois comme Défense et comme Défense magique (déjà incluse dans les deux lignes suivantes).',
  def: 'Réduit les dégâts physiques subis (Armure comprise).',
  defMag: 'Réduit les dégâts magiques subis (Armure comprise).',
  esquive: `Chance d'éviter entièrement une attaque (max ${COMBAT.caps.esquive} %).`,
  blocage: `Chance de bloquer une attaque, ce qui réduit ses dégâts de moitié (max ${COMBAT.caps.blocage} %).`,
  riposte: `Au corps à corps, chance de contre-attaquer quand on est frappé au corps à corps (${Math.round(COMBAT.ripostePower * 100)} % de la puissance physique, max ${COMBAT.caps.riposte} %).`,
  vit: "Ordre de jeu en combat. Multipliée par le coefficient de vitesse d'attaque de l'arme (armes lourdes lentes, dagues rapides).",
};

// Bonus apportés par les talents : [clé de getStats, libellé, suffixe, explication].
const BONUS_ROWS = [
  ['healPct', 'Bonus de soins', ' %', 'Augmente les soins donnés par ce héros (soins directs et Régénération) : soin = puissance magique × puissance du sort × (1 + bonus).'],
  ['dotPct', 'Bonus dégâts sur la durée', ' %', 'Augmente les dégâts de poison, saignement, brûlure et ténèbres infligés.'],
  ['shieldPct', 'Bonus de boucliers', ' %', 'Augmente la valeur des boucliers donnés.'],
  ['trapPct', 'Bonus de pièges', ' %', 'Augmente les dégâts des pièges posés.'],
  ['aoePct', 'Bonus de zone', ' %', 'Augmente les dégâts des compétences qui touchent tous les ennemis.'],
  ['vsDebuffedPct', 'Bonus contre cible affaiblie', ' %', "Dégâts directs en plus contre une cible qui subit un effet négatif."],
  ['executePct', 'Bonus d\'exécution', ' %', 'Dégâts directs en plus contre une cible sous 30 % de PV.'],
  ['lifestealPct', 'Vol de vie', ' %', 'Part des dégâts directs infligés rendue en PV.'],
  ['resRegen', 'Régénération de ressource', ' / tour', 'Ressource regagnée en plus au début de chaque tour.'],
  ['berserk', 'Berserk', ' % / 10 % PV manquants', 'Puissance physique en plus par tranche de 10 % de PV manquants.'],
];

function row(label, value, tipText) {
  const labelHtml = tipText ? `<span ${tip(tipText)}>${label}</span>` : label;
  return `<div class="stat-row"><span>${labelHtml}</span><span>${value}</span></div>`;
}

// Détail du maximum de ressource : base de la classe, talents et légendaires, objets (Mana).
function resourceTip(cls, stats) {
  const name = cls.resource.name;
  const parts = [`${name} de base : ${stats.resMaxBase}`];
  if (stats.resMaxTalents) parts.push(`talents et légendaires : +${stats.resMaxTalents}`);
  if (usesMana(cls)) parts.push(`Mana des objets : +${stats.resMaxItems}`);
  const note = usesMana(cls) ? '' : ' La stat Mana des objets ne sert pas à cette classe.';
  return `${name} maximum ${stats.resMax} = ${parts.join(' ; ')}.${note}`;
}

export function statsList(hero) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  const phys = STATS[cls.physStat].label;
  const rows = STAT_ORDER.map((k) => {
    const label = STATS[k].label + (k === cls.mainStat ? ' ★' : '');
    let value = `${k === 'pv' ? `${hero.hp}/` : ''}${stats[k]}${STATS[k].suffix ? ` ${STATS[k].suffix}` : ''}`;
    if (k === 'vit' && stats.weaponSpeed !== 1) value += ` <small>(${stats.vitBase} × ${String(stats.weaponSpeed).replace('.', ',')} arme)</small>`;
    return row(label, value, STAT_TIPS[k]);
  });
  // Puissances dérivées, juste après les stats principales.
  rows.splice(STAT_ORDER.indexOf('atq'), 0,
    row('Puissance physique', `${stats.physPower} <small>(Attaque ${stats.atq} + ${stats.physFromStat} ${phys})</small>`,
      `Dégâts de l'attaque de base et des compétences physiques : Attaque des armes + ${String(COMBAT.physStatFactor[cls.physStat]).replace('.', ',')} × ${phys}.`),
    row('Puissance magique', `${stats.magPower} <small>(Intelligence × ${COMBAT.magicPerInt})</small>`,
      'Dégâts des sorts et puissance des soins. Ne compte pas pour les attaques à l\'arme.'));
  rows.splice(STAT_ORDER.indexOf('pv') + 2, 0, usesHp(cls)
    ? row('Ressource', 'aucune', 'Sans ressource : chaque compétence coûte un pourcentage de ses PV max (jamais le dernier PV).')
    : row(cls.resource.name, `${hero.res}/${stats.resMax}`, resourceTip(cls, stats)));
  // Bonus des talents (n'apparaissent que s'ils existent).
  for (const [key, label, suffix, tipText] of BONUS_ROWS) {
    if (stats[key]) rows.push(row(label, `+${stats[key]}${suffix}`, tipText));
  }
  return rows.join('');
}
