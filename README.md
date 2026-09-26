# Anyem

RPG tour par tour roguelite dans le navigateur, en JavaScript vanilla (aucune dépendance, aucun build).

## Lancer le jeu

```sh
npm start        # puis ouvrir http://localhost:8000
```

Le jeu utilise des modules ES : il doit être servi en HTTP, il ne s'ouvre pas en double-cliquant sur `index.html` (`file://`).
N'importe quel serveur statique convient (`python3 -m http.server 8000` par exemple).

## Jouer en ligne (GitHub Pages)

Le jeu est un site statique : il peut être publié tel quel avec GitHub Pages.
Dans le dépôt GitHub : **Settings → Pages → Build and deployment**, Source « Deploy from a branch »,
branche `main`, dossier `/ (root)`, puis **Save**. Après une ou deux minutes, le jeu est jouable à
l'adresse `https://<utilisateur>.github.io/<dépôt>/`.

## Tests

```sh
npm test         # tests unitaires de la logique de jeu (node:test, Node ≥ 20)
```

## Organisation

```
index.html            page d'entrée
css/                  base.css (variables, reset) · components.css · screens.css
src/
  main.js             enregistre les écrans et lance le rendu
  config.js           constantes d'équilibrage et de rythme
  state.js            état global du jeu
  data/               données pures : classes, ennemis, donjons
  game/               logique de jeu pure (aucun DOM) — testée dans tests/
  ui/                 rendu HTML, navigation, orchestration des combats
    screens/          un fichier par écran (create, hub, stats, combat)
tests/                tests unitaires de src/game
tools/serve.mjs       serveur de développement
assets/               sprites, tuiles, sons (à venir)
docs/                 DESIGN_DOC.md (vision du jeu) · PROJECT_STATUS.md (état et feuille de route)
```
