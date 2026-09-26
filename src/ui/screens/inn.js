// Auberge : repos, recrutement de compagnons et gestion de l'équipe (4 héros ;
// les autres attendent à l'auberge avec leur équipement, sans gagner d'XP).

import { state } from '../../state.js';
import { CLASS_ORDER } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { getClass, getStats } from '../../game/party.js';
import { restAtInn } from '../../game/progression.js';
import { recruit, swapWithReserve, reserveOf, rosterLockedReason } from '../../game/roster.js';
import { esc, tip } from '../html.js';
import { equipmentTooltip } from '../items.js';
import { goTo, goBack, backLabel } from '../router.js';

// État de l'écran : classe du compagnon à recruter, héros de l'auberge sélectionné
// pour un échange, message.
const view = { recruitClass: 'guerrier', recruitName: '', selectedReserve: null, flash: null };

export function openInn() {
  Object.assign(view, { selectedReserve: null, flash: null });
  goTo('inn');
}

export function renderInn(app) {
  const flash = view.flash;
  view.flash = null;
  const locked = rosterLockedReason(state);
  const reserve = reserveOf(state);
  const picking = view.selectedReserve !== null ? reserve[view.selectedReserve] : null;

  app.innerHTML = `
    <div class="hero"><h1>🛏️ Auberge</h1><p>Repos, recrutement et gestion de l'équipe</p></div>
    ${flash ? `<div class="card notice">${esc(flash)}</div>` : ''}
    ${locked ? `<div class="card notice">${esc(locked)}</div>` : ''}
    <div class="card">
      <button id="rest" ${tip("Soigne entièrement les PV et les ressources de toute l'équipe, gratuitement.")}>🛏️ Se reposer (gratuit)</button>
    </div>

    <div class="card">
      <h2>Équipe</h2>
      <p class="hint">${picking ? `Choisis le membre de l'équipe qui laisse sa place à <b>${esc(picking.name)}</b>.` : "Survole un héros pour voir l'équipement qu'il porte."}</p>
      <div class="roster">${state.party.map((h, i) => heroTile(h, { partyIndex: i, picking: !!picking })).join('')}</div>
    </div>

    <div class="card">
      <h2>À l'auberge (${reserve.length})</h2>
      <p class="hint">Les compagnons au repos gardent leur équipement et leurs talents mais ne gagnent pas d'XP. Clique sur l'un d'eux pour le faire entrer dans l'équipe.</p>
      <div class="roster">${reserve.length ? reserve.map((h, i) => heroTile(h, { reserveIndex: i, selected: i === view.selectedReserve })).join('') : '<p class="hint">Personne pour le moment.</p>'}</div>
    </div>

    <div class="card">
      <h2>Recruter un compagnon</h2>
      <p class="hint">Un nouveau compagnon arrive au niveau 1 avec l'équipement de départ de sa classe. Il prend la place d'un membre de l'équipe, qui part se reposer à l'auberge.</p>
      <div class="class-picker">
        ${CLASS_ORDER.map((k) => `<button data-recruit-class="${k}" class="${k === view.recruitClass ? 'selected' : ''}" style="--c:${CLASSES[k].color}" ${tip(CLASSES[k].desc)}>${CLASSES[k].icon} ${CLASSES[k].name}</button>`).join('')}
      </div>
      <input type="text" id="recruitName" placeholder="Nom du compagnon" value="${esc(view.recruitName || CLASSES[view.recruitClass].name)}" maxlength="24">
      <div class="actions">
        ${state.party.map((h, i) => `<button data-recruit-replace="${i}" ${locked ? 'disabled' : ''}>Remplacer ${esc(h.name)}</button>`).join('')}
      </div>
    </div>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;

  const readName = () => { view.recruitName = app.querySelector('#recruitName').value; };
  app.querySelector('#rest').onclick = () => {
    view.flash = restAtInn(state).message;
    goTo('inn');
  };
  app.querySelectorAll('[data-recruit-class]').forEach((btn) => {
    btn.onclick = () => {
      readName();
      if (view.recruitName === CLASSES[view.recruitClass].name) view.recruitName = '';
      view.recruitClass = btn.dataset.recruitClass;
      goTo('inn');
    };
  });
  app.querySelectorAll('[data-recruit-replace]').forEach((btn) => {
    btn.onclick = () => {
      readName();
      const leaving = state.party[Number(btn.dataset.recruitReplace)];
      const hero = recruit(state, view.recruitClass, view.recruitName, Number(btn.dataset.recruitReplace));
      if (hero) {
        view.flash = `${hero.name} (${getClass(hero).name}) rejoint l'équipe ; ${leaving.name} se repose à l'auberge.`;
        view.recruitName = '';
      }
      goTo('inn');
    };
  });
  app.querySelectorAll('[data-reserve]').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.reserve);
      view.selectedReserve = view.selectedReserve === i ? null : i;
      goTo('inn');
    };
  });
  app.querySelectorAll('[data-party]').forEach((btn) => {
    btn.onclick = () => {
      if (view.selectedReserve === null) return;
      const joining = reserve[view.selectedReserve];
      const leaving = state.party[Number(btn.dataset.party)];
      if (swapWithReserve(state, Number(btn.dataset.party), view.selectedReserve)) {
        view.flash = `${joining.name} rejoint l'équipe ; ${leaving.name} se repose à l'auberge.`;
      }
      view.selectedReserve = null;
      goTo('inn');
    };
  });
  app.querySelector('#backHub').onclick = () => goBack();
}

// Vignette d'un héros ; l'infobulle montre son équipement.
function heroTile(hero, { partyIndex, reserveIndex, picking = false, selected = false }) {
  const cls = getClass(hero);
  const attr = partyIndex !== undefined ? `data-party="${partyIndex}"` : `data-reserve="${reserveIndex}"`;
  const clickable = reserveIndex !== undefined || picking;
  return `
    <button ${attr} ${tip(equipmentTooltip(hero), `hero-tile ${selected ? 'selected' : ''} ${clickable ? 'clickable' : ''}`)} style="--c:${cls.color}" ${clickable && !rosterLockedReason(state) ? '' : 'disabled'}>
      <span class="icon">${cls.icon}</span>
      <b>${esc(hero.name)}</b>
      <small>${cls.name} · niv. ${hero.level} · PV ${hero.hp}/${getStats(hero).pv}</small>
    </button>`;
}
