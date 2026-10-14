// Fenêtres : accueil (nouveau projet, mes projets), nouvelle piste, morceau (tempo,
// tonalité), export, préférences, raccourcis, guide de démarrage.

import { esc } from './dom.js';
import { icon } from './icons.js';
import { modal, confirmBox } from './popup.js';
import { state, ui, project, loadProject, commit, emit } from './store.js';
import { TEMPLATES, createFromTemplate } from '../core/library.js';
import { KEY_ROOTS, SCALES } from '../core/music.js';
import { listLibrary, deleteFromLibrary, savePrefs } from './storage.js';
import { openFromLibrary, openProjectPicker, exportAudio, exportMidi, saveProject } from './files.js';
import { addTrack } from './ops.js';
import { stop as engineStop } from '../audio/engine.js';
import { toast } from './toast.js';
import { midiStatus } from './midiInput.js';

export const APP_NAME = 'Onde Studio';

function when(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

const TEMPLATE_ICON = { empty: 'plus', beat: 'drum', pop: 'mic', electro: 'wave', lofi: 'headphones', voice: 'mic' };

export async function welcomeDialog({ closable = true } = {}) {
  let projects = [];
  try { projects = await listLibrary(); } catch { projects = []; }
  const m = modal(`
    <div class="welcome">
      <div class="welcome-head">
        <div class="logo">${icon('wave', 30)}</div>
        <div><h1>${APP_NAME}</h1><p class="muted">Composez, enregistrez et mixez votre musique, simplement.</p></div>
        ${closable ? `<button class="icon-btn" data-close>${icon('close', 18)}</button>` : ''}
      </div>
      <div class="welcome-cols">
        <div>
          <h3>Nouveau projet</h3>
          <div class="tpl-grid">${TEMPLATES.map((t) => `<button class="tpl" data-tpl="${t.id}">
            <span class="tpl-ico">${icon(TEMPLATE_ICON[t.id] || 'note', 22)}</span><b>${esc(t.name)}</b><span class="muted small">${esc(t.help)}</span></button>`).join('')}</div>
        </div>
        <div>
          <h3>Mes projets</h3>
          <div class="proj-list">${projects.length ? projects.map((p) => `<div class="proj" data-proj="${p.id}">
            <button class="proj-open" data-open="${p.id}"><b>${esc(p.name)}</b><span class="muted small">${p.tracks} piste(s) · ${p.bpm} BPM · ${when(p.savedAt)}</span></button>
            <button class="icon-btn small" data-del="${p.id}" data-help="Supprimer ce projet">${icon('trash', 14)}</button></div>`).join('') : '<p class="muted small">Vos projets apparaîtront ici. Ils sont enregistrés automatiquement.</p>'}</div>
          <button class="btn wide" data-openfile>${icon('folder', 15)} Ouvrir un fichier .onde…</button>
          <button class="btn wide ghost" data-guide>${icon('help', 15)} Guide de démarrage</button>
        </div>
      </div>
    </div>`, { wide: true, className: closable ? '' : 'no-close' });
  m.el.addEventListener('click', async (e) => {
    const tpl = e.target.closest('[data-tpl]');
    if (tpl) {
      engineStop();
      loadProject(createFromTemplate(tpl.dataset.tpl), { dirty: true });
      ui.fileHandle = null;
      m.close();
      saveProject({ quiet: true });
      if (tpl.dataset.tpl !== 'empty' && tpl.dataset.tpl !== 'voice') toast(matchMedia('(pointer: coarse)').matches ? 'Touchez ▶ pour écouter.' : 'Appuyez sur Espace pour écouter.', 'info', 3500);
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open) { if (await openFromLibrary(open.dataset.open)) m.close(); return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (await confirmBox('Supprimer ce projet ?', 'Le projet et ses enregistrements seront effacés définitivement.', { ok: 'Supprimer', danger: true })) {
        await deleteFromLibrary(del.dataset.del);
        del.closest('.proj').remove();
      }
      return;
    }
    if (e.target.closest('[data-openfile]')) { if (await openProjectPicker()) m.close(); return; }
    if (e.target.closest('[data-guide]')) guideDialog();
  });
  return m;
}

export function newTrackDialog() {
  const m = modal(`<h2>Nouvelle piste</h2>
    <p class="muted">Que voulez-vous ajouter ?</p>
    <div class="kind-grid">
      <button class="kind" data-kind="instrument">${icon('piano', 34)}<b>Instrument</b><span class="muted small">Piano, synthé, cordes, basse… joués au clavier ou dessinés note par note.</span></button>
      <button class="kind" data-kind="drums">${icon('drum', 34)}<b>Batterie</b><span class="muted small">Boîte à rythmes avec grille pas à pas : idéale pour créer un rythme en quelques clics.</span></button>
      <button class="kind" data-kind="audio">${icon('mic', 34)}<b>Audio</b><span class="muted small">Enregistrer une voix, une guitare au micro, ou importer un fichier son.</span></button>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Annuler</button></div>`);
  m.el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (!k) return;
    const kind = k.dataset.kind;
    if (kind === 'instrument') addTrack('instrument', { presetId: 'epiano' });
    else if (kind === 'drums') addTrack('drums', { presetId: 'kit808' });
    else addTrack('audio', { name: 'Audio' });
    m.close();
  });
}

const SIGNATURES = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 8], [7, 8], [12, 8]];

export function songDialog() {
  const p = project();
  const m = modal(`<h2>Réglages du morceau</h2>
    <div class="form">
      <label>Nom<input class="text-input" data-f="name" value="${esc(p.name)}" maxlength="80"></label>
      <label>Tempo (BPM)<input class="text-input" type="number" min="30" max="300" step="1" data-f="bpm" value="${p.bpm}"></label>
      <label>Mesure<select data-f="sig">${SIGNATURES.map(([n, d]) => `<option value="${n}/${d}"${p.sigNum === n && p.sigDen === d ? ' selected' : ''}>${n}/${d}</option>`).join('')}</select></label>
      <label>Tonalité<select data-f="key">${KEY_ROOTS.map((k) => `<option value="${k.id}"${p.key === k.id ? ' selected' : ''}>${esc(k.label)}</option>`).join('')}</select></label>
      <label>Gamme<select data-f="scale">${Object.entries(SCALES).map(([k, s]) => `<option value="${k}"${p.scale === k ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
    </div>
    <p class="muted small">La tonalité colore le piano roll (notes de la gamme) et adapte les boucles de la bibliothèque.</p>
    <div class="modal-actions"><button class="btn" data-close>Annuler</button><button class="btn primary" data-ok>Valider</button></div>`);
  m.el.querySelector('[data-ok]').addEventListener('click', () => {
    const v = (k) => m.el.querySelector(`[data-f="${k}"]`).value;
    const [n, d] = v('sig').split('/').map(Number);
    commit('Réglages du morceau', (pp) => {
      pp.name = v('name').trim() || pp.name;
      pp.bpm = Math.max(30, Math.min(300, Number(v('bpm')) || pp.bpm));
      pp.sigNum = n;
      pp.sigDen = d;
      pp.key = Number(v('key'));
      pp.scale = v('scale');
    });
    m.close();
  });
}

export function exportDialog() {
  const p = project();
  const m = modal(`<h2>Exporter le morceau</h2>
    <div class="form">
      <label>Partie<select data-f="range"><option value="song">Tout le morceau</option><option value="loop"${p.loop.on ? ' selected' : ''}>Zone de boucle seulement</option></select></label>
      <label>Qualité<select data-f="bits"><option value="16">WAV 16 bits (CD)</option><option value="24" selected>WAV 24 bits (studio)</option><option value="32">WAV 32 bits flottant</option></select></label>
      <label>Fréquence<select data-f="rate"><option value="44100">44,1 kHz</option><option value="48000">48 kHz</option></select></label>
      <label class="check"><input type="checkbox" data-f="norm"> Normaliser (volume au maximum sans saturer)</label>
      <label class="check"><input type="checkbox" data-f="stems"> Pistes séparées (un fichier par piste)</label>
    </div>
    <p class="progress muted small" data-progress></p>
    <div class="modal-actions">
      <button class="btn ghost" data-midi>${icon('note', 15)} Exporter en MIDI</button>
      <span class="spacer"></span>
      <button class="btn" data-close>Fermer</button><button class="btn primary" data-ok>${icon('upload', 15)} Exporter en WAV</button>
    </div>`);
  const prog = m.el.querySelector('[data-progress]');
  m.el.querySelector('[data-midi]').addEventListener('click', () => exportMidi());
  m.el.querySelector('[data-ok]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const v = (k) => m.el.querySelector(`[data-f="${k}"]`);
    btn.disabled = true;
    try {
      await exportAudio({
        range: v('range').value, bits: Number(v('bits').value), sampleRate: Number(v('rate').value),
        norm: v('norm').checked, stems: v('stems').checked, onProgress: (t) => { prog.textContent = t; },
      });
      prog.textContent = 'Terminé.';
    } catch (err) {
      prog.textContent = `Erreur : ${err.message}`;
    }
    btn.disabled = false;
  });
}

export function prefsDialog() {
  const m = modal(`<h2>Préférences</h2>
    <div class="form">
      <label>Noms des notes<select data-f="noteNames"><option value="fr"${ui.noteNames === 'fr' ? ' selected' : ''}>Do, Ré, Mi…</option><option value="en"${ui.noteNames === 'en' ? ' selected' : ''}>C, D, E…</option></select></label>
      <label>Taille de l'interface<select data-f="uiScale">${[0.9, 1, 1.1, 1.2, 1.3].map((s) => `<option value="${s}"${ui.uiScale === s ? ' selected' : ''}>${Math.round(s * 100)} %</option>`).join('')}</select></label>
      <label>Compensation de latence d'enregistrement (ms)<input class="text-input" type="number" min="-200" max="500" step="1" data-f="latency" value="${ui.latencyMs}"></label>
      <label class="check"><input type="checkbox" data-f="quickHelp"${ui.quickHelp ? ' checked' : ''}> Afficher l'aide rapide en bas de l'écran</label>
      <label class="check"><input type="checkbox" data-f="countIn"${project().metronome.countIn ? ' checked' : ''}> Décompte d'une mesure avant d'enregistrer</label>
    </div>
    <p class="muted small">Contrôleurs MIDI : ${esc(midiStatus())}</p>
    <div class="modal-actions"><button class="btn" data-close>Annuler</button><button class="btn primary" data-ok>Valider</button></div>`);
  m.el.querySelector('[data-ok]').addEventListener('click', () => {
    const v = (k) => m.el.querySelector(`[data-f="${k}"]`);
    ui.noteNames = v('noteNames').value;
    ui.uiScale = Number(v('uiScale').value);
    ui.latencyMs = Number(v('latency').value) || 0;
    ui.quickHelp = v('quickHelp').checked;
    const countIn = v('countIn').checked;
    if (countIn !== project().metronome.countIn) commit('Décompte', (p) => { p.metronome.countIn = countIn; });
    savePrefs({ noteNames: ui.noteNames, uiScale: ui.uiScale, latencyMs: ui.latencyMs, quickHelp: ui.quickHelp });
    m.close();
    emit('prefs');
  });
}

export const SHORTCUTS = [
  ['Lecture', [['Espace', 'Lecture / pause'], ['R', 'Enregistrer'], ['Entrée', 'Revenir au début'], ['C', 'Boucle (cycle) on / off'], ['K', 'Métronome on / off'], [', et ;', 'Mesure précédente / suivante'], ['Début / Fin', 'Début / fin du morceau']]],
  ['Édition', [['Ctrl+Z', 'Annuler'], ['Ctrl+Y ou Ctrl+Maj+Z', 'Rétablir'], ['Ctrl+C / X / V', 'Copier / couper / coller'], ['Ctrl+D', 'Dupliquer'], ['Suppr', 'Supprimer'], ['Ctrl+A', 'Tout sélectionner'], ['Ctrl+T', 'Couper à la tête de lecture'], ['Ctrl+J', 'Joindre les régions'], ['M', 'Rendre muette la région'], ['Q', 'Quantifier'], ['↑ ↓', 'Transposer les notes (Maj = octave)'], ['← →', 'Déplacer les notes']]],
  ['Outils', [['T puis 1…6', 'Outil : pointeur, crayon, gomme, ciseaux, colle, silence'], ['Alt+glisser', 'Copier'], ['Maj+glisser', 'Sans magnétisme']]],
  ['Fenêtres', [['E', 'Éditeur'], ['X', 'Console de mixage'], ['Y', 'Bibliothèque'], ['I', 'Inspecteur'], ['Ctrl+K', 'Clavier musical (jouer avec le clavier de l\'ordinateur)'], ['Ctrl+molette', 'Zoom'], ['F1', 'Raccourcis']]],
  ['Projet', [['Ctrl+N', 'Nouveau projet'], ['Ctrl+O', 'Ouvrir'], ['Ctrl+S', 'Enregistrer'], ['Ctrl+Maj+S', 'Enregistrer un fichier .onde'], ['Ctrl+E', 'Exporter'], ['Ctrl+Maj+N', 'Nouvelle piste']]],
];

export function shortcutsDialog() {
  modal(`<h2>Raccourcis clavier</h2><div class="shortcuts">${SHORTCUTS.map(([title, list]) => `<div><h3>${esc(title)}</h3><table>${list.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table></div>`).join('')}</div>
    <div class="modal-actions"><button class="btn primary" data-close>Fermer</button></div>`, { wide: true });
}

export function guideDialog() {
  modal(`<h2>Bien démarrer</h2>
    <ol class="guide">
      <li><b>Choisissez un modèle</b> (Fichier › Nouveau projet) ou partez d'un projet vide.</li>
      <li><b>Ajoutez des sons</b> : ouvrez la <b>bibliothèque</b> (Y). Glissez une <i>boucle</i> sur l'arrangement, ou cliquez un <i>son</i> pour l'appliquer à la piste sélectionnée.</li>
      <li><b>Écrivez des notes</b> : double-cliquez une piste d'instrument pour créer une région, l'<b>éditeur</b> s'ouvre en bas. Avec le <b>crayon</b>, cliquez pour poser des notes. Pour la batterie, cliquez simplement les cases.</li>
      <li><b>Jouez en direct</b> : Ctrl+K active le clavier musical (rangées de lettres = touches de piano), ou branchez un clavier MIDI USB.</li>
      <li><b>Enregistrez</b> : sélectionnez une piste puis appuyez sur ● ou R. Pour le micro, créez une piste <b>Audio</b>.</li>
      <li><b>Mixez</b> : la <b>console</b> (X) règle volumes, panoramiques, réverbe et effets. L'<b>inspecteur</b> (I) montre tous les réglages de la piste.</li>
      <li><b>Exportez</b> votre morceau en WAV (Ctrl+E) pour l'écouter partout.</li>
    </ol>
    <p class="muted small">Astuce : survolez n'importe quel bouton, l'aide rapide en bas de l'écran explique à quoi il sert. Tout se défait avec Ctrl+Z.</p>
    <div class="modal-actions"><button class="btn primary" data-close>C'est parti</button></div>`, { wide: true });
}

export async function newProjectFlow() {
  if (state.dirty) await saveProject({ quiet: true });
  welcomeDialog();
}
