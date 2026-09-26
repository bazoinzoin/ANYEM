// Feuilles de personnage.

import { state } from '../../state.js';
import { getClass, getStats } from '../../game/party.js';
import { esc } from '../html.js';
import { skillEffectLabel } from '../format.js';
import { goTo } from '../router.js';

export function renderStats(app) {
  app.innerHTML = `
    <div class="hero"><h1>Feuilles de personnage</h1><p>Statistiques actuelles de votre équipe</p></div>
    <div class="slots">${state.party.map(sheet).join('')}</div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function sheet(hero) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  return `
    <div class="card slot" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div>
      <div class="cname">${esc(hero.name)}</div>
      <div class="role">${cls.name} · Stat principale : ${cls.mainStat}</div>
      <div class="stats sheet">
        PV : ${hero.hp}/${stats.pv}<br>
        ${cls.resource.name} : ${hero.res}/${stats.resMax}<br>
        Attaque : ${stats.atq}<br>
        Vitesse : ${stats.vit}
      </div>
      <div class="skillbox">
        ${cls.skills.map((s) => `
          <div class="skill-line">
            <b>${s.name}</b> — ${s.cost} ${cls.resource.name}<br>
            ${skillEffectLabel(stats.atq, s)}
          </div>`).join('')}
      </div>
    </div>`;
}
