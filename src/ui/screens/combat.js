// Écran de combat. Le ciblage est toujours demandé explicitement,
// même s'il ne reste qu'une seule cible possible.

import { state } from '../../state.js';
import { DUNGEONS } from '../../data/dungeons.js';
import { getClass, getStats } from '../../game/party.js';
import { estimateDamage } from '../../game/formulas.js';
import { targetsFor } from '../../game/combat.js';
import { esc, tip, bar, range } from '../html.js';
import { skillEffectLabel, skillShortEstimate } from '../format.js';
import { playerAction } from '../encounter.js';

export function renderCombat(app) {
  const cb = state.combat;
  const acting = cb.acting;
  const activeHero = acting?.side === 'hero' ? acting.unit : null;

  app.innerHTML = `
    <div class="hero"><h1>⚔️ Combat</h1><p>${DUNGEONS[cb.dungeonKey].name} — Niveau ${cb.level}</p></div>
    <div class="combatants">
      <div>
        <h3 class="side-title">VOTRE ÉQUIPE</h3>
        ${cb.party.map((h) => heroUnit(h, h === acting?.unit)).join('')}
      </div>
      <div>
        <h3 class="side-title">ENNEMIS</h3>
        ${cb.enemies.map((e) => enemyUnit(e, e === acting?.unit)).join('')}
      </div>
    </div>
    <div class="log">${cb.log.map((l) => `<div class="${l.hit ? 'hit' : ''}">${esc(l.text)}</div>`).join('')}</div>
    ${activeHero ? actionPanel(activeHero) : waitingPanel(acting)}
  `;

  if (activeHero) wireActions(app, activeHero);
}

function heroUnit(hero, active) {
  const cls = getClass(hero);
  const stats = getStats(hero);
  const res = cls.resource.name;
  return `
    <div class="unit ${hero.alive ? '' : 'dead'} ${active ? 'active-turn' : ''}" style="--c:${cls.color}">
      <div class="row1"><b>${cls.icon} ${esc(hero.name)}</b><small>${hero.hp}/${stats.pv} PV</small></div>
      ${bar(hero.hp, stats.pv, cls.color)}
      <small ${tip(`${res} : ressource dépensée pour lancer les compétences de ${cls.name}.`)}>${res}: ${hero.res}/${stats.resMax}</small>
      ${bar(hero.res, stats.resMax, 'var(--gold)')}
      ${statusTags(hero)}
    </div>`;
}

function enemyUnit(enemy, active) {
  return `
    <div class="unit ${enemy.alive ? '' : 'dead'} ${active ? 'active-turn' : ''}" style="--c:var(--danger)">
      <div class="row1"><b>${enemy.icon} ${esc(enemy.name)}</b><small>${enemy.hp}/${enemy.stats.pv} PV</small></div>
      ${bar(enemy.hp, enemy.stats.pv, 'var(--danger)')}
      ${statusTags(enemy)}
    </div>`;
}

function statusTags(unit) {
  if (!unit.alive) return '';
  const tags = [];
  if (unit.guard) tags.push('🛡️ En garde');
  if (unit.bleed > 0) tags.push(`🩸 Saignement (${unit.bleed})`);
  return tags.length ? `<div class="status">${tags.join(' · ')}</div>` : '';
}

function waitingPanel(acting) {
  const text = acting?.side === 'enemy' ? `${esc(acting.unit.name)} agit...` : 'Préparation du tour...';
  return `<div class="card waiting">${text}</div>`;
}

function actionPanel(hero) {
  const cls = getClass(hero);
  const { atq } = getStats(hero);
  const atkEst = range(estimateDamage(atq));
  return `
    <div class="card">
      <p>Au tour de <b class="hero-name" style="--c:${cls.color}">${esc(hero.name)}</b> (${cls.name})</p>
      <div class="actions">
        <button id="actAttack" ${tip(`Attaque simple avec l'arme équipée. Dégâts estimés : ${atkEst}.`)}>Attaquer · ~${atkEst}</button>
        <button id="actDefend" ${tip("Réduit de moitié les dégâts subis jusqu'au prochain tour.")}>Défendre</button>
        <span class="hint">Compétences ↓</span>
      </div>
      <div class="skillbox">
        ${cls.skills.map((s, i) => `
          <button data-skill="${i}" ${tip(`${s.desc} — ${skillEffectLabel(atq, s)}.`)} ${hero.res < s.cost ? 'disabled' : ''}>
            ${s.name} (${s.cost} ${cls.resource.name}) · ${skillShortEstimate(atq, s)}
          </button>`).join('')}
      </div>
      <div id="targetZone" class="target-zone"></div>
    </div>`;
}

function wireActions(app, hero) {
  const cb = state.combat;
  const zone = app.querySelector('#targetZone');

  // Affiche les cibles valides ; l'action n'est lancée qu'au clic sur une cible.
  const chooseTarget = (action) => {
    const targets = targetsFor(cb, action);
    if (!targets) return playerAction(action);
    const list = targets.side === 'enemy' ? cb.enemies : cb.party;
    zone.innerHTML = targets.units
      .map((u) => `<button data-target="${list.indexOf(u)}">Cibler ${esc(u.name)}</button>`)
      .join('');
    zone.querySelectorAll('[data-target]').forEach((btn) => {
      btn.onclick = () => playerAction({ ...action, target: Number(btn.dataset.target) });
    });
  };

  app.querySelector('#actAttack').onclick = () => chooseTarget({ type: 'attack' });
  app.querySelector('#actDefend').onclick = () => playerAction({ type: 'defend' });
  app.querySelectorAll('[data-skill]').forEach((btn) => {
    btn.onclick = () => chooseTarget({ type: 'skill', skill: Number(btn.dataset.skill) });
  });
}
