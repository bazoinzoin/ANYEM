// Carte de l'étage (écran d'expédition) : dessin sur canvas, déplacement au clavier
// (flèches, ZQSD, WASD), à la souris ou au doigt (clic sur une case : le groupe y
// marche pas à pas), croix directionnelle pour le tactile.
// Graphismes provisoires (couleurs et emoji) en attendant les sprites.

import { state } from '../state.js';
import { ENEMIES } from '../data/enemies.js';
import { getClass } from '../game/party.js';
import { visibleFrom, stepToward, idx, isFloor } from '../game/floorMap.js';
import { stepParty, takeLadder, canExplore } from '../game/dungeon.js';
import { goTo } from './router.js';
import { startFloor } from './encounter.js';

const TILE = 22;
const WALK_MS = 110;       // délai entre deux pas d'une marche automatique
const ENCOUNTER_MS = 350;  // le monstre touché reste visible un instant avant le combat

// Couleurs par zone : { wall, floor }.
const PALETTES = {
  foretMaudite: { wall: '#16230f', floor: '#3c5a2e', edge: '#24381b' },
  catacombes: { wall: '#17151c', floor: '#4a4553', edge: '#2a2631' },
  cavernesArdentes: { wall: '#220f0a', floor: '#5c3322', edge: '#3a1c12' },
  picsGeles: { wall: '#1a2430', floor: '#8ea6b8', edge: '#4d6272' },
  abimeInfernal: { wall: '#170609', floor: '#4a1c26', edge: '#2c0d14' },
};

// Marche automatique en cours (clic sur une case) : { target, timer }.
let walk = null;
let busy = false; // combat en cours de déclenchement

function stopWalk() {
  if (walk) clearTimeout(walk.timer);
  walk = null;
}

export function mapCard() {
  const exp = state.expedition;
  const map = exp.map;
  const onLadder = !!map.ladder && map.party.x === map.ladder.x && map.party.y === map.ladder.y;
  const hasBoss = map.mobs.some((m) => m.boss);
  return `
    <div class="card map-card">
      <canvas id="floorMap" width="${map.w * TILE}" height="${map.h * TILE}"></canvas>
      <div class="map-controls">
        <div class="dpad">
          <button data-step="0,-1" aria-label="Haut">▲</button>
          <button data-step="-1,0" aria-label="Gauche">◀</button>
          <button data-step="1,0" aria-label="Droite">▶</button>
          <button data-step="0,1" aria-label="Bas">▼</button>
        </div>
        <div class="map-help">
          <p class="hint">Déplacement : flèches ou ZQSD, clic sur une case, ou la croix. Chaque pas, les monstres bougent aussi : s'ils vous voient (<b>!</b>), ils vous poursuivent. Toucher un groupe lance le combat.</p>
          <p class="hint">${hasBoss ? '☠️ Le boss garde la salle la plus éloignée : le vaincre termine la sous-zone.' : '🪜 Trouvez l\'échelle pour descendre. Éviter les monstres est possible, mais sans XP ni butin.'} ❔ = événement.</p>
          ${map.ladder ? `<button id="ladderBtn" class="btn-primary" ${onLadder && canExplore(state) ? '' : 'disabled'}>🪜 Descendre à l'étage suivant</button>` : ''}
        </div>
      </div>
    </div>`;
}

export function bindMap(app) {
  const canvas = app.querySelector('#floorMap');
  if (!canvas) return;
  drawMap(canvas);
  app.querySelectorAll('[data-step]').forEach((btn) => {
    btn.onclick = () => {
      stopWalk();
      const [dx, dy] = btn.dataset.step.split(',').map(Number);
      step(dx, dy);
    };
  });
  canvas.onclick = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - rect.left) / rect.width) * state.expedition.map.w);
    const y = Math.floor(((ev.clientY - rect.top) / rect.height) * state.expedition.map.h);
    startWalk({ x, y });
  };
  app.querySelector('#ladderBtn')?.addEventListener('click', () => {
    stopWalk();
    if (takeLadder(state)) goTo('dungeon');
  });
}

// Un pas ; retourne vrai si la marche peut continuer.
function step(dx, dy) {
  if (busy || state.screen !== 'dungeon' || !canExplore(state)) return false;
  const r = stepParty(state, dx, dy);
  const canvas = document.querySelector('#floorMap');
  if (r.encounter) {
    stopWalk();
    busy = true;
    if (canvas) drawMap(canvas, r.encounter);
    setTimeout(() => {
      busy = false;
      startFloor();
    }, ENCOUNTER_MS);
    return false;
  }
  if (r.event || r.ladder) {
    stopWalk();
    goTo('dungeon'); // panneau d'événement / bouton de l'échelle
    return false;
  }
  if (canvas) drawMap(canvas);
  return r.moved;
}

function startWalk(target) {
  stopWalk();
  const map = state.expedition?.map;
  if (!map || !isFloor(map, target.x, target.y) || !map.seen[idx(map, target.x, target.y)]) return;
  walk = { target, timer: null };
  const tick = () => {
    if (!walk) return;
    const m = state.expedition?.map;
    if (!m || (m.party.x === target.x && m.party.y === target.y)) return stopWalk();
    const chasedBefore = m.mobs.filter((mob) => mob.chasing).length;
    const next = stepToward(m, m.party, target, (x, y) => !m.seen[idx(m, x, y)]);
    if (!next || !step(next.x - m.party.x, next.y - m.party.y)) return stopWalk();
    // Un monstre vient de repérer le groupe : la marche s'arrête pour laisser réagir.
    if (state.expedition?.map.mobs.filter((mob) => mob.chasing).length > chasedBefore) return stopWalk();
    walk.timer = setTimeout(tick, WALK_MS);
  };
  tick();
}

// Clavier : flèches, ZQSD (AZERTY) et WASD (QWERTY), sur l'écran d'expédition.
const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  z: [0, -1], s: [0, 1], q: [-1, 0], d: [1, 0], w: [0, -1], a: [-1, 0],
};
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (ev) => {
    if (state.screen !== 'dungeon' || !state.expedition?.map || ev.target.closest?.('input, textarea, select')) return;
    const dir = KEYS[ev.key] ?? KEYS[ev.key.toLowerCase()];
    if (!dir) return;
    ev.preventDefault();
    stopWalk();
    step(...dir);
  });
}

function drawMap(canvas, highlight = null) {
  const exp = state.expedition;
  const map = exp.map;
  const pal = PALETTES[exp.dungeonKey] ?? PALETTES.foretMaudite;
  const ctx = canvas.getContext('2d');
  const visible = visibleFrom(map, map.party);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const i = idx(map, x, y);
      if (!map.seen[i]) continue;
      const floor = map.tiles[i] === 1;
      // Mur au bord du sol : teinte intermédiaire, pour dessiner les contours des salles.
      const edge = !floor && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isFloor(map, x + dx, y + dy));
      ctx.fillStyle = floor ? pal.floor : edge ? pal.edge : pal.wall;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (floor) {
        ctx.strokeStyle = 'rgba(0,0,0,.12)';
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
      if (!visible.has(i)) {
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  const glyph = (x, y, text, bg, ring = null) => {
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    if (bg) {
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ring) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.font = `${TILE - 7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);
  };
  if (map.ladder && map.seen[idx(map, map.ladder.x, map.ladder.y)]) glyph(map.ladder.x, map.ladder.y, '🪜', 'rgba(240,190,90,.35)');
  for (const e of map.events) if (map.seen[idx(map, e.x, e.y)]) glyph(e.x, e.y, '❔', 'rgba(150,110,220,.55)');
  for (const mob of map.mobs) {
    if (!visible.has(idx(map, mob.x, mob.y)) && mob !== highlight) continue;
    glyph(mob.x, mob.y, ENEMIES[mob.enemies[0]].icon, mob.boss ? 'rgba(120,20,20,.8)' : 'rgba(90,20,20,.6)', mob === highlight ? '#fff' : mob.boss ? '#f0c060' : null);
    if (mob.enemies.length > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`${mob.enemies.length}`, mob.x * TILE + TILE - 4, mob.y * TILE + TILE - 5);
    }
    if (mob.chasing) {
      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('!', mob.x * TILE + TILE / 2, mob.y * TILE - 2);
    }
  }
  const leader = state.party.find((h) => h.alive) ?? state.party[0];
  glyph(map.party.x, map.party.y, getClass(leader).icon, 'rgba(240,200,110,.9)', '#fff');
}
