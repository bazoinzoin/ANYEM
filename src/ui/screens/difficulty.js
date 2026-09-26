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
    <p class="hint center">Les chances sont tirées pour chaque ennemi vaincu. Les tableaux donnent la rareté de chaque objet obtenu. La rareté <b style="color:${RARITIES.divin.color}">Divin</b> ne tombe que sur les boss. L'or et l'expérience ne changent pas.</p>
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
  const head = `<thead><tr><th></th>${RARITY_ORDER.map((r) => `<th style="color:${RARITIES[r].color}" title="${RARITIES[r].label}">${short(RARITIES[r].label)}</th>`).join('')}</tr></thead>`;
  const table = (items, materia) => `
      <table class="rarity-table">
        ${head}
        <tbody>
          <tr><th>Équipement</th>${weights(items)}</tr>
          <tr><th>Matéria</th>${weights(materia)}</tr>
        </tbody>
      </table>`;
  const amount = ({ min, max }) => (min === max ? `${min}` : `${min} à ${max}`);
  return `
    <div class="card difficulty ${selected ? 'selected' : ''}">
      <h2>${d.icon} ${d.name}</h2>
      <p>Ennemis : <b>×${String(enemyPower(key)).replace('.', ',')}</b> PV et dégâts</p>
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
      <button data-difficulty="${key}" class="full ${selected ? 'selected' : ''}" ${selected || state.expedition ? 'disabled' : ''}>${selected ? '✔ Difficulté actuelle' : 'Choisir'}</button>
    </div>`;
}
