// Village : équipe, portails vers les donjons et services.

import { state } from '../../state.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { getClass, getStats, xpToNext } from '../../game/party.js';
import { restAtInn } from '../../game/progression.js';
import { esc, tip, bar } from '../html.js';
import { goTo, showHub } from '../router.js';
import { startEncounter } from '../encounter.js';
import { itemChip } from '../items.js';
import { openEquipment } from './equipment.js';
import { openForge } from './forge.js';
import { openTalents } from './talents.js';
import { pointsAvailable } from '../../game/talents.js';

export function renderHub(app) {
  const message = state.hubMessage;
  const loot = state.hubLoot;
  state.hubMessage = null;
  state.hubLoot = [];

  app.innerHTML = `
    <div class="hero"><h1>Village d'Anyem</h1><p>Or : ${state.gold} · Donjon actuel : niveau ${state.dungeonLvl}</p></div>
    ${message ? `<div class="card notice">${esc(message)}${loot.length ? `<div class="loot">${loot.map(itemChip).join('')}</div>` : ''}</div>` : ''}
    <div class="party-strip">${state.party.map(heroMini).join('')}</div>
    <div class="card">
      <h2>Portails</h2>
      <div class="portals">
        ${Object.entries(DUNGEONS).map(([key, d]) => `
          <button class="card portal" data-dungeon="${key}">
            <h3>${d.icon} ${d.name} — Niveau ${state.dungeonLvl}</h3><p>${d.desc}</p>
          </button>`).join('')}
      </div>
    </div>
    <div class="card section">
      <h2>Services</h2>
      <div class="services">
        <button id="inn" ${tip("Soigne entièrement les PV et les ressources de toute l'équipe, gratuitement.")}>🛏️ Auberge — Se reposer (gratuit)</button>
        <button id="merchant" ${tip('Achète et vend équipement, potions et consommables. Bientôt disponible.')}>🛒 Marchand</button>
        <button id="forge" ${tip("Décrafte le butin en matéria et améliore ton équipement jusqu'à +5.")}>🔨 Forge</button>
        <button id="talentsBtn" ${tip('Répartis les points de talent de tes héros dans leurs arbres de compétences.')}>📖 Maître des compétences${talentPoints() ? ` <span class="badge">${talentPoints()}</span>` : ''}</button>
        <button id="equipBtn" ${tip("Équipe tes héros avec le butin rapporté des donjons et compare les objets.")}>🎒 Équipement (${state.bag.length} dans le sac)</button>
        <button id="statsBtn" ${tip('Consulte les statistiques détaillées de ton équipe.')}>📜 Statistiques</button>
      </div>
    </div>
  `;

  app.querySelectorAll('[data-dungeon]').forEach((btn) => {
    btn.onclick = () => startEncounter(btn.dataset.dungeon);
  });
  app.querySelector('#inn').onclick = () => showHub(restAtInn(state).message);
  app.querySelector('#merchant').onclick = () => showHub('Le marchand prépare son étal — bientôt disponible.');
  app.querySelector('#forge').onclick = () => openForge();
  app.querySelector('#equipBtn').onclick = () => openEquipment();
  app.querySelector('#talentsBtn').onclick = () => openTalents(Math.max(0, state.party.findIndex((h) => pointsAvailable(h) > 0)));
  app.querySelector('#statsBtn').onclick = () => goTo('stats');
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

function talentPoints() {
  return state.party.reduce((sum, h) => sum + pointsAvailable(h), 0);
}
