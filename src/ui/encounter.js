// Orchestration d'un combat : enchaîne les tours du moteur (game/combat.js),
// rythme les tours ennemis et déclenche le rendu.

import { state } from '../state.js';
import { TIMING } from '../config.js';
import { createCombat, nextTurn, heroAct, enemyAct, checkOutcome, log } from '../game/combat.js';
import { applyVictory, applyDefeat } from '../game/progression.js';
import { render, showHub } from './router.js';

export function startEncounter(dungeonKey) {
  state.combat = createCombat({ dungeonKey, level: state.dungeonLvl, party: state.party, consumables: state.consumables });
  state.screen = 'combat';
  advance();
}

export function playerAction(action) {
  if (heroAct(state.combat, action)) advance();
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
  const outcome = cb.result === 'victory'
    ? applyVictory(state, { enemiesDefeated: cb.enemies.length })
    : applyDefeat(state);
  state.combat = null;
  showHub(outcome.message, outcome.loot);
}
