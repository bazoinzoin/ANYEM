// Orchestration d'un combat d'étage : enchaîne les tours du moteur (game/combat.js),
// rythme les tours ennemis, déclenche le rendu, puis applique l'issue à
// l'expédition (game/dungeon.js).

import { state } from '../state.js';
import { TIMING } from '../config.js';
import { createCombat, nextTurn, heroAct, enemyAct, checkOutcome, log } from '../game/combat.js';
import { floorCombat, winFloor, loseExpedition, escapeExpedition } from '../game/dungeon.js';
import { recordEncounter } from '../game/bestiary.js';
import { DUNGEONS } from '../data/dungeons.js';
import { render, showHub, goTo } from './router.js';

// Résultat du dernier étage, affiché sur l'écran d'expédition.
export const lastFloor = { message: null, loot: [], summary: null };

// Lance le combat de l'étage courant de l'expédition.
export function startFloor() {
  const params = floorCombat(state);
  recordEncounter(state, params.enemies);
  state.combat = createCombat({ ...params, party: state.party, consumables: state.consumables });
  state.screen = 'combat';
  advance();
}

export function playerAction(action) {
  const cb = state.combat;
  if (!heroAct(cb, action)) return;
  // Héros à Énergie : il garde la main tant qu'il n'a pas fini son tour.
  if (cb.acting) render();
  else advance();
}

function advance() {
  const cb = state.combat;
  const turn = nextTurn(cb);
  if (!turn) return finish();

  if (turn.side === 'hero') {
    render();
    return;
  }

  // Tour ennemi : jamais instantané, l'unité active est mise en évidence.
  log(cb, `${turn.unit.name} se prépare à agir...`);
  render();
  setTimeout(() => {
    enemyAct(cb);
    render();
    if (checkOutcome(cb)) return finish();
    setTimeout(advance, TIMING.enemyAfterMs);
  }, TIMING.enemyThinkMs);
}

function finish() {
  const cb = state.combat;
  state.combat = null;
  state.lastCombat = { title: cb.title, log: cb.log }; // journal consultable après le combat
  if (cb.result === 'escape') {
    escapeExpedition(state, cb);
    showHub("Grâce à la Corde d'évasion, l'équipe regagne le village sans rien perdre. Vous pourrez repartir depuis le dernier boss vaincu.");
    return;
  }
  if (cb.result !== 'victory') {
    showHub(loseExpedition(state, cb).message);
    return;
  }
  const dungeonKey = state.expedition.dungeonKey;
  const r = winFloor(state, cb);
  if (r.cleared) {
    const next = r.unlocked ? ` ${DUNGEONS[r.unlocked].name} est désormais accessible !` : '';
    showHub(`${DUNGEONS[dungeonKey].name} est vaincue ! ${r.message}${next}`, r.loot);
    return;
  }
  const bossText = r.boss ? ' Le boss est vaincu !' : '';
  Object.assign(lastFloor, { message: r.boss ? `Le boss est vaincu !` : null, loot: [], summary: r });
  goTo('dungeon');
}
