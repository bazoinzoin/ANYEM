// Difficulté : puissance des ennemis et butin, au choix au village.

import { state } from '../../state.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../config.js';
import { RARITIES, RARITY_ORDER } from '../../data/items.js';
import { difficultyOf, setDifficulty, lootRules, enemyPower } from '../../game/difficulty.js';
import { goTo, goBack, backLabel } from '../router.js';

export function renderDifficulty(app) {
  const current = difficultyOf(state);
  app.innerHTML = `
    <div class="hero"><h1>⚖️ Difficulté</h1><p>Plus c'est dur, plus les monstres sont puissants… et plus le butin est riche</p></div>
    ${state.expedition ? '<div class="card notice">Impossible de changer de difficulté pendant une expédition.</div>' : ''}
    <div class="difficulty-grid">${DIFFICULTY_ORDER.map((k) => card(k, k === current)).join('')}</div>
    <p class="hint center">L'or et l'expérience ne changent pas. Chances d'objets par ennemi ordinaire ; un boss laisse toujours au moins un équipement peu commun ou mieux.</p>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;
  app.querySelectorAll('[data-difficulty]').forEach((btn) => {
    btn.onclick = () => {
      setDifficulty(state, btn.dataset.difficulty);
      goTo('difficulty');
    };
  });
  app.querySelector('#backHub').onclick = () => goBack();
}

const short = (label) => label.split(' ').map((w) => w[0].toUpperCase()).join('');
const pct = (v) => `${Math.round(v * 100)} %`;

function weights(w) {
  return RARITY_ORDER.map((r) => `<td style="color:${RARITIES[r].color}">${w[r] ? `${w[r]} %` : '—'}</td>`).join('');
}

function card(key, selected) {
  const d = DIFFICULTIES[key];
  const loot = lootRules(key);
  return `
    <div class="card difficulty ${selected ? 'selected' : ''}">
      <h2>${d.icon} ${d.name}</h2>
      <p>Ennemis : <b>×${String(enemyPower(key)).replace('.', ',')}</b> PV et dégâts</p>
      <p>Équipement ${pct(loot.dropChance)} · Matéria ${pct(loot.materiaChance)} · Consommable ${pct(loot.consumableChance)}</p>
      <table class="rarity-table">
        <thead><tr><th></th>${RARITY_ORDER.map((r) => `<th style="color:${RARITIES[r].color}" title="${RARITIES[r].label}">${short(RARITIES[r].label)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th>Équipement</th>${weights(loot.rarityWeights)}</tr>
          <tr><th>Boss</th>${weights(loot.bossRarityWeights)}</tr>
          <tr><th>Matéria</th>${weights(loot.materiaRarityWeights)}</tr>
          <tr><th>Matéria (boss)</th>${weights(loot.bossMateriaRarityWeights)}</tr>
        </tbody>
      </table>
      <button data-difficulty="${key}" class="full ${selected ? 'selected' : ''}" ${selected || state.expedition ? 'disabled' : ''}>${selected ? '✔ Difficulté actuelle' : 'Choisir'}</button>
    </div>`;
}
