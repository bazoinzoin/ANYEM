// Tableau des stats finales d'un héros (feuilles de personnage, écran d'équipement).

import { STATS, STAT_ORDER } from '../data/stats.js';
import { COMBAT } from '../config.js';
import { getClass, getStats } from '../game/party.js';
import { tip } from './html.js';

const STAT_TIPS = {
  atq: 'Attaque apportée par les armes (et bonus d\'objets). Compte pour la puissance physique.',
  critChance: `Chance de coup critique (max ${COMBAT.caps.critChance} %).`,
  critDmg: 'Dégâts supplémentaires infligés par un coup critique.',
  def: 'Réduit les dégâts physiques subis.',
  defMag: 'Réduit les dégâts magiques subis.',
  esquive: `Chance d'éviter entièrement une attaque (max ${COMBAT.caps.esquive} %).`,
  blocage: `Chance de bloquer une attaque, ce qui réduit ses dégâts de moitié (max ${COMBAT.caps.blocage} %).`,
};

function row(label, value, tipText) {
  const labelHtml = tipText ? `<span ${tip(tipText)}>${label}</span>` : label;
  return `<div class="stat-row"><span>${labelHtml}</span><span>${value}</span></div>`;
}

export function statsList(hero) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  const phys = STATS[cls.physStat].label;
  const rows = STAT_ORDER.map((k) => {
    const label = STATS[k].label + (k === cls.mainStat ? ' ★' : '');
    const value = `${k === 'pv' ? `${hero.hp}/` : ''}${stats[k]}${STATS[k].suffix ? ` ${STATS[k].suffix}` : ''}`;
    return row(label, value, STAT_TIPS[k]);
  });
  // Puissances dérivées, juste après les stats principales.
  rows.splice(STAT_ORDER.indexOf('atq'), 0,
    row('Puissance physique', `${stats.physPower} <small>(Attaque ${stats.atq} + ${stats.physFromStat} ${phys})</small>`,
      `Dégâts de l'attaque de base et des compétences physiques : Attaque des armes + ${COMBAT.physStatFactor} × ${phys}.`),
    row('Puissance magique', `${stats.magPower} <small>(Intelligence × ${COMBAT.magicPerInt})</small>`,
      'Dégâts des sorts et puissance des soins. Ne compte pas pour les attaques à l\'arme.'));
  rows.splice(STAT_ORDER.indexOf('pv') + 2, 0, row(cls.resource.name, `${hero.res}/${stats.resMax}`));
  return rows.join('');
}
