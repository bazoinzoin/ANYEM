// Difficulté, plein écran : une colonne par difficulté (puissance des ennemis, butin).

import { state } from '../../state.js';
import { DIFFICULTIES, DIFFICULTY_ORDER, REWARDS } from '../../config.js';
import { RARITIES, RARITY_ORDER } from '../../data/items.js';
import { difficultyOf, setDifficulty, lootRules, enemyPower } from '../../game/difficulty.js';
import { esc } from '../html.js';
import { goTo } from '../router.js';
import { iconHtml, DIFFICULTY_ICONS } from '../icons.js';
import { frame, wireFrame } from '../screenFrame.js';

let scroll = 0;

export function renderDifficulty(app) {
  const current = difficultyOf(state);
  app.innerHTML = frame({
    title: 'Difficulté', icon: DIFFICULTY_ICONS[current], layout: 'lay-difficulty', gold: false,
    extras: `<span class="hint">${state.expedition ? 'Impossible de changer de difficulté pendant une expédition.' : `Chances tirées pour chaque ennemi vaincu ; la rareté <b style="color:${RARITIES.divin.color}">Divin</b> ne tombe que sur les boss. L'or et l'expérience ne changent pas.`}</span>`,
    body: DIFFICULTY_ORDER.map((k) => card(k, k === current)).join(''),
  });
  wireFrame(app);
  // Défilement horizontal : garder la position, molette verticale → horizontale.
  const body = app.querySelector('.scr-body');
  body.scrollLeft = scroll;
  body.onscroll = () => { scroll = body.scrollLeft; };
  body.onwheel = (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { body.scrollLeft += e.deltaY; e.preventDefault(); }
  };
  app.querySelectorAll('[data-difficulty]').forEach((btn) => {
    btn.onclick = () => {
      setDifficulty(state, btn.dataset.difficulty);
      goTo('difficulty');
    };
  });
}

const short = (label) => label.split(' ').map((w) => w[0].toUpperCase()).join('');
const pct = (v) => `${Math.round(v * 100)} %`;

// Pas de matéria divine : la case reste vide (pas de tiret).
function weights(w, materia = false) {
  return RARITY_ORDER.map((r) => `<td style="color:${RARITIES[r].color}">${materia && r === 'divin' ? '' : w[r] ? `${w[r]} %` : '—'}</td>`).join('');
}

function card(key, selected) {
  const d = DIFFICULTIES[key];
  const loot = lootRules(key);
  const head = `<thead><tr><th></th>${RARITY_ORDER.map((r) => `<th style="color:${RARITIES[r].color}" title="${RARITIES[r].label}">${short(RARITIES[r].label)}</th>`).join('')}</tr></thead>`;
  const table = (items, materia) => `
      <table class="rarity-table">
        ${head}
        <tbody>
          <tr><th>Équipement</th>${weights(items)}</tr>
          <tr><th>Matéria</th>${weights(materia, true)}</tr>
        </tbody>
      </table>`;
  const amount = ({ min, max }) => (min === max ? `${min}` : `${min} à ${max}`);
  return `
    <section class="win difficulty ${selected ? 'selected' : ''}">
      <h3>${iconHtml(DIFFICULTY_ICONS[key], 32)} ${esc(d.name)}</h3>
      <p>Ennemis : <b>×${String(enemyPower(key)).replace('.', ',')}</b> PV et dégâts${d.maxLevel ? ', <b>tous niveau 50</b>' : ''}</p>
      <p>Mort : ${pct(REWARDS.defeatGoldLossPct)} de l'or, une partie du sac${loot.defeatWornLossChance ? ` <b>et de l'équipement porté</b> (${pct(loot.defeatWornLossChance)} par pièce)` : ''}</p>
      <h4>Monstre normal</h4>
      <ul class="loot-lines">
        <li>Équipement : ${pct(loot.dropChance)} de chances</li>
        <li>Matéria : ${pct(loot.materiaChance)} de chances (${amount(loot.materiaAmount)})</li>
        <li>Consommable : ${pct(loot.consumableChance)} de chances</li>
      </ul>
      ${table(loot.rarityWeights, loot.materiaRarityWeights)}
      <h4>Boss</h4>
      <ul class="loot-lines">
        <li>Équipement : ${loot.bossDrops} garanti${loot.bossDrops > 1 ? 's' : ''} (+1 pour le boss final)</li>
        <li>Matéria : ${amount(loot.bossMateriaAmount)} garanties</li>
        <li>Consommable : ${pct(loot.bossConsumableChance)} de chances</li>
      </ul>
      ${table(loot.bossRarityWeights, loot.bossMateriaRarityWeights)}
      <button data-difficulty="${key}" class="full ${selected ? 'selected' : ''}" ${selected || state.expedition ? 'disabled' : ''}>${selected ? 'Difficulté actuelle' : 'Choisir'}</button>
    </section>`;
}
