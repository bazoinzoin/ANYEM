// Auberge, plein écran : repos, recrutement de compagnons et gestion de l'équipe (4 héros ;
// les autres attendent à l'auberge avec leur équipement, sans gagner d'XP).

import { state } from '../../state.js';
import { CLASS_ORDER, INN } from '../../config.js';
import { CLASSES } from '../../data/classes.js';
import { getClass, getStats } from '../../game/party.js';
import { restAtInn } from '../../game/progression.js';
import { recruit, recruitProblem, swapWithReserve, reserveOf, rosterLockedReason, dismiss, dismissOutcome } from '../../game/roster.js';
import { RARITIES } from '../../data/items.js';
import { equippedItems } from '../../game/equipment.js';
import { esc } from '../html.js';
import { equipmentTooltip, itemName } from '../items.js';
import { goTo } from '../router.js';
import { iconHtml, itemIcon } from '../icons.js';
import { frame, wireFrame } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';

// État de l'écran : classe du compagnon à recruter, héros de l'auberge sélectionné
// pour un échange, message.
const view = { recruitClass: 'guerrier', recruitName: '', selectedReserve: null, confirmDismiss: false, flash: null };

export function openInn() {
  Object.assign(view, { selectedReserve: null, confirmDismiss: false, flash: null });
  goTo('inn');
}

export function renderInn(app) {
  const flash = view.flash;
  view.flash = null;
  const locked = rosterLockedReason(state);
  const reserve = reserveOf(state);
  const picking = view.selectedReserve !== null ? reserve[view.selectedReserve] : null;
  const cannotRecruit = recruitProblem(state);

  app.innerHTML = frame({
    title: 'Auberge', icon: 93, layout: 'lay-inn',
    extras: `<button id="rest" class="gold">${iconHtml(93, 16)} Se reposer (gratuit)</button>
      ${flash ? `<span class="scr-flash">${esc(flash)}</span>` : ''}${locked ? `<span class="warning">${esc(locked)}</span>` : ''}`,
    body: `
      <section class="win">
        <h3>${iconHtml(720, 16)} Équipe <small>${picking ? `choisissez qui laisse sa place à ${esc(picking.name)}` : 'survolez un héros pour voir son équipement'}</small></h3>
        <div class="inn-row">${state.party.map((h, i) => heroTile(h, { partyIndex: i, picking: !!picking })).join('')}</div>
      </section>
      <section class="win">
        <h3>${iconHtml(93, 16)} À l'auberge <small>${reserve.length}/${INN.maxReserve} · au repos : gardent équipement et talents, sans gagner d'XP</small></h3>
        <div class="inn-row">${reserve.map((h, i) => heroTile(h, { reserveIndex: i, selected: i === view.selectedReserve })).join('')}${reserve.length ? '' : '<p class="hint">Personne pour le moment.</p>'}</div>
        ${picking && !locked ? dismissPanel(picking) : ''}
      </section>
      <section class="win inn-recruit">
        <h3>${iconHtml(1000, 16)} Recruter un compagnon</h3>
        <p class="hint">Niveau 1, équipement de départ de sa classe. Il prend la place d'un membre de l'équipe, qui part se reposer ici.</p>
        <div class="class-picks">
          ${CLASS_ORDER.map((k) => `<button data-recruit-class="${k}" class="class-pick ${k === view.recruitClass ? 'selected' : ''}" style="--c:${CLASSES[k].color}" title="${esc(CLASSES[k].desc)}">${portrait(`classe:${k}`, 2)}<span>${esc(CLASSES[k].name)}</span></button>`).join('')}
        </div>
        <p class="hint">${esc(CLASSES[view.recruitClass].desc)}</p>
        <input type="text" id="recruitName" placeholder="Nom du compagnon" value="${esc(view.recruitName || CLASSES[view.recruitClass].name)}" maxlength="24">
        ${cannotRecruit && !locked ? `<p class="warning">${esc(cannotRecruit)}</p>` : ''}
        <div class="actions stack">
          ${state.party.map((h, i) => `<button data-recruit-replace="${i}" ${cannotRecruit ? 'disabled' : ''}>Remplacer ${esc(h.name)}</button>`).join('')}
        </div>
      </section>`,
  });
  wireFrame(app);
  drawPortraits(app);

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
      view.confirmDismiss = false;
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
  app.querySelector('#dismiss')?.addEventListener('click', () => {
    if (!view.confirmDismiss) {
      view.confirmDismiss = true;
    } else {
      const r = dismiss(state, view.selectedReserve);
      if (r) {
        const parts = [`${r.hero.name} quitte l'auberge pour de bon.`];
        if (r.returned.length) parts.push(`${r.returned.length} objet${r.returned.length > 1 ? 's' : ''} rendu${r.returned.length > 1 ? 's' : ''} au sac.`);
        if (r.destroyed.length) parts.push(`${r.destroyed.length} objet${r.destroyed.length > 1 ? 's' : ''} commun${r.destroyed.length > 1 ? 's' : ''} perdu${r.destroyed.length > 1 ? 's' : ''}.`);
        view.flash = parts.join(' ');
      }
      Object.assign(view, { selectedReserve: null, confirmDismiss: false });
    }
    goTo('inn');
  });
}

// Renvoi du compagnon sélectionné : ce que devient son équipement, puis confirmation.
function dismissPanel(hero) {
  const { destroyed, returned } = dismissOutcome(hero);
  const cells = (items) => items.map((item) => `<div class="bag-cell" style="--rc:${RARITIES[item.rarity].color}" title="${esc(itemName(item))}">${iconHtml(itemIcon(item), 32)}</div>`).join('');
  return `
    <div class="inn-dismiss">
      <b>Renvoyer ${esc(hero.name)} ?</b> <small class="hint">Il part pour de bon, avec ses niveaux et ses talents.</small>
      ${returned.length ? `<div class="cells"><small>Rendu au sac :</small>${cells(returned)}</div>` : ''}
      ${destroyed.length ? `<div class="cells"><small>Perdu (communs) :</small>${cells(destroyed)}</div>` : ''}
      <button id="dismiss" class="${view.confirmDismiss ? 'btn-primary' : ''}">${view.confirmDismiss ? `Confirmer : renvoyer ${esc(hero.name)}` : `Renvoyer ${esc(hero.name)}`}</button>
    </div>`;
}

// Vignette d'un héros : portrait, PV et objets portés.
function heroTile(hero, { partyIndex, reserveIndex, picking = false, selected = false }) {
  const cls = getClass(hero);
  const attr = partyIndex !== undefined ? `data-party="${partyIndex}"` : `data-reserve="${reserveIndex}"`;
  const clickable = reserveIndex !== undefined || picking;
  const pv = getStats(hero).pv;
  return `
    <button ${attr} class="inn-hero ${selected ? 'selected' : ''} ${clickable ? 'clickable' : ''}" style="--c:${cls.color}" ${clickable && !rosterLockedReason(state) ? '' : 'disabled'} title="${esc(equipmentTooltip(hero))}">
      ${portrait(`classe:${hero.classKey}`, 3)}
      <span class="inn-hero-info">
        <b>${esc(hero.name)}</b>
        <small>${esc(cls.name)} · niv. ${hero.level}</small>
        <span class="meter hp"><span class="fill" style="width:${Math.round((hero.hp / pv) * 100)}%"></span></span>
        <small>PV ${hero.hp}/${pv}</small>
        <span class="inn-items">${equippedItems(hero).map((item) => iconHtml(itemIcon(item), 16)).join('')}</span>
      </span>
    </button>`;
}
