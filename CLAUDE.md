# Anyem — notes pour Claude Code

RPG tour par tour roguelite, JavaScript vanilla en modules ES, sans build ni dépendance.
Lire `docs/PROJECT_STATUS.md` (état, feuille de route) et `docs/DESIGN_DOC.md` (vision, référence de design) avant toute évolution de gameplay.

## Commandes

- `npm start` — serveur local sur http://localhost:8000
- `npm test` — tests unitaires (`node --test`)
- `npm run build` — régénère `dist/anyem.html` (jeu en un seul fichier, jouable en double-clic). **À lancer et commiter après toute modification de `index.html`, `css/` ou `src/`** : un test vérifie qu'il est à jour. Le joueur utilise ce fichier, il n'a pas Node.
- `tools/build.mjs` ne gère que `import { … } from '…'` et `export function|const|let|class` : s'en tenir à ces formes.

## Architecture : couches à respecter

`data/` → `game/` → `ui/` (une couche n'importe jamais une couche à sa droite).

- `src/data/` : données pures (classes, ennemis, donjons). Ajouter du contenu ici, pas dans la logique.
- `src/game/` : règles du jeu, **sans DOM ni timers**, testables sous Node. Tout aléatoire passe par `game/rng.js`.
- `src/ui/` : rendu par template strings, un fichier par écran dans `ui/screens/`, navigation via `ui/router.js` (`goTo`, `showHub`).
  `ui/encounter.js` rythme les combats (délais des tours ennemis) autour du moteur `game/combat.js`.
- Chiffres d'équilibrage globaux : `src/config.js`.
- Les stats d'un héros se lisent **toujours** via `getStats(hero)` et ses compétences via `getSkills(hero)` (`game/party.js`) : c'est là que l'équipement (et plus tard talents et buffs) s'applique. Ne pas lire `CLASSES[...].base` ou `.skills` directement ailleurs.
- Niveau max 50 (`XP.maxLevel`), 1 point de talent par niveau ; chaque orientation = 10 paliers, 50 rangs, signature au palier 9 (un test le vérifie).
- Un héros commence sans sort : les sorts de départ (`starterSkills` de la classe) s'apprennent au palier 0 des orientations (nœuds `skills`, voir `nodeSkills`). Tests : `learnStarters` (`tests/helpers.js`).
- Talents : contenu dans `data/talents.js`, règles dans `game/talents.js` ; leurs effets passent par `getStats` (flat/pct/passive) et `getSkills` (skill/skillMod). Buffs/debuffs : **catalogue unique `data/effects.js`** ; une compétence les applique via `effects` / `selfEffects` (`[{ id, turns, power? }]`) et décide seule des cibles. Ne jamais définir un effet dans une compétence ; un nouvel effet s'ajoute au catalogue (un test le vérifie). Instances en combat : `makeStatus` (`game/statuses.js`).
- Zones : chaque donjon = 3 sous-zones de 5 étages (`subzones` : niveaux, `pool`, `elites`, `boss` ; `zone()` calcule floors/pool/bosses), niveaux 1 à 50 ; `subzoneOf`, `floorInSubzone`, `floorLevel` dans `game/dungeon.js`. Le butin prend le niveau des ennemis (`combat.level`).
- Donjons : contenu dans `data/dungeons.js` / `data/enemies.js`, logique dans `game/dungeon.js` (expédition, étages, boss, points de passage) ; `ui/encounter.js` lance le combat de l'étage (`startFloor`) et applique l'issue (`winFloor` / `loseExpedition`). Capacités ennemies = `abilities` au format des compétences, cibles `hero` / `allHeroes` / `self` / `allAllies`.
- Consommables : données dans `data/consumables.js` (`use` : 'combat' / 'map', `target`, `effect`), logique dans `game/consumables.js` (`applyConsumable`, `useOnMap`). Tout nouvel effet négatif doit être ajouté à `DEBUFF_KEYS` et avoir un remède dédié (un test le vérifie).
- 6 classes (`CLASS_ORDER`), équipe de 4 au choix (`createParty(names, classes)`). Chasseur = Énergie sans combo, pièges (`trap`) ; Paladin = Force ou Intelligence selon l'orientation, soins `physHeal`, Intercession (`redirect`).
- Classes à Énergie (Voleur, Chasseur) : plusieurs actions par tour (`resource.multiAction`, `actionCosts`), points de combo (`comboGain` / `finisher`) : règles dans `game/combo.js` ; un finisher se lance via `atCombo(skill, points)` (puissance et effets par point).
- Expédition : 2-3 combats par étage (`expedition.fight/fights`, `winFloor` renvoie `floorDone`) ; les debuffs restent entre les combats (filtrés dans `createCombat`) ; soins/purifications hors combat : `game/field.js`.
- Événements d'expédition : contenu `data/events.js` (choix, issues, coûts), règles `game/events.js` (`maybeTriggerEvent` dans `winFloor`, `chooseEvent`, marchand ambulant) ; `expedition.event` bloque l'étage suivant.
- Difficulté : `DIFFICULTIES` (`config.js`), règles dans `game/difficulty.js` (`enemyPower`, `lootRules`) ; la puissance passe à `createCombat` via `floorCombat`, le butin via `rollLoot(…, { difficulty })`.
- Village : auberge (`game/roster.js` : recrutement niveau 1, réserve `state.reserve` sans XP, max `INN.maxReserve`, échanges, renvoi `dismiss`), bestiaire (`game/bestiary.js`, stats sans hasard via `enemyStats`) et banque (`game/bank.js` : or, objets, consommables, matéria à l'abri des défaites). Matéria et consommables sont dans le sac du joueur (`state.materia`, `state.consumables`).
- Positions corps à corps / distance, riposte, portée des armes : `game/position.js` (`hero.position` = stratégie, `unit.row` = position en combat). Vitesse d'attaque des armes : `WEAPON_TYPES[].speed`, appliquée dans `getStats`.
- En combat, lire les stats via `statsOf(unit)` (`game/units.js`) : il ajoute les buffs/debuffs et Berserk à `getStats`.
- Équiper/retirer passe par `game/equipment.js` (`equip`, `unequip`, `slotsFor`) : règles de maîtrise, deux mains, retour au sac.
- Rareté Divin (boss seulement, Guerre/Horreur) : pas de matéria divine (`MATERIA_RARITIES`) ; pouvoir légendaire absorbé = `item.absorbed` (Forge divine, `absorbLegendary`).
- Forge (`game/forge.js`) : matéria par catégorie (`materiaKind` : arme / armure (+ bouclier) / bijou), décraft, amélioration, fabrication (`craft`, `craftProblem`). Runomancien : `game/runes.js` (`rerollSecondary`).
- Stats d'un objet : toujours via `itemStats(item)` (`game/items.js`), qui applique l'amélioration +1..+5 ; `item.stats` = stats de base. Nom affiché : `itemName(item)` (`ui/items.js`).
- Dégâts : `rollHit` / `estimateHit` (`game/formulas.js`) — mêmes calculs pour le jet et l'estimation affichée. Physique = `physPower` (Attaque des armes + Force/Agilité selon `physStat` de la classe) ; magique (`skill.magic`) et soins = `magPower` (Intelligence). L'Intelligence ne doit jamais renforcer une attaque à l'arme.
- Objets communs : exactement stat(s) obligatoire(s) + stat principale (armure : Armure, qui compte comme Défense et Défense magique dans `getStats` ; bouclier : Armure + Blocage ; bijou : aucune stat obligatoire, stat principale renforcée) ; secondaires (`item.bonus`) à partir de peu commun. Armes, armures et bijoux peuvent sortir en Force, Agilité ou Intelligence. Affichage des lignes de stats : `itemStatLines(item)`.

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
