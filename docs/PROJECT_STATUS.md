# Anyem — RPG tour par tour roguelite

Prototype développé par itérations dans le chat Claude (claude.ai) avant transfert vers Claude Code.
Ce fichier résume l'état du projet pour reprendre le développement sans perdre le contexte.

## Fichiers

- `index.html` + `css/` + `src/` — le jeu, en modules ES sans build ni dépendance. Lancer avec `npm start` (voir `README.md`).
- `docs/DESIGN_DOC.md` — le document de conception original de l'utilisateur : vision complète du jeu (classes, combat, équipement, arbres de compétences, donjons, village). C'est la référence pour toutes les décisions de design futures.
- `CLAUDE.md` — architecture et conventions à respecter lors des modifications.

## Ce qui est déjà fonctionnel

- **Création d'équipe** : 4 classes jouables (Guerrier/Rage, Voleur/Énergie, Prêtre/Mana, Mage/Mana), avec nom personnalisable.
- **Village (hub)** : affichage de l'équipe, portail vers un donjon, Auberge (soin complet fonctionnel), Forge, Marchand, écran de statistiques détaillées par personnage.
- **Combat tour par tour** : ordre de jeu basé sur la vitesse, actions Attaquer/Défendre/Compétence, ciblage toujours demandé explicitement (même s'il ne reste qu'une cible), tours ennemis avec délai visible (pas instantanés, ~0.8s + mise en évidence de l'unité qui agit), estimation de dégâts/soins affichée sur les boutons et en tooltip, tooltips descriptifs sur toutes les actions/classes/services, victoire → or + progression du niveau de donjon, défaite → perte d'or + retour au village.
- **Équipement** (voir détail ci-dessous) : 11 emplacements, 5 raretés, objets nivelés, butin en fin de combat, sac partagé, écran Équipement avec comparaison des stats avant d'équiper, objets légendaires liés à une classe.
- **Forge** (voir détail ci-dessous) : décraft des objets du sac en matéria, amélioration +1 à +5.
- **Marchand** (voir détail ci-dessous) : revente du butin, achat de consommables et d'équipement ; action « Objet » en combat.
- **Expérience et niveaux** : XP à chaque victoire, montée de niveau (PV et stat principale), 1 point de talent par niveau.
- **Arbres de compétences** (voir détail ci-dessous) : orientations du design doc, écran « Maître des compétences » au village.
- **Effets de combat** : buffs/debuffs, poisons et saignements, soins sur la durée, boucliers, étourdissement, provocation, confusion, soins de groupe, résurrection, multi-frappe.
- **Stats complètes** (DESIGN_DOC §2) : Force/Agilité/Intelligence, Attaque, Vitesse, Taux et Dégâts critiques, PV, Défense, Défense magique, Esquive, Blocage — toutes utilisées en combat.

## Arbres de compétences (choix d'implémentation)

Contenu dans `src/data/talents.js`, règles dans `src/game/talents.js`, réglages dans `src/config.js` (`XP`, `TALENT_RULES`).
- **Orientations** (DESIGN_DOC §1) : Guerrier → Gardien, Berserker ; Voleur → Assassin, Empoisonneur ; Prêtre → Clerc, Prêcheur, Profane ; Mage → Feu, Glace, Foudre.
- **Structure** : chaque orientation a 5 paliers. Paliers 0 et 2 : nœud secondaire (petit bonus de stats, 3 rangs). Paliers 1, 3 et 4 : nœud principal (nouvelle compétence ou nouveau passif / amélioration d'une compétence, 1 rang). Une branche complète coûte 9 points.
- **Points** : 1 par niveau, dès le niveau 1. Le palier t d'une orientation demande 2 × t points déjà investis dans cette orientation (palier 4 : 8 points). On peut mélanger les orientations, mais les points étant rares, il faut choisir.
- **Réinitialisation** au Maître des compétences contre 10 × niveau du héros en or.
- **XP** : chaque ennemi rapporte 10 + 5 × niveau du donjon, à chaque héros (tombés compris). Niveau L → L+1 : 40 + 20 × L XP (environ 2 combats par niveau). Chaque niveau donne des PV et +1 dans la stat principale (`growth` dans `data/classes.js`).
- **Compétences par orientation** (palier 1 / 3 / 4) :
  - Gardien : Provocation (les ennemis doivent l'attaquer, +30 % Défense) / Rempart (Défendre donne un bouclier) / Mur de boucliers (bouclier sur toute l'équipe).
  - Berserker : Frappe sauvage (+25 % de critique) / Berserk (+3 % de puissance par 10 % de PV manquants) / Déchaînement (zone + Enragé).
  - Assassin : Taillade (ralentit) / Opportuniste (+25 % contre une cible affaiblie) / Déluge de lames (4 coups).
  - Empoisonneur : Lame empoisonnée (poison 4 tours) / Venin virulent (poison +50 % et affaiblit) / Fiole de peste (poison sur tous les ennemis).
  - Clerc : Prière de soins (soin de groupe) / Grâce (Soin Majeur moins cher et plus fort) / Résurrection.
  - Prêcheur : Rénovation (soin sur la durée) / Bouclier sacré / Bénédiction (+20 % puissance à toute l'équipe).
  - Profane : Mot de douleur (ténèbres sur la durée) / Confusion (la cible peut frapper ses alliés) / Fléau (ténèbres sur la durée, zone).
  - Feu : Immolation (brûlure) / Boule ardente (Boule de Feu enflamme) / Pluie de feu (zone + brûlure).
  - Glace : Éclat de glace (ralentit) / Nova de givre (zone + ralentit) / Prison de glace (étourdit : la cible perd son tour).
  - Foudre : Chaîne d'éclairs (zone) / Surcharge (+25 % puissance à un allié) / Tempête (énorme dégât direct).
- **Statuts** (`src/game/statuses.js`) : durée en rounds, décomptée en fin de round (sauf l'étourdissement, consommé au tour perdu) ; les effets sur la durée ignorent la défense. Un statut de même nom se rafraîchit au lieu de se cumuler.
- **Ciblage** : les compétences de zone, de groupe ou personnelles demandent maintenant une confirmation qui affiche l'effet et qui sera touché ; la Résurrection propose les alliés tombés (« Relever … »).

## Marchand (choix d'implémentation)

Réglages dans `src/config.js` (`MERCHANT`), consommables dans `src/data/consumables.js`, logique dans `src/game/merchant.js` et `src/game/consumables.js`.
- **Revente** : uniquement les objets du sac. Prix = (5 + 2 × niveau) × rareté (commun ×1, peu commun ×2, rare ×4, épique ×8, légendaire ×16) × (1 + 20 % par amélioration). Confirmation pour un objet épique ou légendaire ; bouton « vendre tous les communs » avec confirmation.
- **Consommables** : Potion de soin (30 % des PV max, 20 or), Grande potion (60 %, 50 or), Élixir (50 % de la ressource, 35 or), Remède (retire les effets négatifs, 25 or), Plume de phénix (relève un allié à 30 % des PV, 100 or). 9 maximum de chaque. L'équipe part avec 2 potions. Ils ne sont pas perdus en cas de défaite.
- **Équipement en vente** : 4 objets du niveau du donjon (commun 55 %, peu commun 35 %, rare 10 %), renouvelés à chaque nouveau niveau de donjon ; prix d'achat = 4 × prix de revente.
- **Action « Objet » en combat** (DESIGN_DOC §2) : utiliser un consommable prend le tour du héros ; cible toujours choisie, avec l'effet prévu affiché (ex. « Cibler Mage · +28 PV »). La Plume de phénix ne propose que les alliés tombés.

## Forge (choix d'implémentation)

Réglages dans `src/config.js` (`FORGE`), logique dans `src/game/forge.js`.
- **Décraft** : uniquement les objets du sac (jamais un objet porté). Rapporte **1 à 3 matéria (au hasard)** de la rareté de l'objet : matéria d'arme pour une arme, matéria d'armure pour tout le reste (armures, boucliers, bijoux). Confirmation demandée pour un objet épique ou légendaire, et pour le décraft en lot de tous les communs du sac.
- **Amélioration** (+1 à +5), possible sur un objet porté ou dans le sac. Coût du passage à +1/+2/+3/+4/+5 : **2/4/6/8/10 matéria de chaque rareté**, de commun jusqu'à celle de l'objet, plus (10 + 5 × niveau de l'objet) × niveau visé en pièces d'or. Exemple : une arme rare +1 demande 2 matéria d'arme commune, 2 peu commune, 2 rare.
- **Effet** : chaque +1 augmente les stats de l'objet de 10 % (arrondi ; la stat obligatoire gagne au moins +1 par niveau). Les stats de base restent stockées dans `item.stats` ; les stats effectives se lisent via `itemStats(item)`.

## Système d'équipement (choix d'implémentation)

Réglages chiffrés dans `src/config.js` (`COMBAT`, `ITEM`, `LOOT`), contenus dans `src/data/items.js`.
- **Emplacements** : casque, épaulières, plastron, gants, ceinture, bottes, collier, anneau ×2, main droite, main gauche.
- **Stat obligatoire** : Attaque (armes), Défense (armures), Défense magique (bijoux — choix non précisé par le design doc). **Exception : le bouclier a deux stats obligatoires, Défense et Blocage**, et le Blocage peut en plus ressortir en stat secondaire (il se cumule alors et s'affiche sur deux lignes).
- **Un objet commun ne porte que sa/ses stat(s) obligatoire(s) et sa stat principale** (2 stats, 3 pour un bouclier). Les stats secondaires n'apparaissent qu'à partir de peu commun ; elles sont rangées à part dans `item.bonus`.
- **Stat principale** cohérente avec le type : armure lourde = Force, moyenne = Force/Agilité, légère = Intelligence, bâton = Intelligence, dague = Agilité/Intelligence, armes 1M = Force/Agilité, 2M = Force, bijoux = au choix. (Voir « Dégâts physiques et magiques » ci-dessous pour leur effet.)
- **Raretés** : commun (gris, 0 secondaire), peu commun (vert, 1), rare (bleu, 2), épique (violet, 3), légendaire (orange, 4 + passif unique). Les stats obligatoire/principale sont aussi multipliées par la rareté.
- **Niveau** : un objet a le niveau du donjon où il est trouvé ; ses stats en dépendent.
- **Armes** : épée moins puissante, hache intermédiaire, marteau plus puissant ; versions 2 mains plus fortes ; dague faible ; bâton à deux mains. La notion de vitesse d'arme du design doc n'est pas encore rendue (elle ne peut pas être une stat, les communs n'ayant que 2 stats). Arme en main gauche (Voleur, ambidextrie) : son attaque compte à 50 %.
- **Maîtrises** : Guerrier (armes 1M/2M, bouclier, armure lourde/moyenne), Voleur (armes 1M et dagues dans les deux mains, armure moyenne), Prêtre (bâton, dague, armure légère), Mage (bâton, armure légère).
- **Légendaires** : 2 par classe, chacun modifie une compétence de base (puissance, coût ou durée du saignement). Pourront plus tard viser les compétences d'orientation.
- **Combat** : dégâts × 100 / (100 + Défense ou Défense magique de la cible) ; critique selon Taux/Dégâts critiques ; Esquive = attaque évitée ; Blocage = dégâts réduits de moitié. Coup Vicieux est un critique garanti.

## Dégâts physiques et magiques

- **Puissance physique** = Attaque (armes et bonus d'objets) + stat physique de la classe × coefficient : **Force × 0,5** (Guerrier, et par défaut les classes magiques Prêtre et Mage), **Agilité × 0,6** (Voleur). À stat principale égale, un voleur fait donc un peu plus mal qu'un guerrier. Utilisée par l'attaque de base de toutes les classes et par les compétences non magiques ; réduite par la Défense de la cible.
- **Puissance magique** = 2 × Intelligence. Utilisée par les sorts (compétences `magic: true` : Boule de Feu, Éclair, Éclat de Lumière) et par tous les soins ; réduite par la Défense magique de la cible. Elle ne compte jamais pour une attaque à l'arme : un Mage qui tape au bâton fait peu de dégâts.
- Les éléments (feu, glace, foudre, lumière…) viendront plus tard sur les sorts.
- Coefficients dans `src/config.js` (`COMBAT.physStatFactor`, `COMBAT.magicPerInt`) ; stat physique par classe dans `src/data/classes.js` (`physStat`).
- **Butin** : 40 % de chance par ennemi vaincu (commun 50 %, peu commun 30 %, rare 14 %, épique 5 %, légendaire 1 %). En cas de défaite, chaque objet du sac a 50 % de chance d'être perdu ; l'équipement porté n'est jamais perdu.
- **Départ** : chaque héros commence avec une arme et un plastron communs ; les stats de base ont été ajustées pour garder la même puissance qu'avant l'équipement.

## Architecture actuelle (à connaître avant de modifier)

Le prototype monofichier `anyem.html` a été découpé (voir `CLAUDE.md` pour le détail) :
- `src/data/` : `CLASSES` (stats de base, croissance par niveau, maîtrises d'équipement, kit de départ, ressource, compétences), `TALENTS` (arbres), `STATS`, objets (`SLOTS`, `RARITIES`, types d'armes/armures, `LEGENDARIES`), `ENEMIES`, `DUNGEONS`.
- `src/game/` : moteur pur et testé — `combat.js` (file de tour par vitesse, actions, compétences généralisées, IA avec provocation/confusion, fin de combat), `statuses.js` (effets à durée), `talents.js` (points, paliers, effets), `party.js` (héros, niveaux/XP, `getStats()`, `getSkills()`), `items.js` (génération d'objets), `equipment.js` (règles d'équipement, sac), `forge.js`, `merchant.js`, `consumables.js`, `loot.js`, `progression.js` (victoire, défaite, auberge), `formulas.js` (jets et estimations), `rng.js`.
- `src/ui/` : un écran par fichier, `router.js` pour la navigation, `encounter.js` pour le rythme des tours ennemis (`setTimeout`).
- `src/state.js` : état global (`screen`, `party`, `bag`, `materia`, `consumables`, `shop`, `gold`, `dungeonLvl`, `combat`, `hubMessage`, `hubLoot`).
- Rendu par template strings, ré-affichage complet de l'écran à chaque `render()`.

### Corrections apportées lors du découpage

- Ordre de jeu : la vitesse des héros était ignorée dans le tri (seule celle des ennemis comptait).
- Ciblage : l'index de la cible choisie ne correspondait plus à la bonne unité dès qu'un ennemi (ou allié, pour les soins) situé avant dans la liste était mort.
- Saignement de Lacération : il n'était jamais appliqué. C'est désormais un statut (dégâts par fin de round pendant 3 rounds, proportionnels à la puissance physique).
- Défendre : la garde restait active tout le combat ; elle dure maintenant jusqu'au prochain tour du héros.
- Auberge : ne relevait pas les héros tombés lors d'une victoire, qui restaient morts sans aucun moyen de revenir.
- Noms de héros échappés à l'affichage (un nom contenant du HTML cassait la page).
- Estimation des soins : affiche la valeur exacte (le soin n'a pas de variance) ; celle des compétences de zone utilise leur vraie fourchette.

## Ce qui n'est PAS encore fait (voir DESIGN_DOC.md pour le détail complet)

- Éléments des sorts (feu, glace, foudre… plus ou moins efficaces selon les monstres)
- Classes Paladin et Chasseur (orientations non définies dans le design doc, à inventer)
- Donjons à étages multiples avec boss tous les x étages, plusieurs donjons de niveau croissant
- Banque
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
2. ~~Arbres de compétences par classe/orientation~~ (fait, avec XP/niveaux et effets de combat)
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
