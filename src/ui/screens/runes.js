// Runomancien, plein écran sans défilement : objets portés et sac (seulement ceux qui ont
// des stats secondaires) en icônes à gauche, fiche et relance d'une stat secondaire au centre.

import { state } from '../../state.js';
import { STATS } from '../../data/stats.js';
import { itemStatLines } from '../../game/items.js';
import { rerollCost, rerollPool, rerollProblem, rerollSecondary } from '../../game/runes.js';
import { esc } from '../html.js';
import { itemName, formatStat } from '../items.js';
import { bagItems } from '../bagView.js';
import { goTo } from '../router.js';
import { iconHtml, GOLD_ICON } from '../icons.js';
import { frame, wireFrame, itemGrid, wireGrid, fitGrids, itemDetail, wornRows, wornItems } from '../screenFrame.js';

const view = { selectedId: null, flash: null };

export function openRunes() {
  Object.assign(view, { selectedId: null, flash: null });
  goTo('runes');
}

// Objets relançables : au moins une secondaire.
const rerollable = (item) => rerollCost(item) !== null;
const refresh = () => goTo('runes');

export function renderRunes(app) {
  const worn = wornItems(rerollable);
  const bag = bagItems(state.bag.filter(rerollable), 'all', null);
  const current = () => [...worn, ...bag].find((i) => i.id === view.selectedId);
  const flash = view.flash;
  view.flash = null;

  app.innerHTML = frame({
    title: 'Runomancien', icon: 165, layout: 'lay-runes',
    extras: flash ? `<p class="scr-flash">${flash}</p>` : '<i class="hint">« Donne-moi une rune, je t\'en graverai une autre. »</i>',
    body: `
      <section class="win">
        <h3>${iconHtml(1920, 16)} Objets portés</h3>
        ${wornRows('runeWorn', rerollable, view.selectedId)}
        <h3>${iconHtml(158, 16)} Sac <small>objets à stats secondaires</small></h3>
        ${itemGrid('runeBag', bag, { selectedId: view.selectedId, empty: 'Aucun objet à stats secondaires dans le sac.' })}
      </section>
      <section class="win detail-panel" id="runeDetail">${panel(current())}</section>`,
  });
  wireFrame(app, () => goTo('hub'));

  const box = app.querySelector('#runeDetail');
  const show = (item) => { box.innerHTML = panel(item); wireReroll(app, item); };
  const handlers = {
    onHover: show,
    onLeave: () => show(current()),
    onSelect: (item) => { view.selectedId = item.id; refresh(); },
    rerender: refresh,
  };
  wireGrid(app, 'runeWorn', worn, handlers);
  wireGrid(app, 'runeBag', bag, handlers);
  wireReroll(app, current());
  fitGrids(app, refresh);
}

function panel(item) {
  if (!item) return '<p class="hint">Choisissez un objet : le Runomancien relance une de ses stats secondaires (nouvelle stat, nouvelle valeur). Les objets communs n\'en ont pas.</p>';
  const cost = rerollCost(item);
  const lines = itemStatLines(item).filter((l) => l.secondary);
  return `
    ${itemDetail(item)}
    <div class="forge-section">
      <h4>Relancer une stat secondaire · <span class="price">${iconHtml(GOLD_ICON, 16)}${cost}</span></h4>
      <p class="hint">Une seule stat change à la fois ; elle peut devenir n'importe quelle stat absente de l'objet, ou ressortir avec une autre valeur.</p>
      ${lines.map((l) => {
        const pool = rerollPool(item, l.stat).map((k) => STATS[k].label).join(', ');
        return `
          <div class="reroll-row">
            <span>${formatStat(l.stat, l.value)}</span>
            <button data-reroll="${l.stat}" ${rerollProblem(state, item, l.stat) ? 'disabled' : ''} title="Résultats possibles : ${esc(pool)}">${iconHtml(165, 16)} Relancer</button>
          </div>`;
      }).join('')}
      ${state.gold < cost ? `<p class="warning">Il vous manque ${cost - state.gold} pièces d'or.</p>` : ''}
    </div>`;
}

function wireReroll(app, item) {
  if (!item) return;
  app.querySelectorAll('[data-reroll]').forEach((btn) => {
    btn.onclick = () => {
      const r = rerollSecondary(state, item, btn.dataset.reroll);
      if (r) view.flash = `${esc(itemName(item))} : <s>${esc(formatStat(r.from.stat, r.from.value))}</s> → <b>${esc(formatStat(r.to.stat, r.to.value))}</b>`;
      view.selectedId = item.id;
      refresh();
    };
  });
}
