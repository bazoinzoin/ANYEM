// Village, plein écran : la carte à parcourir (ui/villageView.js), où chaque service est
// un habitant, avec l'interface posée dessus (ui/hud.js) : nom du village et or en haut à
// gauche, raccourcis en haut à droite, équipe en bas à gauche, croix et Parler en bas à
// droite, messages dans une fenêtre fermable.

import { state } from '../../state.js';
import { DIFFICULTIES } from '../../config.js';
import { getSkills } from '../../game/party.js';
import { difficultyOf } from '../../game/difficulty.js';
import { pointsAvailable } from '../../game/talents.js';
import { esc } from '../html.js';
import { goTo } from '../router.js';
import { itemChip } from '../items.js';
import { lastCombatLog } from '../combatLog.js';
import { iconHtml, GOLD_ICON, DIFFICULTY_ICONS } from '../icons.js';
import { partyHud, hudButton, toast, wireToast } from '../hud.js';
import { drawPortraits } from '../portraits.js';
import { villageCanvas, villageControls, bindVillage } from '../villageView.js';
import { openEquipment } from './equipment.js';
import { openForge } from './forge.js';
import { openRunes } from './runes.js';
import { openTalents } from './talents.js';
import { openMerchant } from './merchant.js';
import { openInn } from './inn.js';
import { openStats } from './stats.js';

export function renderHub(app) {
  const message = state.hubMessage;
  const loot = state.hubLoot;
  state.hubMessage = null;
  state.hubLoot = [];
  const diff = difficultyOf(state);
  const points = state.party.reduce((n, h) => n + pointsAvailable(h), 0);
  const notice = [
    message ? `<p>${esc(message)}</p>${loot.length ? `<div class="loot">${loot.map(itemChip).join('')}</div>` : ''}${lastCombatLog(state.lastCombat)}` : '',
    noSkillNotice(),
  ].join('');

  app.innerHTML = `
    <div class="map-scr">
      ${villageCanvas()}
      <div class="win hud-title">
        <h2>Village d'Anyem</h2>
        <span>${iconHtml(GOLD_ICON, 16)} ${state.gold.toLocaleString('fr-FR')}</span>
        <span>${iconHtml(DIFFICULTY_ICONS[diff], 16)} ${esc(DIFFICULTIES[diff].name)}</span>
        <span>Plus haut niveau atteint : ${state.dungeonLvl}</span>
      </div>
      <nav class="hud-menu">
        ${hudButton('equipBtn', 1920, 'Personnage', { title: `Équipement et sac (${state.bag.length} objets)` })}
        ${hudButton('talentsBtn', 96, 'Talents', { badge: points })}
        ${hudButton('statsBtn', 610, 'Stats')}
        ${hudButton('strategyBtn', 648, 'Stratégie')}
      </nav>
      ${toast(notice)}
      ${partyHud(state.party)}
      <div class="win hud-controls">${villageControls()}</div>
    </div>`;

  wireToast(app);
  drawPortraits(app);
  bindVillage(app, openService);
  app.querySelector('#equipBtn').onclick = () => openEquipment();
  app.querySelector('#talentsBtn').onclick = () => openTalents(Math.max(0, state.party.findIndex((h) => pointsAvailable(h) > 0)));
  app.querySelector('#statsBtn').onclick = () => openStats();
  app.querySelector('#strategyBtn').onclick = () => goTo('strategy');
  app.querySelectorAll('[data-hud-hero]').forEach((b) => { b.onclick = () => openStats(Number(b.dataset.hudHero)); });
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
  return `<p>${iconHtml(96, 16)} ${esc(names.join(', '))} ${names.length > 1 ? "n'ont" : "n'a"} encore aucun sort : allez voir le <b>Maître des compétences</b> pour choisir leur orientation et apprendre leur sort de départ (premier point de talent).</p>`;
}
