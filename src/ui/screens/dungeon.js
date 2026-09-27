// Expédition, plein écran : carte de l'étage (ui/mapView.js) avec l'interface posée
// dessus (ui/hud.js) : état de l'équipe,
// objets et sorts hors combat, événements, et après un boss le choix entre rentrer
// au village et continuer.

import { state } from '../../state.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { CONSUMABLES, CONSUMABLE_ORDER } from '../../data/consumables.js';
import { getClass, getStats, getSkills } from '../../game/party.js';
import { fieldSkills, castOutOfCombat, cannotCastReason } from '../../game/field.js';
import { healAmount } from '../../game/formulas.js';
import { statusesOf } from '../../game/statuses.js';
import { isBossFloor, floorLevel, subzoneOf, floorInSubzone, leaveExpedition, progressOf, continueExpedition } from '../../game/dungeon.js';
import { DUNGEON } from '../../config.js';
import { countOf, usableIn, isUntargeted, isValidTarget, useOnMap, usedThisTier } from '../../game/consumables.js';
import {
  currentEvent, chooseEvent, skipEvent, cannotChooseReason, choiceCost, eventItemPrice, buyEventItem, buyEventConsumable,
} from '../../game/events.js';
import { EVENTS } from '../../data/events.js';
import { RARITIES } from '../../data/items.js';
import { MERCHANT } from '../../config.js';
import { esc, tip } from '../html.js';
import { itemChip, itemName, itemMeta, itemTooltipText } from '../items.js';
import { consumableEstimate } from '../format.js';
import { goTo, showHub } from '../router.js';
import { lastFloor } from '../encounter.js';
import { mapCanvas, mapControls, bindMap } from '../mapView.js';
import { victorySummary, lastCombatLog } from '../combatLog.js';
import { openEquipment } from './equipment.js';
import { openTalents } from './talents.js';
import { openStats } from './stats.js';
import { pointsAvailable } from '../../game/talents.js';
import { iconHtml, itemIcon, consumableIcon, skillIconIndex, CLASS_ICONS, GOLD_ICON } from '../icons.js';
import { partyHud, hudButton, toast, wireToast } from '../hud.js';
import { drawPortraits } from '../portraits.js';

// État propre à l'écran : objet en cours d'utilisation (choix de la cible), dernier message.
// panel : 'items' | 'spells' | null (menu ouvert entre deux combats) ; caster /
// pendingSpell : sort hors combat en cours de ciblage.
const view = { pendingItem: null, flash: null, flashLoot: [], panel: null, caster: null, pendingSpell: null };

export function renderDungeon(app) {
  const exp = state.expedition;
  const d = DUNGEONS[exp.dungeonKey];
  const message = view.flash ?? lastFloor.message;
  const loot = view.flash ? view.flashLoot : lastFloor.loot;
  const summary = view.flash ? null : lastFloor.summary;
  Object.assign(lastFloor, { message: null, loot: [], summary: null });
  view.flash = null;
  view.flashLoot = [];

  const usableCount = CONSUMABLE_ORDER.reduce((n, k) => n + (usableIn(k, 'map') ? countOf(state.consumables, k) : 0), 0);
  const modal = exp.event ? eventPanel(exp.event) : exp.bossChoice ? bossChoicePanel(d) : '';
  const notice = summary
    ? `${victorySummary(summary)}${message ? `<p><b>${esc(message)}</b></p>` : ''}${lastCombatLog(state.lastCombat)}`
    : message ? `<p>${esc(message)}</p>${loot.length ? `<div class="loot">${loot.map(itemChip).join('')}</div>` : ''}${lastCombatLog(state.lastCombat)}` : '';

  app.innerHTML = `
    <div class="map-scr">
      ${mapCanvas()}
      <div class="win hud-title">
        <h2>${esc(d.name)}</h2>
        <span>${esc(subzoneOf(exp.dungeonKey, exp.floor).name)} · niveau ${floorLevel(exp.dungeonKey, exp.floor)} · ${exp.map.mobs.length} groupe${exp.map.mobs.length > 1 ? 's' : ''}</span>
        ${floorTrack(exp.dungeonKey, exp.floor)}
        <span class="hud-gains">${iconHtml(GOLD_ICON, 16)} ${exp.gains.gold} · ${iconHtml(682, 16)} ${exp.gains.xp} XP · ${iconHtml(1447, 16)} ${exp.gains.items} · ${iconHtml(162, 16)} ${exp.gains.materia}</span>
      </div>
      <nav class="hud-menu">
        ${hudButton('itemsBtn', 276, `Objets (${usableCount})`, { title: 'Utiliser un objet (potion, remède, tente, corde…)' })}
        ${hudButton('spellsBtn', 1057, 'Sorts', { title: 'Lancer un soin ou une purification hors combat' })}
        ${hudButton('equip', 1920, 'Personnage', { title: `Équipement et sac (${state.bag.length} objets)` })}
        ${hudButton('talents', 96, 'Talents', { badge: state.party.reduce((n, h) => n + pointsAvailable(h), 0) })}
        ${hudButton('stats', 610, 'Stats')}
        ${exp.bossChoice ? '' : hudButton('leave', 93, 'Rentrer', { disabled: !exp.canLeave, title: exp.canLeave ? 'Rentrer au village avec tout le butin.' : "Impossible de fuir : il faut vaincre le prochain boss pour pouvoir rentrer. Mourir coûte de l'or et une partie du sac." })}
      </nav>
      ${toast(notice)}
      ${view.panel === 'items' ? `<div class="win hud-panel">${itemPanel()}</div>` : ''}
      ${view.panel === 'spells' ? `<div class="win hud-panel">${spellPanel()}</div>` : ''}
      ${partyHud(state.party, { resource: true })}
      <div class="win hud-controls">${mapControls()}</div>
      ${modal ? `<div class="hud-modal"><div class="win">${modal}</div></div>` : ''}
    </div>`;
  wireToast(app);
  drawPortraits(app);
  app.querySelector('#itemsBtn').classList.toggle('selected', view.panel === 'items');
  app.querySelector('#spellsBtn').classList.toggle('selected', view.panel === 'spells');
  app.querySelectorAll('[data-hud-hero]').forEach((b) => { b.onclick = () => openStats(Number(b.dataset.hudHero)); });

  app.querySelectorAll('[data-event-choice]').forEach((btn) => {
    btn.onclick = () => {
      const r = chooseEvent(state, Number(btn.dataset.eventChoice));
      if (r.ok) Object.assign(view, { flash: r.message, flashLoot: r.loot });
      goTo('dungeon');
    };
  });
  app.querySelector('#eventSkip')?.addEventListener('click', () => {
    const e = currentEvent(state);
    if (skipEvent(state)) view.flash = EVENTS[e.key].kind === 'merchant' ? 'Le marchand ambulant remballe sa marchandise.' : `Vous passez votre chemin (${EVENTS[e.key].name}).`;
    goTo('dungeon');
  });
  app.querySelectorAll('[data-event-buy]').forEach((btn) => {
    btn.onclick = () => {
      if (buyEventItem(state, btn.dataset.eventBuy)) view.flash = 'Achat effectué : l\'objet rejoint le sac.';
      goTo('dungeon');
    };
  });
  app.querySelectorAll('[data-event-consumable]').forEach((btn) => {
    btn.onclick = () => {
      if (buyEventConsumable(state, Number(btn.dataset.eventConsumable))) view.flash = 'Achat effectué.';
      goTo('dungeon');
    };
  });
  app.querySelector('#itemsBtn').onclick = () => {
    Object.assign(view, { panel: view.panel === 'items' ? null : 'items', pendingItem: null });
    goTo('dungeon');
  };
  app.querySelector('#spellsBtn').onclick = () => {
    Object.assign(view, { panel: view.panel === 'spells' ? null : 'spells', caster: null, pendingSpell: null });
    goTo('dungeon');
  };
  app.querySelectorAll('[data-caster]').forEach((btn) => {
    btn.onclick = () => {
      Object.assign(view, { caster: Number(btn.dataset.caster), pendingSpell: null });
      goTo('dungeon');
    };
  });
  app.querySelectorAll('[data-spell]').forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.spell);
      const skill = getSkills(state.party[view.caster])[index];
      if (skill.target === 'ally' && view.pendingSpell !== index) {
        view.pendingSpell = index; // choix de la cible
        return goTo('dungeon');
      }
      if (skill.target !== 'ally' && view.pendingSpell !== index) {
        view.pendingSpell = index; // confirmation
        return goTo('dungeon');
      }
      castSpell(index, view.caster);
    };
  });
  app.querySelectorAll('[data-spell-target]').forEach((btn) => {
    btn.onclick = () => castSpell(view.pendingSpell, Number(btn.dataset.spellTarget));
  });
  bindMap(app);
  app.querySelector('#continue')?.addEventListener('click', () => {
    if (continueExpedition(state)) view.flash = `L'équipe reprend son souffle (+${DUNGEON.continueRegenPct} % de PV et de ressource) et s'enfonce dans ${d.name}.`;
    goTo('dungeon');
  });
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
  app.querySelector('#leave')?.addEventListener('click', () => {
    const d2 = DUNGEONS[exp.dungeonKey];
    const { gold, xp, items, materia } = exp.gains;
    if (leaveExpedition(state)) {
      showHub(`Retour de ${d2.name} (dernière sous-zone terminée : ${subzoneOf(exp.dungeonKey, progressOf(state, exp.dungeonKey).checkpoint).name}). Bilan : ${gold} or, ${xp} XP, ${items} équipement${items > 1 ? 's' : ''}, ${materia} matéria.`);
    }
  });
  app.querySelector('#equip').onclick = () => openEquipment();
  app.querySelector('#talents').onclick = () => openTalents();
  app.querySelector('#stats').onclick = () => openStats();
}

// Après un boss : rentrer au village ou continuer.
function bossChoicePanel(d) {
  return `
    <h3>${iconHtml(745, 32)} Le boss est vaincu</h3>
    <p>Rentrer au village avec tout le butin, ou continuer ${esc(d.name)} ? Continuer rend <b>${DUNGEON.continueRegenPct} %</b> des PV et de la ressource aux héros en vie, mais il faudra ensuite vaincre le prochain boss pour pouvoir rentrer.</p>
    <div class="actions">
      <button id="leave" class="gold">${iconHtml(93, 16)} Rentrer au village</button>
      <button id="continue" class="btn-primary">${iconHtml(726, 16)} Continuer (+${DUNGEON.continueRegenPct} %)</button>
    </div>`;
}

function castSpell(skillIndex, targetIndex) {
  const r = castOutOfCombat(state, view.caster, skillIndex, targetIndex);
  view.pendingSpell = null;
  if (r.ok) view.flash = r.message;
  goTo('dungeon');
}

// Sorts hors combat : d'abord le héros (grisé s'il n'a aucun soin ni purification),
// puis ses sorts utilisables, puis la cible.
function spellPanel() {
  const heroes = state.party.map((h, i) => {
    const usable = h.alive && fieldSkills(h).length > 0;
    return `<button data-caster="${i}" class="${view.caster === i ? 'selected' : ''}" ${usable ? '' : 'disabled'} ${tip(usable ? 'Voir ses sorts utilisables hors combat.' : h.alive ? 'Aucun soin ni purification.' : 'Tombé au combat.')}>${iconHtml(CLASS_ICONS[h.classKey], 16)} ${esc(h.name)}</button>`;
  }).join('');
  let spells = '';
  if (view.caster !== null) {
    const caster = state.party[view.caster];
    const stats = getStats(caster);
    spells = fieldSkills(caster).map(({ skill, index }) => {
      const reason = cannotCastReason(state, view.caster, skill);
      const effect = [skill.kind === 'heal' ? `soin ~${healAmount(stats, skill.power, skill.physHeal)} PV` : '', skill.cleanse ? 'retire les effets négatifs' : '']
        .filter(Boolean).join(', ');
      const who = skill.target === 'allAllies' ? " (toute l'équipe)" : skill.target === 'self' ? ' (soi-même)' : '';
      return `<button data-spell="${index}" class="${view.pendingSpell === index ? 'selected' : ''}" ${reason ? `disabled ${tip(reason)}` : ''}>${iconHtml(skillIconIndex(skill), 16)} ${esc(skill.name)} · ${skill.cost} ${getClass(caster).resource.name} · ${effect}${who}</button>`;
    }).join('');
    const pending = view.pendingSpell !== null ? getSkills(caster)[view.pendingSpell] : null;
    if (pending?.target === 'ally') {
      spells += `<div class="target-zone">${state.party.map((h, i) => (h.alive ? `<button data-spell-target="${i}">Cibler ${esc(h.name)} · PV ${h.hp}/${getStats(h).pv}${statusesOf(h).some((st) => st.kind === 'debuff') ? ' · affaibli' : ''}</button>` : '')).join('')}</div>`;
    } else if (pending) {
      spells += `<div class="target-zone"><button data-spell="${view.pendingSpell}" class="danger">Confirmer : ${esc(pending.name)}</button></div>`;
    }
  }
  return `
    <div class="map-items">
      <div class="hint">Qui lance un sort ? (seuls les soins et les purifications marchent hors combat)</div>
      <div class="actions">${heroes}</div>
      ${spells ? `<div class="actions">${spells}</div>` : ''}
    </div>`;
}

function useItem(key, targetIndex) {
  const dungeonName = DUNGEONS[state.expedition.dungeonKey].name;
  const r = useOnMap(state, key, targetIndex);
  view.pendingItem = null;
  if (r.escaped) return showHub(`${r.message} (${dungeonName} : vous pourrez repartir depuis le dernier boss vaincu.)`);
  if (r.ok || r.message) view.flash = r.message;
  goTo('dungeon');
}

// Objets utilisables pendant l'exploration (soins, plume, tente, corde).
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
        ${keys.map((k) => `<button data-map-item="${k}" class="${pending === k ? 'selected' : ''}" ${tip(usedThisTier(state, k) ? `${CONSUMABLES[k].desc} Déjà utilisée dans ce palier.` : CONSUMABLES[k].desc)} ${usedThisTier(state, k) ? 'disabled' : ''}>${iconHtml(consumableIcon(k), 16)} ${esc(CONSUMABLES[k].name)} (${countOf(state.consumables, k)})</button>`).join('')}
      </div>
      ${targets ? `<div class="target-zone">${targets}</div>` : ''}
    </div>`;
}

// Frise des étages de la sous-zone en cours : étages passés, prochain étage, boss.
function floorTrack(key, next) {
  const d = DUNGEONS[key];
  const first = Math.floor((next - 1) / d.bossEvery) * d.bossEvery + 1;
  const cells = [];
  for (let f = first; f < first + d.bossEvery && f <= d.floors; f++) {
    const cls = f < next ? 'done' : f === next ? 'next' : '';
    cells.push(`<div class="floor ${cls} ${isBossFloor(key, f) ? 'boss' : ''}">${isBossFloor(key, f) ? iconHtml(745, 16) : floorInSubzone(f)}</div>`);
  }
  return `<div class="floors" title="Sous-zone ${Math.floor((next - 1) / d.bossEvery) + 1}/${d.subzones.length}">${cells.join('')}</div>`;
}



// ---- Événements ----

// Texte d'une issue : « 50 % : objet peu commun ou mieux », « 50 % : 2 héros au hasard perdent 30 % de leurs PV max ».
function outcomeText(outcome, level) {
  const e = outcome.effects;
  const scaled = (v) => Math.round((v.base ?? 0) + (v.perLevel ?? 0) * level);
  const parts = [];
  if (e.gold) parts.push(`+${scaled(e.gold)} or`);
  if (e.item) parts.push(`un équipement ${RARITIES[e.item.minRarity].label.toLowerCase()} ou mieux`);
  if (e.materia) parts.push(`${e.materia.amount} matéria ${RARITIES[e.materia.rarity].label.toLowerCase()}${e.materia.amount > 1 ? 's' : ''}`);
  if (e.consumable) parts.push(e.consumable === 'random' ? 'un consommable' : CONSUMABLES[e.consumable].name);
  if (e.restoreAll) parts.push(`+${e.restoreAll} % de PV et de ressource à l'équipe`);
  if (e.hurtRandom) parts.push(`${e.hurtRandom.count} héros au hasard perd${e.hurtRandom.count > 1 ? 'ent' : ''} ${e.hurtRandom.pct} % de ${e.hurtRandom.count > 1 ? 'leurs' : 'ses'} PV max`);
  if (e.hurtAll) parts.push(`chaque héros perd ${e.hurtAll} % de ses PV max`);
  return `${outcome.chance} % : ${parts.length ? parts.join(', ') : 'rien'}`;
}

function eventPanel(event) {
  const def = EVENTS[event.key];
  const body = def.kind === 'merchant' ? merchantBody(event) : `
    <div class="event-choices">
      ${def.choices.map((c, i) => {
        const cost = choiceCost(c, event.level);
        const costText = [cost.gold ? `${cost.gold} or` : '', cost.consumable ? `1 ${CONSUMABLES[cost.consumable].name}` : ''].filter(Boolean).join(', ');
        const reason = cannotChooseReason(state, i);
        return `
          <div class="event-choice">
            <button data-event-choice="${i}" class="btn-primary" ${reason ? `disabled ${tip(reason)}` : ''}>${esc(c.label)}${costText ? ` (coût : ${costText})` : ''}</button>
            <ul>${c.outcomes.map((o) => `<li>${esc(outcomeText(o, event.level))}</li>`).join('')}</ul>
          </div>`;
      }).join('')}
    </div>`;
  return `
    <div class="event">
      <h3>${iconHtml(def.kind === 'merchant' ? 157 : 96, 32)} ${esc(def.name)}</h3>
      <p>${esc(def.text)}</p>
      ${body}
      <button id="eventSkip">${def.kind === 'merchant' ? 'Partir' : 'Passer son chemin'}</button>
      <p class="hint">Il faut régler cet événement avant de reprendre l'exploration.</p>
    </div>`;
}

function merchantBody(event) {
  const items = event.stock.length ? event.stock.map((item) => {
    const price = eventItemPrice(item);
    return `
      <div class="bag-row" ${tip(itemTooltipText(item))}>
        <span class="rarity-text" style="--rc:${RARITIES[item.rarity].color}">${iconHtml(itemIcon(item), 16)} ${esc(itemName(item))}</span>
        <small>${itemMeta(item)}</small>
        <button data-event-buy="${item.id}" ${state.gold >= price ? '' : 'disabled'}>Acheter (${price} or)</button>
      </div>`;
  }).join('') : '<p class="hint">Plus d\'équipement à vendre.</p>';
  const consumables = event.consumables.map((o, i) => `
    <button data-event-consumable="${i}" ${state.gold >= o.price && countOf(state.consumables, o.key) < MERCHANT.maxConsumable ? '' : 'disabled'} ${tip(CONSUMABLES[o.key].desc)}>
      ${iconHtml(consumableIcon(o.key), 16)} ${esc(CONSUMABLES[o.key].name)} (${o.price} or, au lieu de ${CONSUMABLES[o.key].price})
    </button>`).join('');
  return `
    <p>Or : <b>${state.gold}</b></p>
    <div class="event-stock">${items}</div>
    ${consumables ? `<div class="actions">${consumables}</div>` : ''}`;
}
