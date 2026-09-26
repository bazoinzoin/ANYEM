# Anyem — RPG tour par tour roguelite

Prototype développé par itérations dans le chat Claude (claude.ai) avant transfert vers Claude Code.
Ce fichier résume l'état du projet pour reprendre le développement sans perdre le contexte.

## Fichiers

- `anyem.html` — le jeu complet, actuellement un unique fichier HTML/CSS/JS autonome (aucune dépendance, aucun build). Ouvrable directement dans un navigateur.
- `DESIGN_DOC.md` — le document de conception original de l'utilisateur : vision complète du jeu (classes, combat, équipement, arbres de compétences, donjons, village). C'est la référence pour toutes les décisions de design futures.

## Ce qui est déjà fonctionnel dans anyem.html

- **Création d'équipe** : 4 classes jouables (Guerrier/Rage, Voleur/Énergie, Prêtre/Mana, Mage/Mana), avec nom personnalisable.
- **Village (hub)** : affichage de l'équipe, portail vers un donjon, Auberge (soin complet fonctionnel), Marchand et Forge (placeholders "bientôt disponible"), écran de statistiques détaillées par personnage.
- **Combat tour par tour** : ordre de jeu basé sur la vitesse, actions Attaquer/Défendre/Compétence, ciblage toujours demandé explicitement (même s'il ne reste qu'une cible), tours ennemis avec délai visible (pas instantanés, ~0.8s + mise en évidence de l'unité qui agit), estimation de dégâts/soins affichée sur les boutons et en tooltip, tooltips descriptifs sur toutes les actions/classes/services, victoire → or + progression du niveau de donjon, défaite → perte d'or + retour au village.

## Architecture actuelle (à connaître avant de modifier)

Tout est dans `anyem.html` :
- `CLASSES` : objet définissant chaque classe (stats, ressource, compétences avec `mult`/`heal`/`aoe`/`dot`, description).
- `state` : objet global (screen courant, party, gold, dungeonLvl, combat en cours).
- `render()` : dispatcher selon `state.screen` (`create`/`hub`/`stats`/`combat`).
- Le combat utilise une file de tour (`turnQueue`) triée par vitesse, avec `advanceTurn()` piloté par `setTimeout` pour les tours ennemis.
- Pas de framework, pas de build, tout en vanilla JS avec des template strings pour le rendu (pas de virtual DOM, ré-affichage complet à chaque `render()`).

## Ce qui n'est PAS encore fait (voir DESIGN_DOC.md pour le détail complet)

- Système d'équipement (slots, stats, rareté commun→légendaire, niveaux)
- Decraft/forge et matéria
- Arbres de compétences (nodes principaux/secondaires par orientation de classe)
- Classes Paladin et Chasseur (orientations non définies dans le design doc, à inventer)
- Donjons à étages multiples avec boss tous les x étages, plusieurs donjons de niveau croissant
- Marchand et Forge fonctionnels
- Banque, maître de compétences
- Vrais sprites visuels (actuellement : emojis et couleurs CSS en guise de placeholders)
- Village explorable avec déplacement libre du personnage (actuellement un simple menu/hub)

## Sprites — pistes déjà identifiées

L'utilisateur veut une vraie ambiance JRPG en pixel art. Packs recommandés (gratuits, licences permissives) :
- LPC (Liberated Pixel Cup, sur OpenGameArt) — personnages animés + tuiles, licence CC-BY-SA (crédit requis)
- Kenney (kenney.nl) — icônes/UI/objets, CC0 (aucune attribution)
- Cainos (itch.io) — tileset top-down village/nature
- 0x72 DungeonTileset II (itch.io) — tileset donjon, CC0

Contrairement à un artifact publié sur claude.ai (qui interdit les images distantes et impose l'encodage base64), un projet Claude Code peut charger ces fichiers image directement depuis le disque — c'est plus simple et plus propre.

## Suggestion d'ordre pour la suite

1. Équipement + rareté (le système central de la boucle roguelite)
2. Arbres de compétences par classe/orientation
3. Donjons à étages multiples + plusieurs donjons de niveau croissant
4. Intégration des vrais sprites
5. Village explorable avec déplacement libre
6. Paladin, Chasseur, et autres classes

## Préférences de l'utilisateur exprimées jusqu'ici

- Veut systématiquement voir/choisir une cible, même si une seule option est possible.
- Veut voir les dégâts/soins estimés avant de valider une action.
- Veut un accès facile aux statistiques de ses personnages.
- Veut que les tours ennemis ne soient jamais instantanés (délai + feedback visuel).
- Veut une vraie ambiance JRPG avec de vrais sprites, pas juste des formes/emoji.
