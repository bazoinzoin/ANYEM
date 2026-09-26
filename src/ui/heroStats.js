// Tableau des stats finales d'un héros (feuilles de personnage, écran d'équipement).

import { STATS, STAT_ORDER } from '../data/stats.js';
import { COMBAT } from '../config.js';
import { getClass, getStats } from '../game/party.js';
import { tip } from './html.js';

const STAT_TIPS = {
  atq: "Base des dégâts et des soins. Comprend le bonus de la stat principale.",
  critChance: `Chance de coup critique (max ${COMBAT.caps.critChance} %).`,
  critDmg: 'Dégâts supplémentaires infligés par un coup critique.',
  def: 'Réduit les dégâts physiques subis.',
  defMag: 'Réduit les dégâts magiques subis.',
  esquive: `Chance d'éviter entièrement une attaque (max ${COMBAT.caps.esquive} %).`,
  blocage: `Chance de bloquer une attaque, ce qui réduit ses dégâts de moitié (max ${COMBAT.caps.blocage} %).`,
};

export function statsList(hero) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  const rows = STAT_ORDER.map((k) => {
    let label = STATS[k].label;
    if (k === cls.mainStat) label += ' ★';
    let value = `${k === 'pv' ? `${hero.hp}/` : ''}${stats[k]}${STATS[k].suffix ? ` ${STATS[k].suffix}` : ''}`;
    if (k === 'atq') value += ` <small>(dont +${stats.atqFromMain} ${STATS[cls.mainStat].label})</small>`;
    const labelHtml = STAT_TIPS[k] ? `<span ${tip(STAT_TIPS[k])}>${label}</span>` : label;
    return `<div class="stat-row"><span>${labelHtml}</span><span>${value}</span></div>`;
  });
  rows.splice(STAT_ORDER.indexOf('pv'), 0,
    `<div class="stat-row"><span>${cls.resource.name}</span><span>${hero.res}/${stats.resMax}</span></div>`);
  return rows.join('');
}
