// Village : carte à parcourir (ui/villageView.js), où chaque service est un habitant ;
// équipe et raccourcis (équipement, statistiques, stratégie).

import { state } from '../../state.js';
import { getClass, getStats, getSkills, xpToNext } from '../../game/party.js';
import { esc, tip, bar } from '../html.js';
import { goTo } from '../router.js';
import { itemChip } from '../items.js';
import { lastCombatLog } from '../combatLog.js';
import { DIFFICULTIES } from '../../config.js';
import { difficultyOf } from '../../game/difficulty.js';
import { villageCard, bindVillage } from '../villageView.js';
import { openEquipment } from './equipment.js';
import { openForge } from './forge.js';
import { openRunes } from './runes.js';
import { openTalents } from './talents.js';
import { openMerchant } from './merchant.js';
import { openInn } from './inn.js';
import { pointsAvailable } from '../../game/talents.js';

export function renderHub(app) {
  const message = state.hubMessage;
  const loot = state.hubLoot;
  state.hubMessage = null;
  state.hubLoot = [];

  app.innerHTML = `
    <div class="hero"><h1>Village d'Anyem</h1><p>Or : ${state.gold} · Plus haut niveau atteint : ${state.dungeonLvl} · Difficulté : ${DIFFICULTIES[difficultyOf(state)].icon} ${DIFFICULTIES[difficultyOf(state)].name}</p></div>
    ${message ? `<div class="card notice">${esc(message)}${loot.length ? `<div class="loot">${loot.map(itemChip).join('')}</div>` : ''}</div>` : ''}
    ${message ? lastCombatLog(state.lastCombat) : ''}
    ${noSkillNotice()}
    ${villageCard()}
    <div class="party-strip">${state.party.map(heroMini).join('')}</div>
    <div class="card section">
      <div class="services">
        <button id="equipBtn" ${tip("Équipe tes héros avec le butin rapporté des donjons et compare les objets.")}>🎒 Équipement (${state.bag.length} dans le sac)</button>
        <button id="statsBtn" ${tip('Consulte les statistiques détaillées de ton équipe.')}>📜 Statistiques</button>
        <button id="strategyBtn" ${tip('Place tes héros au corps à corps ou à distance.')}>🧭 Stratégie</button>
      </div>
    </div>
  `;

  bindVillage(app, openService);
  app.querySelector('#equipBtn').onclick = () => openEquipment();
  app.querySelector('#statsBtn').onclick = () => goTo('stats');
  app.querySelector('#strategyBtn').onclick = () => goTo('strategy');
}

// Écran ouvert en parlant à un habitant du village (voir data/village.js).
function openService(service) {
  const actions = {
    inn: () => openInn(),
    forge: () => openForge(),
    bank: () => goTo('bank'),
    merchant: () => openMerchant(),
    runes: () => openRunes(),
    talents: () => openTalents(Math.max(0, state.party.findIndex((h) => pointsAvailable(h) > 0))),
    bestiary: () => goTo('bestiary'),
    difficulty: () => goTo('difficulty'),
    portals: () => goTo('portals'),
  };
  actions[service]?.();
}

// Rappel : un héros sans sort doit dépenser son premier point de talent.
function noSkillNotice() {
  const names = state.party.filter((h) => !getSkills(h).length).map((h) => h.name);
  if (!names.length) return '';
  return `<div class="card notice">📖 ${esc(names.join(', '))} ${names.length > 1 ? "n'ont" : "n'a"} encore aucun sort : va au <b>Maître des compétences</b> choisir leur orientation et apprendre leur sort de départ (premier point de talent).</div>`;
}

function heroMini(hero) {
  const cls = getClass(hero);
  const { pv } = getStats(hero);
  return `
    <div class="card pmini ${hero.alive ? '' : 'dead'}" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div><div><b>${esc(hero.name)}</b></div>
      <small>Niv. ${hero.level}${pointsAvailable(hero) ? ` · <span class="badge">${pointsAvailable(hero)} pt</span>` : ''}</small><br>
      <small>${hero.alive ? `PV ${hero.hp}/${pv}` : 'Tombé au combat'}</small>
      ${bar(hero.hp, pv, cls.color)}
      <small class="xp-label">XP ${hero.xp}/${xpToNext(hero.level)}</small>
      ${bar(hero.xp, xpToNext(hero.level), 'var(--gold)')}
    </div>`;
}
