// Orchestration d'un combat d'étage : enchaîne les tours du moteur (game/combat.js),
// rythme les tours ennemis, déclenche le rendu, puis applique l'issue à
// l'expédition (game/dungeon.js).

import { state } from '../state.js';
import { TIMING, DIFFICULTIES } from '../config.js';
import { createCombat, nextTurn, heroAct, enemyAct, checkOutcome, log } from '../game/combat.js';
import { floorCombat, winFight, loseExpedition, subzoneOf } from '../game/dungeon.js';
import { recordEncounter } from '../game/bestiary.js';
import { DUNGEONS } from '../data/dungeons.js';
import { render, showHub, goTo } from './router.js';
import { getSkills } from '../game/party.js';
import { snapshotBattle, diffBattle, heroGesture, enemyGesture } from './battleDiff.js';
import { playAction } from './battleStage.js';
import { later } from './pauseClock.js';
import { enemyDelayFactor } from './saves.js';

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
  if (!cb || cb.result) return;
  const hero = cb.acting?.unit;
  const skill = action.type === 'skill' ? getSkills(hero)[action.skill] : null;
  const before = snapshotBattle(cb);
  if (!heroAct(cb, action)) return;
  playAction(cb, hero, before, heroGesture(skill, action));
  // Héros à Énergie : il garde la main tant qu'il n'a pas fini son tour.
  if (cb.acting && !checkOutcome(cb)) render();
  else advance();
}

function advance() {
  const cb = state.combat;
  const before = snapshotBattle(cb);
  const turn = nextTurn(cb); // effets de début de tour (poison, pièges...) compris
  playAction(cb, null, before);
  if (!turn) return endAfterAnimation();

  if (turn.side === 'hero') {
    render();
    return;
  }

  // Tour ennemi : jamais instantané, l'unité active est mise en évidence.
  log(cb, `${turn.unit.name} se prépare à agir...`);
  enemyTurn(cb, turn);
}

// Action de l'ennemi dont c'est le tour, après un temps de réflexion visible.
function enemyTurn(cb, turn) {
  render();
  later(() => {
    const beforeAct = snapshotBattle(cb);
    enemyAct(cb);
    playAction(cb, turn.unit, beforeAct, enemyGesture(turn.unit, diffBattle(cb, beforeAct)));
    render();
    if (checkOutcome(cb)) return endAfterAnimation();
    later(advance, TIMING.enemyAfterMs * enemyDelayFactor());
  }, TIMING.enemyThinkMs * enemyDelayFactor());
}

// Reprend un combat chargé depuis une sauvegarde : au tour d'un héros, on attend son
// ordre ; au tour d'un ennemi, il agit ; sinon on passe au combattant suivant.
export function resumeCombat() {
  const cb = state.combat;
  state.screen = 'combat';
  if (cb.result) return endAfterAnimation();
  if (cb.acting?.side === 'hero') return render();
  if (cb.acting?.side === 'enemy') return enemyTurn(cb, cb.acting);
  advance();
}

// Laisse voir le dernier coup (et la chute) avant de quitter l'écran de combat.
function endAfterAnimation() {
  render();
  later(finish, TIMING.outcomeMs);
}

function finish() {
  const cb = state.combat;
  state.combat = null;
  state.lastCombat = { title: cb.title, log: cb.log }; // journal consultable après le combat
  if (cb.result !== 'victory') {
    const exp = state.expedition;
    const where = `${DUNGEONS[exp.dungeonKey].name} · ${subzoneOf(exp.dungeonKey, exp.floor).name}, étage ${exp.floor}`;
    const r = loseExpedition(state, cb);
    state.defeat = { where, message: r.message, lost: r.lost };
    goTo('defeat');
    return;
  }
  const dungeonKey = state.expedition.dungeonKey;
  const r = winFight(state, cb);
  if (r.cleared) {
    const next = r.unlocked ? ` ${DUNGEONS[r.unlocked].name} est désormais accessible !` : '';
    const medal = r.medal ? ` Vous gagnez la médaille ${DIFFICULTIES[r.medal].name} de la zone (visible aux portails) !` : '';
    showHub(`${DUNGEONS[dungeonKey].name} est vaincue ! ${r.message}${next}${medal}`, r.loot);
    return;
  }
  const nextZone = r.boss ? subzoneOf(dungeonKey, state.expedition.floor) : null;
  Object.assign(lastFloor, { message: r.boss ? `Le boss est vaincu ! La sous-zone suivante, ${nextZone.name} (niv. ${nextZone.minLevel}-${nextZone.maxLevel}), devient un point de départ.` : null, loot: [], summary: r });
  goTo('dungeon');
}
