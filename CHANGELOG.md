# Journal des versions d'Anyem

Chaque version officielle a une étiquette Git (`vX.Y.Z`) et une page de téléchargement sur
GitHub (onglet « Releases ») avec le jeu Windows (`Anyem-X.Y.Z.exe`, sans installation) et le
jeu en un seul fichier (`anyem.html`). Numérotation : `X` = grande refonte, `Y` = nouvelle
version jouable (nouveautés), `Z` = corrections. Tant que `X` vaut 0, le jeu est en bêta (les
versions sont publiées comme « pré-versions ») ; 1.0.0 sera la première version finale. Les
versions 0.0.x sont les étapes de développement d'avant le jeu Windows (une par fusion dans `main`).
Marche à suivre pour publier une version : `docs/RELEASES.md`.

## [0.4.0] - 2026-09-28

Quatrième bêta.

- **Le Macabre utilise du Mana** : ses compétences coûtent du Mana, et ses âmes deviennent une jauge à part (pastilles pâles en combat) ; ses compétences les plus fortes dépensent des âmes en plus du Mana.
- **Écran de combat refait** :
  - la scène remplit toute la fenêtre, sans bandes vides ; noms, PV et chiffres sont nets ;
  - le sol reste dégagé sous les combattants, et chacun a son emplacement tracé au sol (avant et arrière pour les héros) ;
  - une flèche dorée montre qui joue ; au ciblage, une flèche rouge (attaque, malus) ou verte (soin, bonus) passe d'une cible à l'autre, à la souris comme à la manette ;
  - une action de zone désigne toutes ses cibles avant la confirmation.
- **Effets des sorts** : boules de feu, éclats de glace, éclairs, orbes d'ombre, spirales d'âmes, flèches… volent vers leurs cibles et éclatent à l'impact ; les soins, boucliers, bénédictions et malédictions ont leur effet ; les coups d'arme prennent la couleur de la compétence (sang, poison…).
- **Police médiévale fantastique** (Almendra) pour les titres, les boutons et les noms.
- Apparences : cheveux noirs moins sombres, cuir du Scarifié moins noir, surtout de profil.
- Le Scarifié et le Macabre rejoignent le feu de camp de l'écran titre.
- Les pages de téléchargement ne proposent plus que le jeu Windows (`.exe`) et le jeu dans le navigateur (`anyem.html`).

## [0.3.0] - 2026-09-28

Troisième bêta.

- Nouvelle classe : **Le Macabre / La Macabre**. Il absorbe l'âme de chaque ennemi qui meurt (3 au plus, gardées d'un combat à l'autre). Chaque âme le renforce ou se dépense dans ses compétences, mais les âmes gardées le rongent, et à leur maximum elles rongent aussi ses alliés. Trois orientations : **Soldat décharné** (arme à deux mains), **Mur d'os** (tank, bouclier) et **Nécromancien** (sorts à distance). Neuf nouveaux légendaires.
- **Une seule orientation par héros** : elle coûte les 50 points du niveau maximum (petits paliers à 3 rangs, signature au dernier point). Le premier point de talent la choisit ; la réinitialisation permet d'en changer. Les anciennes sauvegardes gardent l'orientation la plus investie.
- **Chaque orientation a ses armes** (l'Assassin ne porte que des dagues, l'Empoisonneur des dagues ou des épées…). Les coups, sorts et soins demandent une arme de l'orientation en main (un arc pour tirer, un bouclier pour Coup de bouclier) ; les buffs, provocations et pièges se lancent avec n'importe quelle arme.
- **Chaque classe porte son type d'armure** ; l'Impassible porte de l'armure lourde en Gardien, moyenne en Berserker. Ce qui n'est plus portable retourne au sac, et le héros est rééquipé avec le meilleur du sac.
- Écrans Personnage et Création : ce que porte chaque orientation et la stat à chercher sur les objets.
- **Stats secondaires selon le type d'objet** : plus fortes sur une arme à deux mains, un peu plus faibles sur une dague ; celles d'une arme en main gauche comptent aux trois quarts.
- **Événements refaits en dilemmes** : chaque rencontre propose deux ou trois choix avec leur prix (or, PV, matéria, un objet du sac…). Huit nouvelles rencontres : le prisonnier, le pèlerin, la stèle aux deux visages, l'alchimiste fou, le grimoire interdit, le mercenaire, le forgeron fantôme, le gouffre qui murmure. Nouvelles récompenses : bénédiction au prochain combat, XP, purification.
- Cadres de rareté : fiches et cases d'inventaire de plus en plus ouvragées du commun au divin (éclat orangé des légendaires, effet « foil » rouge des divins).
- Équilibrage : Assassin renforcé en début d'arbre.

## [0.2.0] - 2026-09-28

Deuxième bêta.

- Nouvelle classe : **Le Scarifié / La Scarifiée**. Sans ressource, il paie chaque compétence de ses PV (jamais le dernier). Trois orientations : **Acharné** (corps à corps, saignements), **Violent** (arc, tirs dévastateurs, « Dernier souffle » : tomber à 1 PV pour une frappe énorme) et **Liens du sang** (soins à l'Intelligence, vol de vie donné aux alliés, Pacte de sang). Il peut se relever une fois par combat. Neuf nouveaux légendaires.
- Classes renommées : L'Impassible, Le Dissimulé, Le Dévot, L'Élémentaliste, Le Vénateur, Le Lumineux ; forme féminine au choix à la création et au recrutement (La Dissimulée, La Vénatrice…).
- Poison et saignement distincts : le poison dure longtemps, fait peu de dégâts et se cumule (3 doses) ; le saignement est court et fort. L'Empoisonneur ne fait plus que du poison et gagne **Poison foudroyant** (toutes les doses agissent d'un coup).
- Nouvelle stat secondaire **Mana** sur l'équipement (utile aux seules classes à Mana) ; détail du maximum au survol de la ligne Mana.
- Onglet Légendaires : exemplaire de niveau 50 et toutes les stats secondaires possibles avec leur fourchette. « Taux critique » devient « Coup critique ».
- Équilibrage : Berserker, Gardien et Empoisonneur retouchés.
- Interface : soins des autres classes en icônes dorées (le rouge est réservé au Scarifié) ; liste des compétences sur deux colonnes quand il y en a beaucoup ; bulles des stats lisibles.

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
