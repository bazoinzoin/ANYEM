# Journal des versions d'Anyem

Chaque version officielle a une étiquette Git (`vX.Y.Z`) et une page de téléchargement sur
GitHub (onglet « Releases ») avec le jeu Windows (`Anyem-X.Y.Z.exe`, sans installation) et le
jeu en un seul fichier (`anyem.html`). Numérotation : `X` = grande refonte, `Y` = nouvelle
version jouable (nouveautés), `Z` = corrections. Tant que `X` vaut 0, le jeu est en bêta (les
versions sont publiées comme « pré-versions ») ; 1.0.0 sera la première version finale. Les
versions 0.0.x sont les étapes de développement d'avant le jeu Windows (une par fusion dans `main`).
Marche à suivre pour publier une version : `docs/RELEASES.md`.

## [0.1.0] - 2026-09-28

Première bêta jouable.

- Version Windows : `Anyem-0.1.0.exe` (Electron), à lancer d'un double-clic, sans installation ; fenêtre du jeu avec son icône, plein écran avec F11 ou Alt+Entrée.
- Sauvegardes de la version Windows rangées dans le dossier de l'application (`%APPDATA%\Anyem`) : elles ne dépendent plus de l'emplacement du fichier.
- Numéro de version affiché sur l'écran titre ; journal des versions (ce fichier) ; chaque version est archivée sur GitHub.
- Fonds de combat : un décor par sous-zone (lisière, crypte, mine, lac de lave, neige, Abîme…).
- Barres aux couleurs des ressources : PV verts, Mana bleue, Énergie jaune, Rage rouge ; PV des monstres affichés en chiffres pendant le combat.
- Légendaires renommés (noms courts, clins d'œil discrets) avec une citation chacun ; l'onglet Légendaires montre un exemplaire de niveau 50 et toutes les stats secondaires possibles avec leur fourchette.
- « Taux critique » devient « Coup critique » ; le lexique explique le calcul des critiques.

## [0.0.15] - 2026-09-28

- Jouable à la manette (Xbox, PlayStation, Switch Pro…) : marche sur les cartes, curseur dans les menus et en combat.
- Logo du jeu (icône Windows et d'onglet) ; écran titre plein écran, plus grand et plus décoré.

## [0.0.14] - 2026-09-28

- Niveau du butin plafonné au niveau du joueur.
- Carte dégagée : encadrés de l'équipe affichés par le bouton Personnage, aide aux déplacements repliée.

## [0.0.13] - 2026-09-27

- Icônes d'équipement par rareté (27 pièces × 6 raretés).
- Déplacement un peu plus rapide.

## [0.0.12] - 2026-09-27

- Intérieurs des maisons refaits (murs et sols façon RPG Maker, meubles selon le métier).
- Arbres de talents étirés : 15 paliers, 2 bonus sur 3 par petit palier, 28 nouveaux sorts et passifs.

## [0.0.11] - 2026-09-27

- Grande liste de retours (lots A à H) : butin et difficultés (Cauchemar, Insanie), écran de mort, sauvegardes (4 emplacements, menu Échap), arbres de talents, légendaires tirés de la littérature, tenues, lexique au survol, événements sur la carte, village refait avec intérieurs.
- Médailles de zone aux portails.

## [0.0.10] - 2026-09-27

- Habillage pixel art de l'interface, héros personnalisables, bestiaire graphique (Franuka) et boss d'Akari21.

## [0.0.9] - 2026-09-27

- Partie visuelle : sprites, décors des zones, village, marche, combat animé.

## [0.0.8] - 2026-09-26

- Exploration des étages sur carte, graphismes de la Forêt Maudite, village à parcourir.

## [0.0.7] - 2026-09-26

- Rareté Divin et Forge divine ; zones 1 à 5 (niveaux 1 à 50) en sous-zones.

## [0.0.6] - 2026-09-26

- Événements d'expédition ; défense, combats multiples, sorts de départ, difficulté, fabrication, bestiaire.

## [0.0.5] - 2026-09-26

- Chasseur et Paladin ; arbres de talents sur 50 niveaux ; Voleur à Énergie ; catalogue des effets, remèdes, butin.

## [0.0.4] - 2026-09-26

- Donjons à étages avec boss, expéditions et capacités ennemies.

## [0.0.3] - 2026-09-26

- Marchand, arbres de compétences, expérience et niveaux, Forge, dégâts physiques et magiques, jeu en un seul fichier.

## [0.0.2] - 2026-09-26

- Prototype restructuré et système d'équipement.

## [0.0.1] - 2026-09-26

- Import du prototype d'Anyem.
