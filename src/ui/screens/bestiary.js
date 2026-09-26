// Bestiaire : fiches des ennemis rencontrés, page vide pour les autres.

import { state } from '../../state.js';
import { DIFFICULTIES } from '../../config.js';
import { ENEMIES } from '../../data/enemies.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { STATS } from '../../data/stats.js';
import { enemyStats } from '../../game/enemies.js';
import { difficultyOf, enemyPower } from '../../game/difficulty.js';
import { bestiaryOf, bestiaryPages, bestiaryProgress, isDiscovered, levelRange } from '../../game/bestiary.js';
import { isUnlocked } from '../../game/dungeon.js';
import { esc } from '../html.js';
import { skillEffectLabel } from '../format.js';
import { goTo, goBack, backLabel } from '../router.js';

const view = { dungeon: null };

const ABILITY_TARGETS = {
  hero: 'un héros',
  allHeroes: "toute l'équipe",
  self: 'lui-même',
  allAllies: 'ses alliés',
};

export function renderBestiary(app) {
  const pages = bestiaryPages();
  const page = pages.find((p) => p.dungeonKey === view.dungeon) ?? pages[0];
  const { found, total } = bestiaryProgress(state);
  const diff = difficultyOf(state);

  app.innerHTML = `
    <div class="hero"><h1>📚 Bestiaire</h1><p>${found} / ${total} créatures découvertes</p></div>
    <div class="tabs">
      ${pages.map((p) => {
        const d = DUNGEONS[p.dungeonKey];
        const n = p.enemies.filter((k) => isDiscovered(state, k)).length;
        return `<button data-page="${p.dungeonKey}" class="${p === page ? 'selected' : ''}">${d.icon} ${isUnlocked(state, p.dungeonKey) || n ? esc(d.name) : '???'} <small>(${n}/${p.enemies.length})</small></button>`;
      }).join('')}
    </div>
    <p class="hint">Stats au niveau le plus bas et le plus haut où l'on croise la créature dans cette zone, en difficulté ${DIFFICULTIES[diff].icon} ${DIFFICULTIES[diff].name}.</p>
    <div class="bestiary-grid">${page.enemies.map((k) => enemyCard(k, page.dungeonKey, enemyPower(diff))).join('')}</div>
    <div class="center"><button id="backHub">${backLabel()}</button></div>
  `;
  app.querySelectorAll('[data-page]').forEach((btn) => {
    btn.onclick = () => {
      view.dungeon = btn.dataset.page;
      goTo('bestiary');
    };
  });
  app.querySelector('#backHub').onclick = () => goBack();
}

function enemyCard(key, dungeonKey, power) {
  const def = ENEMIES[key];
  if (!isDiscovered(state, key)) {
    return `<div class="card bestiary-card unknown"><div class="big-icon">❔</div><h3>???</h3><p class="hint">${def.boss ? 'Un boss' : 'Une créature'} encore jamais rencontré${def.boss ? '' : 'e'}.</p></div>`;
  }
  const { minLevel, maxLevel } = levelRange(dungeonKey, key);
  const lo = enemyStats(key, minLevel, power);
  const hi = enemyStats(key, maxLevel, power);
  const row = (stat, label = STATS[stat].label) => `<tr><th>${label}</th><td>${lo[stat]}</td><td>→ ${hi[stat]}</td></tr>`;
  const { seen, kills } = bestiaryOf(state)[key];
  const traits = [
    def.boss ? '👑 Boss' : null,
    def.elite ? '⭐ Élite' : null,
    def.ranged ? '🏹 À distance' : '⚔️ Corps à corps',
    def.magic ? '✨ Attaque magique' : '🗡️ Attaque physique',
    def.riposte ? `↩️ Riposte ${def.riposte} %` : null,
  ].filter(Boolean);
  return `
    <div class="card bestiary-card ${def.boss ? 'boss' : ''}">
      <div class="big-icon">${def.icon}</div>
      <h3>${esc(def.name)}</h3>
      <p class="hint">${traits.join(' · ')}</p>
      <p class="hint">Niveau ${minLevel} à ${maxLevel}</p>
      <table class="bestiary-stats">
        ${row('pv')}${row('atq')}${row('def')}${row('defMag')}
        <tr><th>Vitesse</th><td colspan="2">${def.vit.min} à ${def.vit.max}</td></tr>
      </table>
      ${def.abilities?.length ? `
        <h4>Capacités</h4>
        <ul class="abilities">${def.abilities.map(({ chance, skill }) => `
          <li><b>${esc(skill.name)}</b> <small>(${Math.round(chance * 100)} % par tour)</small><br>
          <small>Niv. ${maxLevel} : ${esc(skillEffectLabel(hi, { ...skill, target: null }))} — ${ABILITY_TARGETS[skill.target]}</small></li>`).join('')}
        </ul>` : '<p class="hint">Aucune capacité spéciale : attaque de base.</p>'}
      <p class="hint">Rencontré ${seen} fois · vaincu ${kills} fois</p>
    </div>`;
}
