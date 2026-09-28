# Crédits des graphismes

- `raven/` : packs **Raven Fantasy** de Clockwork Raven Studios (Green Forest v2, Green Forest 2, Green Dungeon, Miner's Cave, Winter Forest, The Underworld, Green Village, Green Buildings, Craft Stations, Interiors, Cozy Home), achetés par le joueur. Archives d'origine dans `texture zip/map/`. Planches RPG Maker MV réduites en tuiles de 16 px (`<pack>_A1`, `_A2`, `_A4`, `_A5`) et planches d'objets 16 × 16 d'origine (`<pack>_obj`). Licence de l'éditeur : utilisation dans ses propres jeux ; ne pas redistribuer les fichiers bruts.
- `heroes/` : **Fantasy RPG Heroes pack**, par Franuka (https://franuka.itch.io/fantasy-rpg-heroes-pack) — usage commercial et non commercial autorisé, modification autorisée, crédit demandé, pas de redistribution telle quelle. Planches des quatre héros (Gladiator, Beastmaster, Sorcerer, Swashbuckler) remontées : tête retirée (les coupes sont redessinées dans `src/ui/heroHeads.js`), animations retenues (attente, marche, attaque, dégâts, sort).
- `mobs/` : **Fantasy RPG Monster pack**, par Franuka (https://franuka.itch.io/fantasy-rpg-monster-pack) — mêmes conditions. Planches d'attente, de marche, d'attaque, de dégâts et de mort des 55 monstres, certaines recolorées en jeu.
- `mobs/Minotaur_*`, `FlyingDemonRed_*`, `FlyingDemonBlue_*`, `Gorgon_*`, `Wendigo_*`, `SnowWendigo_*` : boss **Minotaur**, **Flying demon**, **Medusa**, **Wendigo** et **Snow wendigo**, par Akari21 (https://akari21.itch.io/) — usage personnel et commercial autorisé, modification autorisée, pas de revente ni de redistribution, crédit apprécié. Archives d'origine dans `texture zip/personnages/` ; planches à contour sombre, animations attente, marche, attaque, sort, dégâts et mort.
- `townsfolk/` : **Fantasy RPG Character pack (Medieval townsfolk)**, par Franuka — licence Creative Commons BY 4.0 (crédit : Franuka, https://franuka.itch.io/).
- `icons/equipment.png` : icônes d'équipement 16 × 16 fournies par le joueur (27 pièces × 6 raretés, commun → divin : casques, plastrons, épaulières, gants, bottes en léger / moyen / lourd, 9 armes, anneau, collier, bouclier).
- `icons/raven16.png` : **Raven Fantasy Icons (Free)**, Clockwork Raven Studios — planche 16 × 16 (2 192 icônes), plus une ligne de variantes dorées d'icônes rouges (soins lumineux, le rouge étant réservé au Scarifié), générée par `tools/recolor_icons.py`.
- `ui/` et `fonts/` : **RPG UI pack**, par Franuka (https://franuka.itch.io/) — usage commercial et non commercial autorisé, crédit apprécié, pas de redistribution telle quelle. Cadres recadrés (`box_*`), variante sombre `box_night` / `slot_night` générée à partir de `BGbox_01B` / `Slot_02_Empty`.
- `logo/` : logo d'Anyem (icône du jeu et de l'onglet) dessiné en pixel art à partir du « A » de la police FantasyRPGtitle (RPG UI pack, Franuka), généré par `tools/logo.py` (qui écrit aussi `dist/anyem.ico`).

## Police Almendra

`assets/fonts/Almendra-Regular.ttf` et `Almendra-Bold.ttf` : « Almendra » d'Ana Sanfelippo, sous licence SIL Open Font License 1.1 (https://openfontlicense.org), obtenue via Google Fonts. Police des titres, boutons et noms du jeu.

## Projectiles et impacts (effets des sorts)

`assets/fx/` : projectiles et animations d'impact des packs « Fantasy RPG Heroes » et « Fantasy RPG Monster » de Franuka (dossiers « Projectiles & Breakables » et « EXTRAS/Projectiles »), mêmes conditions que les autres planches Franuka (crédit à l'auteur).
