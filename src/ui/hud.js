// Interface posée sur les cartes plein écran (village, expédition) : équipe en bas à
// gauche (affichée seulement sur demande, bouton Personnage), fenêtre de message fermable
// en haut, raccourcis en icônes, aide aux déplacements repliée derrière un « ? ».

import { STATS } from '../data/stats.js';
import { getClass, getStats, xpToNext, heroClassTitle } from '../game/party.js';
import { statusesOf } from '../game/statuses.js';
import { pointsAvailable } from '../game/talents.js';
import { esc, resourceKind } from './html.js';
import { iconHtml, effectIcon } from './icons.js';
import { heroPortrait } from './portraits.js';

const pct = (v, max) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0);
const meter = (kind, v, max) => `<span class="meter ${kind}"><span class="fill" style="width:${pct(v, max)}%"></span></span>`;

// Encadrés de l'équipe et aide : repliés par défaut pour ne pas cacher la carte ; leur état
// est retenu d'un écran à l'autre.
const shown = { party: false, help: false };

// Équipe : portrait, niveau, PV, ressource (ou XP) et effets négatifs persistants.
// Un clic sur un héros appelle data-hud-hero (menu Personnage du héros).
export function partyHud(party, { resource = false } = {}) {
  return `<div class="hud-party ${shown.party ? '' : 'hidden'}">${party.map((hero, i) => {
    const cls = getClass(hero);
    const stats = getStats(hero);
    const points = pointsAvailable(hero);
    const debuffs = hero.alive ? statusesOf(hero).filter((st) => st.kind === 'debuff') : [];
    return `
      <button class="hud-hero ${hero.alive ? '' : 'dead'}" data-hud-hero="${i}" style="--c:${cls.color}" title="${esc(`${hero.name} — ${heroClassTitle(hero)}, niveau ${hero.level} · ${STATS[cls.mainStat].label}`)}">
        ${heroPortrait(hero, 2)}
        <span class="hud-hero-info">
          <b>${esc(hero.name)} ${points ? `<span class="badge">${points}</span>` : ''}</b>
          <small>niv. ${hero.level}${hero.alive ? '' : ' · tombé'}</small>
          ${meter(`hp ${hero.hp < stats.pv * 0.3 ? 'low' : ''}`, hero.hp, stats.pv)}
          ${resource ? meter(`res ${resourceKind(cls.resource.name)}`, hero.res, stats.resMax) : meter('xp', hero.xp, xpToNext(hero.level))}
          <small>PV ${hero.hp}/${stats.pv}${resource ? ` · ${esc(cls.resource.name)} ${hero.res}/${stats.resMax}` : ''}</small>
          ${debuffs.length ? `<span class="hud-debuffs">${debuffs.map((st) => iconHtml(effectIcon(st.key), 16, '', esc(`${st.name} : reste jusqu'à un remède, une purification ou le retour au village`))).join('')}</span>` : ''}
        </span>
      </button>`;
  }).join('')}</div>`;
}

// Bouton « ? » : affiche ou replie l'aide aux déplacements (.map-help du bloc de contrôles).
export function helpButton() {
  return '<button id="hudHelp" class="hud-help" title="Aide : se déplacer, parler, événements">?</button>';
}

// Branche le HUD : `partyButton` (sélecteur du bouton Personnage) montre ou cache les
// encadrés de l'équipe ; un clic sur un encadré appelle openHero(index) ; « ? » l'aide.
export function wireHud(app, { partyButton, openHero }) {
  const button = app.querySelector(partyButton);
  const party = app.querySelector('.hud-party');
  const controls = app.querySelector('.hud-controls');
  const help = app.querySelector('#hudHelp');
  const sync = () => {
    party?.classList.toggle('hidden', !shown.party);
    button?.classList.toggle('selected', shown.party);
    controls?.classList.toggle('help', shown.help);
    help?.classList.toggle('selected', shown.help);
  };
  if (button) button.onclick = () => { shown.party = !shown.party; sync(); };
  if (help) help.onclick = () => { shown.help = !shown.help; sync(); };
  app.querySelectorAll('[data-hud-hero]').forEach((b) => { b.onclick = () => openHero(Number(b.dataset.hudHero)); });
  sync();
}

// Raccourci en icône (barre du haut à droite).
export function hudButton(id, icon, label, { badge = 0, disabled = false, title = '' } = {}) {
  return `<button id="${id}" class="hud-btn" ${disabled ? 'disabled' : ''} title="${esc(title || label)}">${iconHtml(icon, 32)}<span>${esc(label)}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
}

// Fenêtre de message (retour d'expédition, butin, victoire…), fermée par #toastClose.
export function toast(html) {
  return html ? `<div class="win hud-toast"><button id="toastClose" class="hud-close" title="Fermer">✕</button>${html}</div>` : '';
}

export function wireToast(app) {
  const close = app.querySelector('#toastClose');
  if (close) close.onclick = () => close.parentElement.remove();
}
