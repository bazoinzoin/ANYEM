// Portails (garde de la porte du village) : zones et sous-zones, départ d'une expédition.

import { state } from '../../state.js';
import { DUNGEONS, DUNGEON_ORDER, FLOORS_PER_SUBZONE } from '../../data/dungeons.js';
import { isUnlocked, progressOf, startFloors, startExpedition } from '../../game/dungeon.js';
import { esc } from '../html.js';
import { goTo } from '../router.js';

export function renderPortals(app) {
  app.innerHTML = `
    <div class="hero"><h1>🌀 Portails</h1><p>« Où voulez-vous aller ? » — le garde de la porte</p></div>
    <div class="card">
      <p class="hint">Chaque zone compte 3 sous-zones de ${FLOORS_PER_SUBZONE} étages ; un boss garde le dernier étage de chaque sous-zone. On ne peut rentrer qu'après avoir vaincu un boss ; mourir coûte de l'or et une partie du sac. Chaque boss vaincu ouvre la sous-zone suivante comme point de départ.</p>
      <div class="portals">${DUNGEON_ORDER.map(portal).join('')}</div>
    </div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;
  app.querySelectorAll('[data-dungeon]').forEach((btn) => {
    btn.onclick = () => {
      if (startExpedition(state, btn.dataset.dungeon, Number(btn.dataset.floor))) goTo('dungeon');
    };
  });
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function portal(key) {
  const d = DUNGEONS[key];
  if (!isUnlocked(state, key)) {
    return `<div class="card portal locked"><h3>🔒 Zone ${DUNGEON_ORDER.indexOf(key) + 1} · ${d.name}</h3><p>Niveaux ${d.minLevel} à ${d.maxLevel}. Terminez la zone précédente pour l'ouvrir.</p></div>`;
  }
  const progress = progressOf(state, key);
  const starts = startFloors(state, key);
  return `
    <div class="card portal">
      <h3>${d.icon} Zone ${DUNGEON_ORDER.indexOf(key) + 1} · ${d.name}${progress.cleared ? ' <b>✓</b>' : ''}</h3>
      <p>${d.desc}</p>
      <p>Niveaux ${d.minLevel} à ${d.maxLevel}</p>
      <div class="subzones">
        ${d.subzones.map((sub, i) => {
          const first = i * FLOORS_PER_SUBZONE + 1;
          const beaten = progress.checkpoint >= first + FLOORS_PER_SUBZONE - 1;
          const open = starts.includes(first);
          return `
            <div class="subzone ${open ? '' : 'locked'}">
              <span>${i + 1}. ${esc(sub.name)} <small>niv. ${sub.minLevel}-${sub.maxLevel}${beaten ? ' · ✓ boss vaincu' : ''}</small></span>
              ${open ? `<button data-dungeon="${key}" data-floor="${first}">Entrer</button>` : '<small>🔒</small>'}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}
