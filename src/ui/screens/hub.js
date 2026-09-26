// Village : équipe, portails vers les donjons et services.

import { state } from '../../state.js';
import { DUNGEONS, DUNGEON_ORDER, FLOORS_PER_SUBZONE } from '../../data/dungeons.js';
import { isUnlocked, progressOf, startFloors, startExpedition } from '../../game/dungeon.js';
import { getClass, getStats, getSkills, xpToNext } from '../../game/party.js';
import { esc, tip, bar } from '../html.js';
import { goTo } from '../router.js';
import { startFloor } from '../encounter.js';
import { itemChip } from '../items.js';
import { lastCombatLog } from '../combatLog.js';
import { DIFFICULTIES } from '../../config.js';
import { difficultyOf } from '../../game/difficulty.js';
import { bestiaryProgress } from '../../game/bestiary.js';
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
    <div class="party-strip">${state.party.map(heroMini).join('')}</div>
    <div class="card">
      <h2>Portails</h2>
      <p class="hint">Chaque zone compte 3 sous-zones de ${FLOORS_PER_SUBZONE} étages ; un boss garde le dernier étage de chaque sous-zone. On ne peut rentrer qu'après avoir vaincu un boss ; mourir coûte de l'or et une partie du sac. Chaque boss vaincu ouvre la sous-zone suivante comme point de départ.</p>
      <div class="portals">${DUNGEON_ORDER.map(portal).join('')}</div>
    </div>
    <div class="card section">
      <h2>Services</h2>
      <div class="services">
        <button id="inn" ${tip("Repos gratuit, recrutement de nouveaux compagnons et gestion de l'équipe.")}>🛏️ Auberge${state.reserve?.length ? ` (${state.reserve.length} au repos)` : ''}</button>
        <button id="bank" ${tip("Mets à l'abri ton or, tes objets, tes consommables et tes matéria.")}>🏦 Banque</button>
        <button id="merchant" ${tip('Revends ton butin, achète potions, élixirs et équipement.')}>🛒 Marchand</button>
        <button id="forge" ${tip("Décrafte le butin en matéria, améliore ton équipement jusqu'à +5 et fabrique de nouveaux objets.")}>🔨 Forge</button>
        <button id="runesBtn" ${tip("Relance une stat secondaire d'un objet contre de l'or.")}>🔮 Runomancien</button>
        <button id="talentsBtn" ${tip('Répartis les points de talent de tes héros dans leurs arbres de compétences.')}>📖 Maître des compétences${talentPoints() ? ` <span class="badge">${talentPoints()}</span>` : ''}</button>
        <button id="equipBtn" ${tip("Équipe tes héros avec le butin rapporté des donjons et compare les objets.")}>🎒 Équipement (${state.bag.length} dans le sac)</button>
        <button id="statsBtn" ${tip('Consulte les statistiques détaillées de ton équipe.')}>📜 Statistiques</button>
        <button id="difficultyBtn" ${tip('Choisis la difficulté : monstres plus puissants, mais meilleur butin.')}>⚖️ Difficulté : ${DIFFICULTIES[difficultyOf(state)].name}</button>
        <button id="bestiaryBtn" ${tip('Les créatures rencontrées : stats, capacités, nombre de victoires.')}>📚 Bestiaire (${bestiaryProgress(state).found}/${bestiaryProgress(state).total})</button>
        <button id="strategyBtn" ${tip('Place tes héros au corps à corps ou à distance.')}>🧭 Stratégie</button>
      </div>
    </div>
  `;

  app.querySelectorAll('[data-dungeon]').forEach((btn) => {
    btn.onclick = () => {
      if (startExpedition(state, btn.dataset.dungeon, Number(btn.dataset.floor))) startFloor();
    };
  });
  app.querySelector('#inn').onclick = () => openInn();
  app.querySelector('#bank').onclick = () => goTo('bank');
  app.querySelector('#merchant').onclick = () => openMerchant();
  app.querySelector('#forge').onclick = () => openForge();
  app.querySelector('#runesBtn').onclick = () => openRunes();
  app.querySelector('#equipBtn').onclick = () => openEquipment();
  app.querySelector('#talentsBtn').onclick = () => openTalents(Math.max(0, state.party.findIndex((h) => pointsAvailable(h) > 0)));
  app.querySelector('#statsBtn').onclick = () => goTo('stats');
  app.querySelector('#strategyBtn').onclick = () => goTo('strategy');
  app.querySelector('#difficultyBtn').onclick = () => goTo('difficulty');
  app.querySelector('#bestiaryBtn').onclick = () => goTo('bestiary');
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

function talentPoints() {
  return state.party.reduce((sum, h) => sum + pointsAvailable(h), 0);
}
