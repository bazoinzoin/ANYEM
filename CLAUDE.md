# Anyem — notes pour Claude Code

RPG tour par tour roguelite, JavaScript vanilla en modules ES, sans build ni dépendance.
Lire `docs/PROJECT_STATUS.md` (état, feuille de route) et `docs/DESIGN_DOC.md` (vision, référence de design) avant toute évolution de gameplay.

## Commandes

- `npm start` — serveur local sur http://localhost:8000
- `npm test` — tests unitaires (`node --test`)

## Architecture : couches à respecter

`data/` → `game/` → `ui/` (une couche n'importe jamais une couche à sa droite).

- `src/data/` : données pures (classes, ennemis, donjons). Ajouter du contenu ici, pas dans la logique.
- `src/game/` : règles du jeu, **sans DOM ni timers**, testables sous Node. Tout aléatoire passe par `game/rng.js`.
- `src/ui/` : rendu par template strings, un fichier par écran dans `ui/screens/`, navigation via `ui/router.js` (`goTo`, `showHub`).
  `ui/encounter.js` rythme les combats (délais des tours ennemis) autour du moteur `game/combat.js`.
- Chiffres d'équilibrage globaux : `src/config.js`.
- Les stats d'un héros se lisent **toujours** via `getStats(hero)` et ses compétences via `getSkills(hero)` (`game/party.js`) : c'est là que l'équipement (et plus tard talents et buffs) s'applique. Ne pas lire `CLASSES[...].base` ou `.skills` directement ailleurs.
- Équiper/retirer passe par `game/equipment.js` (`equip`, `unequip`, `slotsFor`) : règles de maîtrise, deux mains, retour au sac.
- Dégâts : `rollHit` / `estimateHit` (`game/formulas.js`) — mêmes calculs pour le jet et l'estimation affichée.

## Conventions

- Textes du jeu et commentaires en français ; identifiants en anglais.
- Tout texte dynamique inséré dans du HTML passe par `esc()` (`ui/html.js`).
- Toute nouvelle règle dans `src/game/` s'accompagne d'un test dans `tests/`.

## Préférences du joueur (à respecter)

- Toujours demander la cible explicitement, même s'il n'y en a qu'une.
- Afficher les dégâts/soins estimés avant de valider une action (mêmes fourchettes que le jet réel, via `game/formulas.js`).
- Tours ennemis jamais instantanés : délai + mise en évidence de l'unité active.
- Accès facile aux statistiques des personnages.
- Ambiance JRPG pixel art avec de vrais sprites à terme.
