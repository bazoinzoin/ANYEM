// Assemblage de l'écran : barre de menus, barre de transport, bibliothèque, inspecteur,
// arrangement, panneau du bas (éditeur ou console), aide rapide. Boucle d'affichage.

import { esc, $, setHtml } from './dom.js';
import { icon } from './icons.js';
import { state, ui, project, subscribe, emit, historyInfo, beginGesture, endGesture, touch } from './store.js';
import { formatPosition, formatTime, ticksToSeconds, secondsToTicks, SNAP_OPTIONS } from '../core/time.js';
import { KEY_ROOTS, SCALES } from '../core/music.js';
import { initArrange, renderHeaders, frame as arrangeFrame, invalidate as invalidateArrange } from './arrange.js';
import { renderEditor, drawEditor, installEditor, resetEditorMount } from './editor.js';
import { mixerHtml, installMixer, updateMixerMeters } from './mixerView.js';
import { inspectorHtml, installInspector, refreshInputs } from './inspector.js';
import { libraryHtml, installLibrary } from './library.js';
import { actions, run, MENUS, menuItems, TOOLS, installKeyboard } from './actions.js';
import { currentTick, checkAutoStop, startPlay } from './transport.js';
import { isPlaying, playheadSeconds, resumeAudio } from '../audio/engine.js';
import { inputLevel } from '../audio/recorder.js';
import { installControls } from './controls.js';
import { showMenu, closeMenu } from './popup.js';
import { saveProject, importAudioPicker, importMidiPicker, pickSampleFor, openProjectFile } from './files.js';
import { newTrackDialog, APP_NAME } from './dialogs.js';
import { typingPanelHtml, installTypingPointer } from './musicalTyping.js';
import { toast } from './toast.js';

let root = null;
const pending = { panels: false, layout: false };
let lastBpm = null;
let editorDirty = true;

function shell() {
  return `
  <header class="menubar">
    <div class="brand">${icon('wave', 18)}<span>${APP_NAME}</span></div>
    <nav class="menus">${MENUS.map((m, i) => `<button class="menu-btn" data-menu="${i}">${esc(m.label)}</button>`).join('')}</nav>
    <button class="proj-name" data-act="song" data-help="Nom du morceau, tempo, mesure et tonalité : cliquez pour les modifier."></button>
    <span class="save-state" id="saveState"></span>
    <button class="btn small export-btn" data-act="exportSong" data-help="Exporter le morceau en WAV, en pistes séparées ou en MIDI (Ctrl+E).">${icon('upload', 14)} Exporter</button>
  </header>
  <header class="toolbar" id="toolbar"></header>
  <main class="main" id="main">
    <aside class="panel lib-panel" id="libraryPanel"></aside>
    <aside class="panel insp-panel" id="inspectorPanel"></aside>
    <section class="arrange">
      <div class="arr-top">
        <div class="arr-corner">
          <button class="btn small" data-act="newTrack" data-help="Ajouter une piste (Ctrl+Maj+N).">${icon('plus', 14)} Piste</button>
          <div class="trackh" data-help="Hauteur des pistes"><button class="icon-btn small" data-trackh="-">${icon('minus', 13)}</button><button class="icon-btn small" data-trackh="+">${icon('plus', 13)}</button></div>
        </div>
        <div class="ruler-wrap" data-help="Règle : cliquez pour placer la tête de lecture. Bande orange : glissez pour définir la boucle, cliquez pour l'activer. Clic droit : repères (Couplet, Refrain…)."><canvas id="ruler"></canvas></div>
      </div>
      <div class="arr-body">
        <div id="trackHeaders" class="track-headers"></div>
        <div class="scroll-host"><canvas id="arrCanvas"></canvas><div id="arrScroll" class="scroller"><div id="arrSpacer"></div></div></div>
      </div>
    </section>
  </main>
  <div class="hsplit" id="hsplit" data-help="Glissez pour agrandir ou réduire le panneau du bas."></div>
  <section class="bottom" id="bottom">
    <div class="bottom-bar">
      <div class="seg bottom-tabs">
        <button data-bottom="editor" data-help="Éditeur (E) : notes, batterie pas à pas, son.">${icon('editor', 14)} Éditeur</button>
        <button data-bottom="mixer" data-help="Console de mixage (X) : volumes, effets, réverbe.">${icon('mixer', 14)} Console</button>
      </div>
      <div class="ed-toolbar" id="edToolbar"></div>
      <button class="icon-btn" data-bottom="close" data-help="Fermer le panneau">${icon('close', 15)}</button>
    </div>
    <div class="bottom-body" id="bottomBody"></div>
  </section>
  <div id="typingHost"></div>
  <footer class="quickhelp" id="quickhelp"><span class="qh-ico">${icon('help', 14)}</span><span id="qhText"></span><span class="qh-status" id="qhStatus"></span></footer>`;
}

function toolbarHtml() {
  const p = project();
  const h = historyInfo();
  const playing = ui.playing;
  return `
    <div class="tb-group">
      <button class="icon-btn${ui.showLibrary ? ' lit' : ''}" data-act="library" data-help="Bibliothèque (Y) : sons et boucles prêts à l'emploi.">${icon('library')}</button>
      <button class="icon-btn${ui.showInspector ? ' lit' : ''}" data-act="inspector" data-help="Inspecteur (I) : tous les réglages de la piste sélectionnée.">${icon('inspector')}</button>
      <span class="tb-sep"></span>
      <button class="icon-btn" data-act="undo" ${h.canUndo ? '' : 'disabled'} data-help="${esc(h.canUndo ? `Annuler : ${h.undoLabel} (Ctrl+Z)` : 'Rien à annuler')}">${icon('undo')}</button>
      <button class="icon-btn" data-act="redo" ${h.canRedo ? '' : 'disabled'} data-help="${esc(h.canRedo ? `Rétablir : ${h.redoLabel} (Ctrl+Y)` : 'Rien à rétablir')}">${icon('redo')}</button>
    </div>
    <div class="transport">
      <button class="tp-btn" data-act="toStart" data-help="Revenir au début (Entrée)">${icon('toStart')}</button>
      <button class="tp-btn" data-act="prevBar" data-help="Mesure précédente (,)">${icon('rewind')}</button>
      <button class="tp-btn" data-act="nextBar" data-help="Mesure suivante (;)">${icon('forward')}</button>
      <button class="tp-btn" data-act="stop" data-help="Stop. Deuxième appui : retour au début.">${icon('stop')}</button>
      <button class="tp-btn play${playing && !ui.recording ? ' on' : ''}" data-act="play" data-help="Lecture / pause (Espace)">${icon(playing ? 'pause' : 'play', 20)}</button>
      <button class="tp-btn rec${ui.recording ? ' on' : ''}" data-act="record" data-help="Enregistrer (R) sur la piste sélectionnée ou les pistes armées.">${icon('record', 20)}</button>
    </div>
    <div class="lcd">
      <div class="lcd-cell big" data-help="Position : mesure . temps . double croche"><span id="lcdPos">1.1.1</span><small>Mesure</small></div>
      <div class="lcd-cell" data-help="Temps écoulé depuis le début"><span id="lcdTime">0:00.000</span><small>Temps</small></div>
      <div class="lcd-cell drag" id="lcdTempo" data-help="Tempo : glissez vers le haut ou le bas (Maj = finement), double-clic pour saisir."><span>${p.bpm}</span><small>BPM</small></div>
      <button class="lcd-cell tap" data-act="tap" data-help="Tapez en rythme sur ce bouton pour régler le tempo.">TAP</button>
      <button class="lcd-cell" data-act="song" data-help="Mesure (signature rythmique)"><span>${p.sigNum}/${p.sigDen}</span><small>Mesure</small></button>
      <button class="lcd-cell" data-act="song" data-help="Tonalité du morceau"><span>${esc(KEY_ROOTS[p.key].label)} ${esc(SCALES[p.scale].label.slice(0, 3).toLowerCase())}</span><small>Tonalité</small></button>
    </div>
    <div class="tb-group">
      <button class="icon-btn${p.loop.on ? ' lit amber' : ''}" data-act="loop" data-help="Boucle (C) : rejoue sans fin la zone orange de la règle.">${icon('cycle')}</button>
      <button class="icon-btn${p.metronome.on ? ' lit' : ''}" data-act="metronome" data-help="Métronome (K)">${icon('metronome')}</button>
      <button class="icon-btn${p.metronome.countIn ? ' lit' : ''}" data-act="countIn" data-help="Décompte d'une mesure avant d'enregistrer">${icon('countIn')}</button>
      <button class="icon-btn${ui.musicalTyping ? ' lit' : ''}" data-act="typing" data-help="Clavier musical (Ctrl+K) : jouez des notes avec le clavier de l'ordinateur.">${icon('keyboard')}</button>
      <div class="input-meter" id="inputMeter" data-help="Niveau d'entrée du micro"><i></i></div>
    </div>
    <div class="tb-group seg tools">${TOOLS.map((t, i) => `<button class="${ui.tool === t.id ? 'on' : ''}" data-tool="${t.id}" data-help="${esc(t.help)} (T puis ${i + 1})">${icon(t.icon, 16)}</button>`).join('')}</div>
    <label class="tb-group snap" data-help="Magnétisme : les éléments se calent sur cette grille (Maj pendant le glisser = libre).">${icon('magnet', 15)}
      <select data-snap>${SNAP_OPTIONS.map((o) => `<option value="${o.id}"${ui.snap === o.id ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>
    <span class="spacer"></span>
    <div class="tb-group">
      <button class="icon-btn${ui.bottom === 'editor' ? ' lit' : ''}" data-act="editor" data-help="Éditeur (E)">${icon('editor')}</button>
      <button class="icon-btn${ui.bottom === 'mixer' ? ' lit' : ''}" data-act="mixer" data-help="Console de mixage (X)">${icon('mixer')}</button>
    </div>`;
}

function applyLayout() {
  const app = root;
  app.classList.toggle('no-lib', !ui.showLibrary);
  app.classList.toggle('no-insp', !ui.showInspector);
  app.classList.toggle('no-bottom', !ui.bottom);
  app.classList.toggle('no-help', !ui.quickHelp);
  app.style.setProperty('--bottom-h', `${ui.bottomH}px`);
  document.documentElement.style.fontSize = `${Math.round(13 * ui.uiScale * 10) / 10}px`;
  const host = $('#typingHost');
  host.innerHTML = ui.musicalTyping ? typingPanelHtml() : '';
}

function renderPanels() {
  setHtml($('#toolbar'), toolbarHtml());
  const p = project();
  const pn = $('.proj-name', root);
  pn.innerHTML = `${esc(p.name)} <span class="muted">· ${p.bpm} BPM · ${p.sigNum}/${p.sigDen}</span>`;
  const ss = $('#saveState');
  ss.textContent = state.dirty ? 'Modifié' : state.savedAt ? 'Enregistré' : '';
  ss.className = `save-state${state.dirty ? ' dirty' : ''}`;
  const lib = $('#libraryPanel');
  if (ui.showLibrary && !(document.activeElement && lib.contains(document.activeElement) && document.activeElement.matches('input'))) setHtml(lib, libraryHtml());
  if (ui.showInspector) setHtml($('#inspectorPanel'), inspectorHtml());
  renderHeaders();
  for (const b of root.querySelectorAll('[data-bottom]')) b.classList.toggle('on', b.dataset.bottom === ui.bottom);
  const body = $('#bottomBody');
  if (ui.bottom === 'mixer') {
    resetEditorMount();
    $('#edToolbar').innerHTML = '<span class="muted small">Glissez les faders, tournez les boutons ; cliquez un effet pour le régler dans l\'inspecteur.</span>';
    setHtml(body, mixerHtml());
  } else if (ui.bottom === 'editor') {
    if (!body.querySelector('.ed-view')) { body.innerHTML = '<div class="ed-view"></div>'; resetEditorMount(); }
    renderEditor(root.querySelector('#bottom'));
  }
  editorDirty = true;
  invalidateArrange();
}

function schedule(kind) {
  if (kind === 'live') { invalidateArrange(); editorDirty = true; return; }
  if (kind === 'view') { invalidateArrange(); return; }
  if (kind === 'typing') { if (ui.musicalTyping) $('#typingHost').innerHTML = typingPanelHtml(); return; }
  if (kind === 'layout' || kind === 'prefs') pending.layout = true;
  pending.panels = true;
}

function flush() {
  if (pending.layout || pending.panels) { applyLayout(); pending.layout = false; }
  if (pending.panels) { renderPanels(); pending.panels = false; }
}

// Changement de tempo pendant la lecture : on reprend au même endroit musical.
function watchTempo() {
  const bpm = project().bpm;
  if (lastBpm != null && bpm !== lastBpm && isPlaying() && !ui.recording) {
    const s = playheadSeconds();
    if (s != null) startPlay(Math.max(0, Math.round(secondsToTicks(s, lastBpm))));
  }
  lastBpm = bpm;
}

function loop() {
  flush();
  arrangeFrame();
  if (ui.bottom === 'editor' && (editorDirty || isPlaying())) { drawEditor(); editorDirty = false; }
  if (ui.bottom === 'mixer') updateMixerMeters($('#bottomBody'));
  const t = currentTick();
  const p = project();
  const pos = $('#lcdPos');
  if (pos) {
    pos.textContent = formatPosition(t, p);
    $('#lcdTime').textContent = formatTime(ticksToSeconds(t, p.bpm));
  }
  const im = $('#inputMeter');
  if (im) {
    const lvl = inputLevel();
    im.classList.toggle('active', lvl > 0 || ui.recording);
    im.firstElementChild.style.width = `${Math.min(100, lvl * 140)}%`;
  }
  checkAutoStop();
  requestAnimationFrame(loop);
}

// ---- Événements ------------------------------------------------------------------------------

function installChrome() {
  root.addEventListener('click', (e) => {
    const menu = e.target.closest('[data-menu]');
    if (menu) {
      const m = MENUS[Number(menu.dataset.menu)];
      const r = menu.getBoundingClientRect();
      showMenu(r.left, r.bottom + 2, menuItems(m), { minWidth: 260 });
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && actions[act.dataset.act] && !act.closest('.track-headers')) { run(act.dataset.act); return; }
    const tool = e.target.closest('[data-tool]');
    if (tool) { ui.tool = tool.dataset.tool; emit('ui'); return; }
    const bottom = e.target.closest('[data-bottom]');
    if (bottom) {
      const v = bottom.dataset.bottom;
      ui.bottom = v === 'close' ? null : v;
      emit('layout');
      return;
    }
    const th = e.target.closest('[data-trackh]');
    if (th) { ui.trackH = Math.max(44, Math.min(160, ui.trackH + (th.dataset.trackh === '+' ? 14 : -14))); emit('ui'); return; }
    const tc = e.target.closest('[data-typing-close]');
    if (tc) run('typing');
  });
  root.addEventListener('mouseover', (e) => {
    if (!ui.quickHelp) return;
    const el = e.target.closest('[data-help]');
    $('#qhText').textContent = el ? el.dataset.help : defaultHelp();
  });
  root.addEventListener('change', (e) => {
    const s = e.target.closest('[data-snap]');
    if (s) { ui.snap = s.value; emit('ui'); }
  });
  // Un bouton ou une liste ne garde pas le clavier : Espace, R, Suppr… restent des raccourcis.
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (b && !b.closest('.modal')) b.blur();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && !t.closest('.modal') && (t.tagName === 'SELECT' || t.type === 'range' || t.type === 'checkbox')) t.blur();
  });
  root.addEventListener('pointerdown', (e) => {
    resumeAudio();
    if (e.target.closest('#bottom')) ui.focusArea = 'editor';
    else if (e.target.closest('.arrange')) ui.focusArea = 'arrange';
  }, true);
  // Tempo : glisser vertical (suivi au niveau de la fenêtre), double-clic pour saisir
  let tempoDrag = null;
  root.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#lcdTempo') || e.button !== 0) return;
    e.preventDefault();
    tempoDrag = { y: e.clientY, bpm: project().bpm };
    beginGesture('Tempo');
  });
  window.addEventListener('pointermove', (e) => {
    if (!tempoDrag) return;
    const d = (tempoDrag.y - e.clientY) / (e.shiftKey ? 12 : 3);
    const bpm = Math.max(30, Math.min(300, Math.round(tempoDrag.bpm + d)));
    if (bpm !== project().bpm) {
      project().bpm = bpm;
      const cell = $('#lcdTempo span');
      if (cell) cell.textContent = bpm;
      touch();
    }
  });
  window.addEventListener('pointerup', () => { if (tempoDrag) { tempoDrag = null; endGesture(); } });
  root.addEventListener('dblclick', (e) => {
    if (!e.target.closest('#lcdTempo')) return;
    run('song');
  });
  // Séparateur du panneau du bas
  const split = $('#hsplit');
  let sp = null;
  split.addEventListener('pointerdown', (e) => { split.setPointerCapture(e.pointerId); sp = { y: e.clientY, h: ui.bottomH }; });
  split.addEventListener('pointermove', (e) => {
    if (!sp) return;
    ui.bottomH = Math.max(160, Math.min(window.innerHeight - 220, sp.h + (sp.y - e.clientY)));
    root.style.setProperty('--bottom-h', `${ui.bottomH}px`);
    invalidateArrange();
    editorDirty = true;
  });
  split.addEventListener('pointerup', () => { sp = null; });
  // Fichiers glissés dans la fenêtre hors de l'arrangement : projet .onde ou import.
  window.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (e.target.closest && e.target.closest('#arrScroll, #trackHeaders')) return;
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    const onde = files.find((f) => /\.onde$/i.test(f.name));
    if (onde) openProjectFile(onde);
  });
}

function defaultHelp() {
  if (!project().tracks.length) return 'Commencez par ajouter une piste (bouton « + Piste ») ou glissez un son depuis la bibliothèque.';
  if (ui.musicalTyping) return 'Clavier musical actif : jouez avec les lettres du clavier. Échap pour le désactiver.';
  return 'Survolez un bouton pour savoir à quoi il sert. Espace = lecture, R = enregistrer, Ctrl+Z = annuler, F1 = tous les raccourcis.';
}

export function mountApp(el) {
  root = el;
  root.className = 'app';
  root.innerHTML = shell();
  installControls(root);
  installChrome();
  initArrange(root, { onNewTrack: newTrackDialog });
  installEditor($('#bottom'));
  installMixer($('#bottomBody'));
  installInspector($('#inspectorPanel'), { pickSample: pickSampleFor });
  installLibrary($('#libraryPanel'), { importAudio: importAudioPicker, importMidi: importMidiPicker });
  installKeyboard();
  installTypingPointer($('#typingHost'));
  subscribe((kind) => { schedule(kind); watchTempo(); });
  applyLayout();
  renderPanels();
  $('#qhText').textContent = defaultHelp();
  refreshInputs();
  requestAnimationFrame(loop);
  // Enregistrement automatique dans « Mes projets ».
  setInterval(() => {
    if (state.dirty && project().tracks.length && !ui.recording) saveProject({ quiet: true });
  }, 15000);
  window.addEventListener('beforeunload', () => { if (state.dirty) saveProject({ quiet: true }); });
  // Appelé par la version Windows avant de fermer la fenêtre.
  window.ondeBeforeClose = async () => { if (state.dirty && project().tracks.length) await saveProject({ quiet: true }); return true; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.dirty) saveProject({ quiet: true }); });
  window.addEventListener('error', (e) => toast(`Erreur : ${e.message}`, 'error', 5000));
  closeMenu();
}
