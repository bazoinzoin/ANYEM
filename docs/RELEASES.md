# Versions d'Anyem : archivage et publication

La version **officielle jouable** est le jeu Windows (`Anyem-X.Y.Z.exe`, Electron), fabriqué
automatiquement par GitHub à partir de `dist/anyem.html`. Chaque version est archivée :

- **Numéro** : `package.json` (`version`), recopié dans `src/version.js` (affiché sur l'écran
  titre) et dans `desktop/package.json` (par `npm run desktop`). Un test vérifie que les trois
  concordent et que `CHANGELOG.md` a une section pour la version.
- **Journal** : `CHANGELOG.md`, une section `## [X.Y.Z] - date` par version, en français, du
  point de vue du joueur.
- **Archive** : une étiquette Git `vX.Y.Z` sur `main` et une page GitHub « Releases » avec le
  `.exe`, le zip, `anyem.html` et l'icône. Les anciennes versions restent téléchargeables.

Numérotation : `X` grande refonte, `Y` nouvelle version jouable (nouveautés), `Z` corrections.

## Publier une version

1. Sur la branche de travail : monter la version dans `package.json` et `src/version.js`,
   ajouter sa section en tête de `CHANGELOG.md`, `npm run build`, `npm test`, commit.
2. Fusionner dans `main`.
3. Publier : onglet Actions → « Version Windows » → « Run workflow » sur `main`, case
   « publier » cochée (depuis l'environnement de Claude, qui ne peut pas pousser d'étiquette :
   `actions_run_trigger` avec l'entrée `publier: true`). Le workflow
   `.github/workflows/release.yml` (machine Windows) teste, fabrique le `.exe`, crée l'étiquette
   `vX.Y.Z` et publie la page de téléchargement. Pousser soi-même une étiquette `vX.Y.Z` sur
   `main` fait la même chose (le workflow vérifie qu'elle correspond à `package.json`).

Pour tester un `.exe` sans publier : onglet Actions → « Version Windows » → « Run workflow » ;
le `.exe` est dans les artefacts de l'exécution.

## Version Windows (desktop/)

- `desktop/main.cjs` : fenêtre Electron (maximisée, sans menu, F11 / Alt+Entrée = plein écran),
  charge `desktop/game/anyem.html` (copie de `dist/anyem.html` faite par `npm run desktop`).
- Sauvegardes : stockage local d'Electron, dans `%APPDATA%\Anyem` (indépendant de
  l'emplacement du `.exe`). Elles ne sont pas partagées avec la version navigateur.
- Fabrication locale (sur Windows) : `npm run desktop`, puis dans `desktop/` : `npm install` et
  `npm run dist` → `desktop/release/`.
