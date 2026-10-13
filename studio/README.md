# Onde Studio

Station de travail audio-numérique (DAW) complète et simple à prendre en main : composer,
enregistrer, arranger, mixer et exporter de la musique. Interface en français, pensée pour les
débutants comme pour les habitués (aide rapide au survol, modèles prêts à jouer, raccourcis).

JavaScript vanilla en modules ES, Web Audio, sans dépendance ni étape de compilation.
La version **Windows** (`desktop/`, Electron) est fabriquée par GitHub (workflow
`.github/workflows/studio-release.yml`).

## Commandes (dans `studio/`)

- `npm start` — serveur local sur http://localhost:8100
- `npm test` — tests unitaires (`node --test`)
- `npm run build` — régénère `dist/onde-studio.html` (logiciel en un seul fichier, ouvrable d'un
  double-clic). **À lancer et commiter après toute modification de `index.html`, `css/` ou
  `src/`** : un test vérifie qu'il est à jour.
- `npm run desktop` — prépare `desktop/app/` pour Electron ; puis dans `desktop/` :
  `npm install` et `npm start` (essai) ou `npm run dist` (installateur + version portable, sur Windows).
- `python3 tools/logo.py` — régénère `assets/logo.png` et `desktop/onde-studio.ico`.

## Publier une version Windows

1. Monter la version dans `package.json` et `src/version.js` (`desktop/package.json` suit avec
   `npm run desktop`), ajouter sa section en tête de `CHANGELOG.md`, `npm run build`, `npm test`.
2. Onglet Actions → « Onde Studio Windows » → « Run workflow », case « publier » cochée (ou
   pousser une étiquette `studio-vX.Y.Z`). La page de téléchargement contient
   `OndeStudio-X.Y.Z-installation.exe`, `OndeStudio-X.Y.Z-portable.exe` et `onde-studio.html`.

## Architecture

`core/` → `audio/` → `ui/` (une couche n'importe jamais une couche à sa droite ; un test le vérifie).

- `src/core/` : règles pures, testées sous Node, sans DOM ni Web Audio.
  `time.js` (ticks, 480 par noire ; mesures, grille), `music.js` (gammes, accords, quantification,
  arpégiateur), `project.js` (modèle du projet, régions, automation, chargement tolérant),
  `defs.js` (catalogue des paramètres d'instruments et d'effets), `library.js` (sons, boucles,
  modèles), `plan.js` (plan de lecture en secondes), `smf.js` (fichiers MIDI), `wav.js`,
  `dsp.js` (réverbe, saturation, formes d'onde), `history.js` (annuler / rétablir).
- `src/audio/` : Web Audio. `instruments.js` (voix des instruments), `effects.js`, `mixer.js`
  (graphe : pistes, bus, sortie ; `sync(project)`), `engine.js` (transport avec programmation
  anticipée, métronome, jeu en direct, vu-mètres, rendu hors ligne pour l'export avec le même
  graphe), `recorder.js` (micro).
- `src/ui/` : `store.js` (projet + historique : `commit(label, fn)`, gestes continus
  `beginGesture` / `endGesture`, état d'interface `ui`), un fichier par zone : `arrange.js`,
  `pianoRoll.js`, `stepSeq.js`, `audioEditor.js`, `editor.js`, `mixerView.js`, `inspector.js`,
  `library.js`, `dialogs.js`, `actions.js` (toutes les commandes : menus et raccourcis),
  `transport.js` (lecture, enregistrement), `files.js` / `storage.js` (sauvegardes, export).
  Boutons et faders génériques : `controls.js`, reliés à un chemin de réglage (`bind.js`,
  ex. `t:<piste>:fx:<effet>:mix`).
- `tools/build.mjs` ne gère que `import { … } from '…'` et `export function|const|let|class`.

Conventions : textes et commentaires en français, identifiants en anglais ; tout texte
dynamique inséré dans du HTML passe par `esc()` ; tout changement du projet passe par
`commit` (annulable) ; toute nouvelle règle de `core/` s'accompagne d'un test.
