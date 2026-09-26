// Équipement : emplacements du héros, sac de l'équipe, comparaison avant d'équiper.

import { state } from '../../state.js';
import { SLOT_ORDER, RARITY_ORDER, RARITIES } from '../../data/items.js';
import { STAT_ORDER } from '../../data/stats.js';
import { getClass, getStats } from '../../game/party.js';
import { equip, unequip, slotsFor, cannotEquipReason, previewEquip } from '../../game/equipment.js';
import { esc } from '../html.js';
import { itemCard, itemMeta, formatStat, slotLabel } from '../items.js';
import { goTo } from '../router.js';
import { statsList } from '../heroStats.js';

// État propre à l'écran (pas de l'état de jeu).
const view = { heroIndex: 0, selected: null }; // selected : { from: 'bag', id } | { from: 'slot', slot }

export function openEquipment(heroIndex = view.heroIndex) {
  view.heroIndex = heroIndex;
  view.selected = null;
  goTo('equipment');
}

export function renderEquipment(app) {
  const hero = state.party[view.heroIndex];
  const cls = getClass(hero);

  app.innerHTML = `
    <div class="hero"><h1>Équipement</h1><p>Sac de l'équipe : ${state.bag.length} objet${state.bag.length > 1 ? 's' : ''}</p></div>
    <div class="hero-tabs">
      ${state.party.map((h, i) => `
        <button data-hero="${i}" class="${i === view.heroIndex ? 'selected' : ''}" style="--c:${getClass(h).color}">
          ${getClass(h).icon} ${esc(h.name)}
        </button>`).join('')}
    </div>
    <div class="equip-layout">
      <div class="card slot-list" style="--c:${cls.color}">
        <h3>${cls.icon} ${esc(hero.name)} <small>— ${cls.name}</small></h3>
        ${SLOT_ORDER.map((slot) => slotRow(hero, slot)).join('')}
        <div class="equip-stats">${statsList(hero)}</div>
      </div>
      <div>
        <div class="card detail">${detailPanel(hero)}</div>
        <div class="card bag">
          <h3>Sac</h3>
          ${bagList(hero)}
        </div>
      </div>
    </div>
    <div class="center"><button id="backHub">← Retour au village</button></div>
  `;

  app.querySelectorAll('[data-hero]').forEach((btn) => {
    btn.onclick = () => openEquipment(Number(btn.dataset.hero));
  });
  app.querySelectorAll('[data-slot]').forEach((row) => {
    row.onclick = () => select({ from: 'slot', slot: row.dataset.slot });
  });
  app.querySelectorAll('[data-item]').forEach((row) => {
    row.onclick = () => select({ from: 'bag', id: row.dataset.item });
  });
  app.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.onclick = () => {
      const item = selectedItem(hero);
      if (equip(hero, state.bag, item, btn.dataset.equip)) select({ from: 'slot', slot: btn.dataset.equip });
    };
  });
  app.querySelector('#unequip')?.addEventListener('click', () => {
    const item = selectedItem(hero);
    if (unequip(hero, state.bag, view.selected.slot)) select({ from: 'bag', id: item.id });
  });
  app.querySelector('#backHub').onclick = () => goTo('hub');
}

function select(selection) {
  view.selected = selection;
  goTo('equipment');
}

function selectedItem(hero) {
  const sel = view.selected;
  if (!sel) return null;
  if (sel.from === 'slot') return hero.equipment[sel.slot] ?? null;
  return state.bag.find((item) => item.id === sel.id) ?? null;
}

function isSelected(sel) {
  const cur = view.selected;
  return !!cur && cur.from === sel.from && (cur.slot ?? cur.id) === (sel.slot ?? sel.id);
}

function slotRow(hero, slot) {
  const item = hero.equipment[slot];
  const selected = isSelected({ from: 'slot', slot }) ? 'selected' : '';
  if (!item) return `<div class="slot-row empty"><span class="slot-name">${slotLabel(slot)}</span><span>— vide —</span></div>`;
  return `
    <button class="slot-row ${selected}" data-slot="${slot}">
      <span class="slot-name">${slotLabel(slot)}</span>
      <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${esc(item.name)}</span>
    </button>`;
}

function bagList(hero) {
  if (!state.bag.length) return '<p class="hint">Le sac est vide. Le butin des donjons arrive ici.</p>';
  const sorted = [...state.bag].sort((a, b) =>
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || b.level - a.level);
  return sorted.map((item) => {
    const usable = !cannotEquipReason(hero, item);
    const selected = isSelected({ from: 'bag', id: item.id }) ? 'selected' : '';
    return `
      <button class="bag-row ${usable ? '' : 'unusable'} ${selected}" data-item="${item.id}">
        <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${esc(item.name)}</span>
        <small>${itemMeta(item)}</small>
      </button>`;
  }).join('');
}

function detailPanel(hero) {
  const item = selectedItem(hero);
  if (!item) return '<p class="hint">Sélectionne un objet équipé ou un objet du sac pour voir ses détails et le comparer.</p>';

  if (view.selected.from === 'slot') {
    return `${itemCard(item)}<div class="actions"><button id="unequip">Retirer (vers le sac)</button></div>`;
  }

  const reason = cannotEquipReason(hero, item);
  if (reason) return `${itemCard(item)}<p class="warning">${esc(hero.name)} ne peut pas l'équiper : ${reason}.</p>`;

  const options = slotsFor(hero, item).map((slot) => {
    const current = hero.equipment[slot];
    return `
      <div class="equip-option">
        <button data-equip="${slot}">Équiper — ${slotLabel(slot)}</button>
        <small>${current ? `remplace ${esc(current.name)}` : 'emplacement vide'}</small>
        ${statDiff(hero, previewEquip(hero, item, slot))}
      </div>`;
  });
  return `${itemCard(item)}${options.join('')}`;
}

// Différence de stats du héros entre maintenant et après l'échange.
function statDiff(hero, preview) {
  if (!preview) return '';
  const before = getStats(hero);
  const after = getStats(preview);
  const changes = STAT_ORDER
    .map((k) => [k, after[k] - before[k]])
    .filter(([, d]) => d !== 0)
    .map(([k, d]) => `<span class="${d > 0 ? 'up' : 'down'}">${formatStat(k, d)}</span>`);
  return `<div class="diff">${changes.length ? changes.join('') : '<span>Aucun changement de stats</span>'}</div>`;
}
