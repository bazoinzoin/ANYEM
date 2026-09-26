// Feuilles de personnage.

import { state } from '../../state.js';
import { STATS } from '../../data/stats.js';
import { getClass, getStats, getSkills } from '../../game/party.js';
import { equippedItems } from '../../game/equipment.js';
import { esc } from '../html.js';
import { skillEffectLabel } from '../format.js';
import { itemChip } from '../items.js';
import { statsList } from '../heroStats.js';
import { goTo } from '../router.js';
import { openEquipment } from './equipment.js';

export function renderStats(app) {
  app.innerHTML = `
    <div class="hero"><h1>Feuilles de personnage</h1><p>Statistiques actuelles de votre équipe</p></div>
    <div class="slots">${state.party.map(sheet).join('')}</div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;
  app.querySelectorAll('[data-equip-hero]').forEach((btn) => {
    btn.onclick = () => openEquipment(Number(btn.dataset.equipHero));
  });
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function sheet(hero, index) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  const items = equippedItems(hero);
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div>
      <div class="cname">${esc(hero.name)}</div>
      <div class="role">${cls.name} · Stat principale : ${STATS[cls.mainStat].label} ★</div>
      <div class="stats sheet">${statsList(hero)}</div>
      <div class="skillbox">
        ${getSkills(hero).map((s) => `
          <div class="skill-line">
            <b>${s.name}</b>${s.boosted ? ' <span class="boosted">★ légendaire</span>' : ''} — ${s.cost} ${cls.resource.name}<br>
            ${skillEffectLabel(stats, s)}
          </div>`).join('')}
      </div>
      <div class="skillbox equipped-list">
        ${items.length ? items.map(itemChip).join('') : '<span class="hint">Aucun équipement</span>'}
      </div>
      <button class="full" data-equip-hero="${index}">🎒 Gérer l'équipement</button>
    </div>`;
}
