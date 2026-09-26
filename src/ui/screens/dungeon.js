// Expédition : entre deux étages d'un donjon. On y voit la progression et l'état
// de l'équipe, et on choisit de descendre à l'étage suivant ou (après un boss)
// de rentrer au village.

import { state } from '../../state.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { getClass, getStats } from '../../game/party.js';
import { isBossFloor, floorLevel, leaveExpedition, progressOf } from '../../game/dungeon.js';
import { countOf, usableIn, isUntargeted, isValidTarget, useOnMap } from '../../game/consumables.js';
import { esc, tip, bar } from '../html.js';
import { itemChip } from '../items.js';
import { consumableEstimate } from '../format.js';
import { goTo, showHub } from '../router.js';
import { startFloor, lastFloor } from '../encounter.js';
import { openEquipment } from './equipment.js';
import { openTalents } from './talents.js';

// État propre à l'écran : objet en cours d'utilisation (choix de la cible), dernier message.
const view = { pendingItem: null, flash: null };

export function renderDungeon(app) {
  const exp = state.expedition;
  const d = DUNGEONS[exp.dungeonKey];
  const message = view.flash ?? lastFloor.message;
  const loot = view.flash ? [] : lastFloor.loot;
  Object.assign(lastFloor, { message: null, loot: [] });
  view.flash = null;
  const nextIsBoss = isBossFloor(exp.dungeonKey, exp.floor);
  const allDown = state.party.every((h) => !h.alive);

  app.innerHTML = `
    <div class="hero"><h1>${d.icon} ${d.name}</h1><p>Prochain étage : ${exp.floor}/${d.floors} · niveau ${floorLevel(exp.dungeonKey, exp.floor)}</p></div>
    ${message ? `<div class="card notice">${esc(message)}${loot.length ? `<div class="loot">${loot.map(itemChip).join('')}</div>` : ''}</div>` : ''}
    <div class="card floor-track">${floorTrack(exp.dungeonKey, exp.floor)}</div>
    <div class="party-strip">${state.party.map(heroMini).join('')}</div>
    <div class="card section expedition">
      <div class="expedition-info">
        <div>Gains de l'expédition : <b>${exp.gains.gold}</b> or · <b>${exp.gains.xp}</b> XP · <b>${exp.gains.items}</b> objet${exp.gains.items > 1 ? 's' : ''}</div>
      </div>
      ${itemPanel()}
      <div class="actions">
        <button id="nextFloor" class="btn-primary ${nextIsBoss ? 'boss-btn' : ''}" ${allDown ? 'disabled' : ''}>
          ${nextIsBoss ? '☠️ Affronter le boss' : '⚔️ Étage suivant'} (${exp.floor})
        </button>
        <button id="leave" ${exp.canLeave ? '' : 'disabled'}
          ${tip(exp.canLeave ? 'Rentrer au village avec tout le butin.' : "Impossible de fuir : il faut vaincre le prochain boss pour pouvoir rentrer. Mourir coûte de l'or et une partie du sac.")}>
          🏠 Rentrer au village
        </button>
      </div>
      <div class="services">
        <button id="equip">🎒 Équipement (${state.bag.length} dans le sac)</button>
        <button id="talents">📖 Talents</button>
        <button id="stats">📜 Statistiques</button>
      </div>
      ${exp.canLeave ? '' : '<p class="hint">Le seul moyen de rentrer est de vaincre le prochain boss. Les héros tombés restent à terre jusqu\'à une Plume de phénix, une Résurrection ou le retour au village.</p>'}
    </div>
  `;

  app.querySelector('#nextFloor').onclick = () => {
    view.pendingItem = null;
    startFloor();
  };
  app.querySelectorAll('[data-map-item]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.mapItem;
      if (isUntargeted(key) && view.pendingItem !== key) view.pendingItem = key; // demande confirmation
      else if (!isUntargeted(key)) view.pendingItem = view.pendingItem === key ? null : key;
      else return useItem(key);
      goTo('dungeon');
    };
  });
  app.querySelectorAll('[data-item-target]').forEach((btn) => {
    btn.onclick = () => useItem(view.pendingItem, Number(btn.dataset.itemTarget));
  });
  app.querySelector('#leave').onclick = () => {
    const d2 = DUNGEONS[exp.dungeonKey];
    const { gold, xp, items } = exp.gains;
    if (leaveExpedition(state)) {
      showHub(`Retour de ${d2.name} (dernier boss vaincu : étage ${progressOf(state, exp.dungeonKey).checkpoint}). Bilan : ${gold} or, ${xp} XP, ${items} objet${items > 1 ? 's' : ''}.`);
    }
  };
  app.querySelector('#equip').onclick = () => openEquipment();
  app.querySelector('#talents').onclick = () => openTalents();
  app.querySelector('#stats').onclick = () => goTo('stats');
}

function useItem(key, targetIndex) {
  const dungeonName = DUNGEONS[state.expedition.dungeonKey].name;
  const r = useOnMap(state, key, targetIndex);
  view.pendingItem = null;
  if (r.escaped) return showHub(`${r.message} (${dungeonName} : vous pourrez repartir depuis le dernier boss vaincu.)`);
  if (r.ok) view.flash = r.message;
  goTo('dungeon');
}

// Objets utilisables entre deux étages (soins, plume, tente, corde).
function itemPanel() {
  const keys = CONSUMABLE_ORDER.filter((k) => usableIn(k, 'map') && countOf(state.consumables, k) > 0);
  if (!keys.length) return '<p class="hint">Aucun objet utilisable ici (achète potions, tente ou corde chez le Marchand).</p>';
  const pending = view.pendingItem;
  let targets = '';
  if (pending && isUntargeted(pending)) {
    targets = `<button data-map-item="${pending}" class="danger">Confirmer : ${esc(CONSUMABLES[pending].name)} — ${esc(CONSUMABLES[pending].desc)}</button>`;
  } else if (pending) {
    const valid = state.party.map((h, i) => [h, i]).filter(([h]) => isValidTarget(pending, h));
    targets = valid.length
      ? valid.map(([h, i]) => `<button data-item-target="${i}">${h.alive ? 'Cibler' : 'Relever'} ${esc(h.name)} · ${consumableEstimate(pending, h)}</button>`).join('')
      : '<span class="hint">Aucune cible possible.</span>';
  }
  return `
    <div class="map-items">
      <div class="hint">Objets utilisables ici :</div>
      <div class="actions">
        ${keys.map((k) => `<button data-map-item="${k}" class="${pending === k ? 'selected' : ''}" ${tip(CONSUMABLES[k].desc)}>${CONSUMABLES[k].icon} ${CONSUMABLES[k].name} (${countOf(state.consumables, k)})</button>`).join('')}
      </div>
      ${targets ? `<div class="target-zone">${targets}</div>` : ''}
    </div>`;
}

// Frise des étages du palier en cours : étages passés, prochain étage, boss.
function floorTrack(key, next) {
  const d = DUNGEONS[key];
  const first = Math.floor((next - 1) / d.bossEvery) * d.bossEvery + 1;
  const cells = [];
  for (let f = first; f < first + d.bossEvery && f <= d.floors; f++) {
    const cls = f < next ? 'done' : f === next ? 'next' : '';
    cells.push(`<div class="floor ${cls} ${isBossFloor(key, f) ? 'boss' : ''}">${isBossFloor(key, f) ? '☠️' : f}</div>`);
  }
  return `<small>Palier ${Math.floor((next - 1) / d.bossEvery) + 1}/${d.floors / d.bossEvery}</small><div class="floors">${cells.join('')}</div>`;
}

function heroMini(hero) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  return `
    <div class="card pmini ${hero.alive ? '' : 'dead'}" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div><div><b>${esc(hero.name)}</b> <small>niv. ${hero.level}</small></div>
      <small>${hero.alive ? `PV ${hero.hp}/${stats.pv}` : 'Tombé'}</small>
      ${bar(hero.hp, stats.pv, cls.color)}
      <small>${cls.resource.name} ${hero.res}/${stats.resMax}</small>
      ${bar(hero.res, stats.resMax, 'var(--gold)')}
    </div>`;
}
