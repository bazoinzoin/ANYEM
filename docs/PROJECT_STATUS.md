# Anyem — RPG tour par tour roguelite

Prototype développé par itérations dans le chat Claude (claude.ai) avant transfert vers Claude Code.
Ce fichier résume l'état du projet pour reprendre le développement sans perdre le contexte.

## Fichiers

- `index.html` + `css/` + `src/` — le jeu, en modules ES sans build ni dépendance. Lancer avec `npm start` (voir `README.md`).
- `docs/DESIGN_DOC.md` — le document de conception original de l'utilisateur : vision complète du jeu (classes, combat, équipement, arbres de compétences, donjons, village). C'est la référence pour toutes les décisions de design futures.
- `CLAUDE.md` — architecture et conventions à respecter lors des modifications.

## Ce qui est déjà fonctionnel

- **Création d'équipe** : 4 classes jouables (Guerrier/Rage, Voleur/Énergie, Prêtre/Mana, Mage/Mana), avec nom personnalisable.
- **Village (hub)** : affichage de l'équipe, portail vers un donjon, Auberge (soin complet fonctionnel), Marchand et Forge (placeholders "bientôt disponible"), écran de statistiques détaillées par personnage.
- **Combat tour par tour** : ordre de jeu basé sur la vitesse, actions Attaquer/Défendre/Compétence, ciblage toujours demandé explicitement (même s'il ne reste qu'une cible), tours ennemis avec délai visible (pas instantanés, ~0.8s + mise en évidence de l'unité qui agit), estimation de dégâts/soins affichée sur les boutons et en tooltip, tooltips descriptifs sur toutes les actions/classes/services, victoire → or + progression du niveau de donjon, défaite → perte d'or + retour au village.
- **Équipement** (voir détail ci-dessous) : 11 emplacements, 5 raretés, objets nivelés, butin en fin de combat, sac partagé, écran Équipement avec comparaison des stats avant d'équiper, objets légendaires liés à une classe.
- **Stats complètes** (DESIGN_DOC §2) : Force/Agilité/Intelligence, Attaque, Vitesse, Taux et Dégâts critiques, PV, Défense, Défense magique, Esquive, Blocage — toutes utilisées en combat.

## Système d'équipement (choix d'implémentation)

Réglages chiffrés dans `src/config.js` (`COMBAT`, `ITEM`, `LOOT`), contenus dans `src/data/items.js`.
- **Emplacements** : casque, épaulières, plastron, gants, ceinture, bottes, collier, anneau ×2, main droite, main gauche.
- **Stat obligatoire** : Attaque (armes), Défense (armures), Défense + Blocage (bouclier), Défense magique (bijoux — choix non précisé par le design doc).
- **Stat principale** cohérente avec le type : armure lourde = Force, moyenne = Force/Agilité, légère = Intelligence, bâton = Intelligence, dague = Agilité/Intelligence, armes 1M = Force/Agilité, 2M = Force, bijoux = au choix. Chaque point de stat principale de la classe donne +0,5 Attaque.
- **Raretés** : commun (gris, 0 secondaire), peu commun (vert, 1), rare (bleu, 2), épique (violet, 3), légendaire (orange, 4 + passif unique). Les stats obligatoire/principale sont aussi multipliées par la rareté.
- **Niveau** : un objet a le niveau du donjon où il est trouvé ; ses stats en dépendent.
- **Armes** : épée rapide (+1 Vit) et moins puissante, hache intermédiaire, marteau lent (−1 Vit) et puissant ; versions 2 mains plus lentes et plus fortes ; dague très rapide ; bâton à deux mains. Arme en main gauche (Voleur, ambidextrie) : son attaque compte à 50 %.
- **Maîtrises** : Guerrier (armes 1M/2M, bouclier, armure lourde/moyenne), Voleur (armes 1M et dagues dans les deux mains, armure moyenne), Prêtre (bâton, dague, armure légère), Mage (bâton, armure légère).
- **Légendaires** : 2 par classe, chacun modifie une compétence existante (puissance, coût ou durée du saignement). À revoir quand les orientations et arbres de compétences existeront.
- **Combat** : dégâts × 100 / (100 + Défense ou Défense magique de la cible) ; critique selon Taux/Dégâts critiques ; Esquive = attaque évitée ; Blocage = dégâts réduits de moitié. Coup Vicieux est un critique garanti.
- **Butin** : 40 % de chance par ennemi vaincu (commun 50 %, peu commun 30 %, rare 14 %, épique 5 %, légendaire 1 %). En cas de défaite, chaque objet du sac a 50 % de chance d'être perdu ; l'équipement porté n'est jamais perdu.
- **Départ** : chaque héros commence avec une arme et un plastron communs ; les stats de base ont été ajustées pour garder la même puissance qu'avant l'équipement.

## Architecture actuelle (à connaître avant de modifier)

Le prototype monofichier `anyem.html` a été découpé (voir `CLAUDE.md` pour le détail) :
- `src/data/` : `CLASSES` (stats de base, maîtrises d'équipement, kit de départ, ressource, compétences), `STATS`, objets (`SLOTS`, `RARITIES`, types d'armes/armures, `LEGENDARIES`), `ENEMIES`, `DUNGEONS`.
- `src/game/` : moteur pur et testé — `combat.js` (file de tour par vitesse, actions, esquive/blocage, saignements, fin de combat), `party.js` (héros, `getStats()`, `getSkills()`), `items.js` (génération d'objets), `equipment.js` (règles d'équipement, sac), `loot.js`, `progression.js` (victoire, défaite, auberge), `formulas.js` (jets et estimations), `rng.js`.
- `src/ui/` : un écran par fichier, `router.js` pour la navigation, `encounter.js` pour le rythme des tours ennemis (`setTimeout`).
- `src/state.js` : état global (`screen`, `party`, `bag`, `gold`, `dungeonLvl`, `combat`, `hubMessage`, `hubLoot`).
- Rendu par template strings, ré-affichage complet de l'écran à chaque `render()`.

### Corrections apportées lors du découpage

- Ordre de jeu : la vitesse des héros était ignorée dans le tri (seule celle des ennemis comptait).
- Ciblage : l'index de la cible choisie ne correspondait plus à la bonne unité dès qu'un ennemi (ou allié, pour les soins) situé avant dans la liste était mort.
- Saignement de Lacération : il n'était jamais appliqué. Il inflige désormais 6 PV par fin de round pendant 3 rounds.
- Défendre : la garde restait active tout le combat ; elle dure maintenant jusqu'au prochain tour du héros.
- Auberge : ne relevait pas les héros tombés lors d'une victoire, qui restaient morts sans aucun moyen de revenir.
- Noms de héros échappés à l'affichage (un nom contenant du HTML cassait la page).
- Estimation des soins : affiche la valeur exacte (le soin n'a pas de variance) ; celle des compétences de zone utilise leur vraie fourchette.

## Ce qui n'est PAS encore fait (voir DESIGN_DOC.md pour le détail complet)

- Revente du butin (Marchand), amélioration +1 à +5 (Forge)
- Expérience et niveaux de personnage
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

1. ~~Équipement + rareté~~ (fait)
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
