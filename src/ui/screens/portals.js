// Portails (garde de la porte du village), plein écran : une colonne par zone avec le
// portrait de son dernier boss, ses médailles (ui/medals.js), ses 3 sous-zones et le
// départ d'une expédition.

import { state } from '../../state.js';
import { DUNGEONS, DUNGEON_ORDER, FLOORS_PER_SUBZONE } from '../../data/dungeons.js';
import { ENEMIES } from '../../data/enemies.js';
import { isUnlocked, progressOf, startFloors, startExpedition } from '../../game/dungeon.js';
import { isDiscovered } from '../../game/bestiary.js';
import { DIFFICULTIES, MEDALS } from '../../config.js';
import { difficultyOf, difficultyLevel } from '../../game/difficulty.js';
import { esc } from '../html.js';
import { goTo } from '../router.js';
import { frame, wireFrame } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';
import { zoneMedals } from '../../game/medals.js';
import { medalRow } from '../medals.js';

export function renderPortals(app) {
  app.innerHTML = frame({
    title: 'Portails', icon: 1000, layout: 'lay-portals', gold: false,
    extras: `<span class="hint">« Où voulez-vous aller ? » Chaque zone : 3 sous-zones de ${FLOORS_PER_SUBZONE} étages, un boss au dernier. On ne rentre qu'après un boss ; mourir coûte de l'or et une partie du sac (et de l'équipement porté à partir de Guerre). Vaincre le dernier boss d'une zone en ${DIFFICULTIES[MEDALS.from].name} ou plus difficile donne sa médaille.</span>`,
    body: DUNGEON_ORDER.map(zoneColumn).join(''),
  });
  wireFrame(app, () => goTo('hub'));
  drawPortraits(app);
  app.querySelectorAll('[data-dungeon]').forEach((btn) => {
    btn.onclick = () => {
      if (startExpedition(state, btn.dataset.dungeon, Number(btn.dataset.floor))) goTo('dungeon');
    };
  });
}

// Niveaux affichés : ceux de la zone, ou le niveau maximum (Horreur et au-delà).
const levels = (lo, hi) => {
  const diff = difficultyOf(state);
  return DIFFICULTIES[diff].maxLevel ? `${difficultyLevel(diff, hi)} (${DIFFICULTIES[diff].name})` : `${lo} à ${hi}`;
};

function zoneColumn(key, index) {
  const d = DUNGEONS[key];
  const lastBoss = d.subzones[d.subzones.length - 1].boss;
  if (!isUnlocked(state, key)) {
    return `
      <section class="win portal-zone locked">
        <h3>Zone ${index + 1}</h3>
        <div class="portal-art">${portrait(`ennemi:${lastBoss}`, 5)}</div>
        ${medalRow(key, zoneMedals(state, key))}
        <p class="hint">Niveaux ${levels(d.minLevel, d.maxLevel)}. Terminez la zone précédente pour l'ouvrir.</p>
      </section>`;
  }
  const progress = progressOf(state, key);
  const starts = startFloors(state, key);
  return `
    <section class="win portal-zone ${progress.cleared ? 'cleared' : ''}">
      <h3>Zone ${index + 1} · ${esc(d.name)}</h3>
      <div class="portal-art ${isDiscovered(state, lastBoss) ? '' : 'unknown'}" title="${isDiscovered(state, lastBoss) ? esc(ENEMIES[lastBoss].name) : ''}">${portrait(`ennemi:${lastBoss}`, 5)}</div>
      ${medalRow(key, zoneMedals(state, key))}
      <p class="hint">${esc(d.desc)}<br>Niveaux ${levels(d.minLevel, d.maxLevel)}${progress.cleared ? ' · zone terminée' : ''}</p>
      <div class="subzones">
        ${d.subzones.map((sub, i) => {
          const first = i * FLOORS_PER_SUBZONE + 1;
          const beaten = progress.checkpoint >= first + FLOORS_PER_SUBZONE - 1;
          const open = starts.includes(first);
          return `
            <button class="subzone-btn ${beaten ? 'beaten' : ''}" ${open ? `data-dungeon="${key}" data-floor="${first}"` : 'disabled'}>
              <b>${i + 1}. ${esc(sub.name)}</b><small>niv. ${levels(sub.minLevel, sub.maxLevel).replace(' à ', '-')}${beaten ? ' · boss vaincu' : open ? '' : ' · fermé'}</small>
            </button>`;
        }).join('')}
      </div>
    </section>`;
}
