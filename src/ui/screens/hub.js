// Village : équipe, portails vers les donjons et services.

import { state } from '../../state.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { getClass, getStats } from '../../game/party.js';
import { restAtInn } from '../../game/progression.js';
import { esc, tip, bar } from '../html.js';
import { goTo, showHub } from '../router.js';
import { startEncounter } from '../encounter.js';
import { itemChip } from '../items.js';
import { openEquipment } from './equipment.js';

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
        <button id="forge" ${tip('Décrafte et améliore ton équipement grâce aux matéria. Bientôt disponible.')}>🔨 Forge</button>
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
  app.querySelector('#forge').onclick = () => showHub('La forge est encore froide — bientôt disponible.');
  app.querySelector('#equipBtn').onclick = () => openEquipment();
  app.querySelector('#statsBtn').onclick = () => goTo('stats');
}

function heroMini(hero) {
  const cls = getClass(hero);
  const { pv } = getStats(hero);
  return `
    <div class="card pmini ${hero.alive ? '' : 'dead'}" style="--c:${cls.color}">
      <div class="icon">${cls.icon}</div><div><b>${esc(hero.name)}</b></div>
      <small>${hero.alive ? `PV ${hero.hp}/${pv}` : 'Tombé au combat'}</small>
      ${bar(hero.hp, pv, cls.color)}
    </div>`;
}
