// Bestiaire, plein écran : un onglet par zone, les créatures en portraits (silhouette
// pour celles jamais rencontrées), la fiche de la créature survolée ou choisie à droite.

import { state } from '../../state.js';
import { DIFFICULTIES } from '../../config.js';
import { ENEMIES } from '../../data/enemies.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { STATS } from '../../data/stats.js';
import { enemyStats } from '../../game/enemies.js';
import { difficultyOf, enemyPower, difficultyLevel } from '../../game/difficulty.js';
import { bestiaryOf, bestiaryPages, bestiaryProgress, isDiscovered, levelRange } from '../../game/bestiary.js';
import { isUnlocked } from '../../game/dungeon.js';
import { esc } from '../html.js';
import { skillEffectLabel } from '../format.js';
import { goTo } from '../router.js';
import { iconHtml, skillIconIndex, DIFFICULTY_ICONS, POSITION_ICONS } from '../icons.js';
import { frame, wireFrame } from '../screenFrame.js';
import { portrait, drawPortraits } from '../portraits.js';

const view = { dungeon: null, enemy: null };

const ABILITY_TARGETS = { hero: 'un héros', allHeroes: "toute l'équipe", self: 'lui-même', allAllies: 'ses alliés' };

export function renderBestiary(app) {
  const pages = bestiaryPages();
  const page = pages.find((p) => p.dungeonKey === view.dungeon) ?? pages[0];
  const { found, total } = bestiaryProgress(state);
  const diff = difficultyOf(state);
  const power = enemyPower(diff);
  if (!page.enemies.includes(view.enemy)) view.enemy = page.enemies.find((k) => isDiscovered(state, k)) ?? null;

  app.innerHTML = frame({
    title: 'Bestiaire', icon: 96, layout: 'lay-bestiary', gold: false,
    extras: `${pages.map((p) => {
      const d = DUNGEONS[p.dungeonKey];
      const n = p.enemies.filter((k) => isDiscovered(state, k)).length;
      return `<button class="tab ${p === page ? 'selected' : ''}" data-zone="${p.dungeonKey}">${isUnlocked(state, p.dungeonKey) || n ? esc(d.name) : '???'} <small>${n}/${p.enemies.length}</small></button>`;
    }).join('')}<span class="hint">${found} / ${total} découvertes</span>`,
    body: `
      <section class="win">
        <p class="hint">Stats en difficulté ${iconHtml(DIFFICULTY_ICONS[diff], 16)} ${esc(DIFFICULTIES[diff].name)}, du niveau le plus bas au plus haut où l'on croise la créature.</p>
        <div class="beast-grid">${page.enemies.map((k) => tile(k)).join('')}</div>
      </section>
      <section class="win detail-panel" id="beastDetail">${card(view.enemy, page.dungeonKey, power)}</section>`,
  });
  wireFrame(app);
  drawPortraits(app);
  app.querySelectorAll('[data-zone]').forEach((btn) => {
    btn.onclick = () => { view.dungeon = btn.dataset.zone; view.enemy = null; goTo('bestiary'); };
  });
  const box = app.querySelector('#beastDetail');
  app.querySelectorAll('[data-enemy]').forEach((el) => {
    const key = el.dataset.enemy;
    el.onmouseenter = () => { box.innerHTML = card(key, page.dungeonKey, power); };
    el.onmouseleave = () => { box.innerHTML = card(view.enemy, page.dungeonKey, power); };
    el.onclick = () => { view.enemy = key; goTo('bestiary'); };
  });
}

function tile(key) {
  const def = ENEMIES[key];
  const known = isDiscovered(state, key);
  return `
    <button class="beast ${known ? '' : 'unknown'} ${def.boss ? 'boss' : ''} ${view.enemy === key ? 'selected' : ''}" data-enemy="${key}">
      ${portrait(`ennemi:${key}`, 3)}
      <span>${known ? esc(def.name) : '???'}</span>
    </button>`;
}

function card(key, dungeonKey, power) {
  if (!key) return '<p class="hint">Survolez une créature pour voir sa fiche.</p>';
  const def = ENEMIES[key];
  if (!isDiscovered(state, key)) return `<h3>???</h3><p class="hint">${def.boss ? 'Un boss' : 'Une créature'} encore jamais rencontré${def.boss ? '' : 'e'}.</p>`;
  const range = levelRange(dungeonKey, key);
  const diff = difficultyOf(state);
  const minLevel = difficultyLevel(diff, range.minLevel);
  const maxLevel = difficultyLevel(diff, range.maxLevel);
  const lo = enemyStats(key, minLevel, power);
  const hi = enemyStats(key, maxLevel, power);
  const row = (stat, label = STATS[stat].label) => `<tr><th>${label}</th><td>${lo[stat]}</td><td>→ ${hi[stat]}</td></tr>`;
  const { seen, kills } = bestiaryOf(state)[key];
  const traits = [
    def.boss ? 'Boss' : null,
    def.elite ? 'Élite' : null,
    `${iconHtml(def.ranged ? POSITION_ICONS.ranged : POSITION_ICONS.melee, 16)} ${def.ranged ? 'À distance' : 'Corps à corps'}`,
    def.magic ? 'Attaque magique' : 'Attaque physique',
    def.riposte ? `Riposte ${def.riposte} %` : null,
  ].filter(Boolean);
  return `
    <div class="beast-head">${portrait(`ennemi:${key}`, 3)}<div><h3>${esc(def.name)}</h3><p class="hint">${traits.join(' · ')}</p><p class="hint">Niveau ${minLevel} à ${maxLevel} · rencontré ${seen} fois · vaincu ${kills} fois</p></div></div>
    <table class="bestiary-stats">${row('pv')}${row('atq')}${row('def')}${row('defMag')}<tr><th>Vitesse</th><td colspan="2">${def.vit.min} à ${def.vit.max}</td></tr></table>
    ${def.abilities?.length ? `
      <h4>Capacités</h4>
      <div class="skill-list">${def.abilities.map(({ chance, skill }) => `
        <div class="skill-item">${iconHtml(skillIconIndex(skill), 32)}<div><b>${esc(skill.name)}</b> <small>(${Math.round(chance * 100)} % par tour)</small><br>
        <small>Niv. ${maxLevel} : ${esc(skillEffectLabel(hi, { ...skill, target: null }))} — ${ABILITY_TARGETS[skill.target]}</small></div></div>`).join('')}
      </div>` : '<p class="hint">Aucune capacité spéciale : attaque de base.</p>'}`;
}
