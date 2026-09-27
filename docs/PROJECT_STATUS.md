# Anyem — RPG tour par tour roguelite

Prototype développé par itérations dans le chat Claude (claude.ai) avant transfert vers Claude Code.
Ce fichier résume l'état du projet pour reprendre le développement sans perdre le contexte.

## Fichiers

- `index.html` + `css/` + `src/` — le jeu, en modules ES sans build ni dépendance. Lancer avec `npm start` (voir `README.md`).
- `docs/DESIGN_DOC.md` — le document de conception original de l'utilisateur : vision complète du jeu (classes, combat, équipement, arbres de compétences, donjons, village). C'est la référence pour toutes les décisions de design futures.
- `CLAUDE.md` — architecture et conventions à respecter lors des modifications.

## Ce qui est déjà fonctionnel

- **Création d'équipe** : 4 héros, chacun d'une classe au choix parmi 6 (Guerrier/Rage, Voleur/Énergie, Prêtre/Mana, Mage/Mana, Chasseur/Énergie, Paladin/Mana ; doublons permis), avec nom personnalisable.
- **Village (hub)** : affichage de l'équipe, portails vers les donjons (progression, points de départ), Auberge (soin complet fonctionnel), Forge, Marchand, écran de statistiques détaillées par personnage.
- **Combat tour par tour** : ordre de jeu basé sur la vitesse, actions Attaquer/Défendre/Objet/Compétence/Passer le tour (plusieurs actions par tour pour le Voleur), ciblage toujours demandé explicitement (même s'il ne reste qu'une cible), tours ennemis avec délai visible (pas instantanés, ~0.8s + mise en évidence de l'unité qui agit), estimation de dégâts/soins affichée sur les boutons et en tooltip, tooltips descriptifs sur toutes les actions/classes/services, victoire → or + progression du niveau de donjon, défaite → perte d'or + retour au village.
- **Équipement** (voir détail ci-dessous) : 11 emplacements, 5 raretés, objets nivelés, butin en fin de combat, sac partagé, écran Équipement avec comparaison des stats avant d'équiper, objets légendaires liés à une classe.
- **Forge** (voir détail ci-dessous) : décraft des objets du sac en matéria, amélioration +1 à +5, fabrication d'objets.
- **Runomancien** (`game/runes.js`) : relance une stat secondaire choisie (nouvelle stat parmi celles absentes de l'objet, ou la même avec une autre valeur) ; prix selon la rareté (`RUNES` dans `config.js` : 60 / 150 / 400 / 1000 or).
- **Donjons à étages** (voir détail ci-dessous) : Forêt Maudite et Catacombes oubliées, 25 étages chacun, un boss tous les 5 étages, expéditions sans retour possible avant le boss, points de départ après chaque boss, ennemis et boss avec capacités.
- **Marchand** (voir détail ci-dessous) : revente du butin, achat de consommables et d'équipement ; action « Objet » en combat.
- **Expérience et niveaux** : XP à chaque victoire, montée de niveau (PV et stat principale), 1 point de talent par niveau.
- **Arbres de compétences** (voir détail ci-dessous) : orientations du design doc, écran « Maître des compétences » au village.
- **Effets de combat** : buffs/debuffs, poisons et saignements, soins sur la durée, boucliers, étourdissement, provocation, confusion, soins de groupe, résurrection, multi-frappe.
- **Stats complètes** (DESIGN_DOC §2) : Force/Agilité/Intelligence, Attaque, Vitesse, Taux et Dégâts critiques, PV, Défense, Défense magique, Esquive, Blocage — toutes utilisées en combat.

## Arbres de compétences (choix d'implémentation)

Contenu dans `src/data/talents.js`, règles dans `src/game/talents.js`, réglages dans `src/config.js` (`XP`, `TALENT_RULES`).
- **Orientations** (DESIGN_DOC §1) : Guerrier → Gardien, Berserker ; Voleur → Assassin, Empoisonneur ; Prêtre → Clerc, Prêcheur, Profane ; Mage → Feu, Glace, Foudre.
- **Niveau maximum 50** (`XP.maxLevel`) : 1 point de talent par niveau, donc 50 points au maximum.
- **Sorts de départ** : un héros commence **sans sort**. Le palier 0 de chaque orientation contient son sort de départ (1 rang) : c'est le premier point de talent. Guerrier : Gardien → Cri de Guerre, Berserker → Frappe Brutale ; Voleur : Assassin → Coup Vicieux + Éviscération, Empoisonneur → Coup Vicieux + Lacération ; Prêtre : Clerc → Soin Majeur, Prêcheur → Soin Majeur + Éclat de Lumière, Profane → Trait d'ombre ; Mage : Feu → Boule de Feu, Glace → Trait de givre, Foudre → Éclair ; Chasseur : Œil de Faucon → Tir visé, Traqueur → Tir rapide ; Paladin : Templier → Frappe du croisé, Lumière → Lumière sacrée. Un même sort appris par deux orientations ne compte qu'une fois.
- **Structure** : chaque orientation a **10 paliers (0 à 9) et 50 rangs** : au niveau 50, on complète exactement une orientation (on peut mélanger, mais alors pas de signature). Le palier t demande 5 × t points investis dans l'orientation (palier 9 : 45 points). Modèle commun : 12 nœuds secondaires (bonus à plusieurs rangs), 3 nouvelles compétences (paliers 1, 4, 7), 3 passifs (paliers 3, 6, 8) et la **compétence signature** au palier 9.
- **Réinitialisation** au Maître des compétences contre 10 × niveau du héros en or.
- **XP** : chaque ennemi rapporte 10 + 5 × niveau du donjon, à chaque héros (tombés compris). Niveau L → L+1 : 80 + 40 × L XP. Chaque niveau donne des PV et +1 dans la stat principale (`growth` dans `data/classes.js`).
- **Passifs disponibles** (voir l'en-tête de `data/talents.js`) : berserk, vol de vie, exécution (bonus sous 30 % de PV), bonus contre cible affaiblie, bonus de zone, garde renforcée, boucliers renforcés, soins, dégâts sur la durée, ressource max / régénération, Rage par coup, combo sur critique, Énergie rendue par les finishers. Compétences : `cleanse` (retire les effets négatifs), `resourceGain` + `oncePerCombat`, `executePct`.
- **Compétences par orientation** (palier 1 / 4 / 7 / signature 9 — passifs 3 / 6 / 8) :
  - Gardien : Provocation / Coup de bouclier (étourdit) / Mur de boucliers / **Dernier rempart** (Bouclier + Protection sur l'équipe, provocation) — Rempart, Garde de fer, Cri de défi.
  - Berserker : Frappe sauvage / Tourbillon (zone) / Exécution / **Carnage sanglant** (zone + Enragé) — Berserk, Frénésie, Sang bouillant.
  - Assassin : Taillade (générateur) / Poussée d'adrénaline (Énergie, 1 fois par combat) / Déluge de lames (finisher) / **Marque de la mort** (finisher critique garanti) — Sceau du destin, Instinct du tueur, Rafale.
  - Empoisonneur : Lame empoisonnée (générateur) / Gaz nauséabond (poison + Affaibli en zone) / Fiole de peste (finisher de zone) / **Mort lente** (finisher : poison énorme + Terreur) — Venin virulent, Hémorragie, Poison paralysant.
  - Clerc : Prière de soins / Résurrection / Purification (retire les effets négatifs) / **Miracle** (grand soin de groupe, purification, Bouclier) — Grâce, Prière fervente, Résurrection supérieure.
  - Prêcheur : Rénovation / Bouclier sacré / Jugement (lumière + Brûlure) / **Hymne divin** (Régénération, Bouclier, Puissance sur l'équipe) — Rénovation persistante, Bouclier de lumière, Égide supérieure.
  - Profane : Mot de douleur / Confusion / Fléau / **Apocalypse** (zone, Ténèbres, Affaibli) — Douleur prolongée, Démence (Confusion + Terreur), Contagion.
  - Feu (dégâts sur la durée) : Immolation / Mur de flammes / Pluie de feu / **Météore** — Boule ardente, Feu persistant, Embrasement.
  - Glace (dégâts directs + ralentissements) : Éclat de glace / Nova de givre / Lance de glace / **Blizzard** — Givre persistant, Éclatement, Gel profond.
  - Foudre (gros dégâts directs + étourdissement) : Chaîne d'éclairs / Onde de choc (étourdit) / Tempête / **Jugement céleste** (zone, étourdit) — Éclair renforcé, Électrocution, Paralysie.
  - Œil de Faucon (Chasseur, gros tirs coûteux) : Tir perçant / Salve (zone) / Tir de l'aigle / **Tir fatal** (critique garanti, bonus d'exécution) — Tir ajusté, Calme du tireur (+Énergie), Flèche perforante.
  - Traqueur (Chasseur, petits tirs, contrôle, pièges) : Piège à mâchoires / Tir incapacitant (ralentit) / Champ de givre (pièges de givre sur tous) / **Terrain piégé** — Flèches barbelées, Maître piégeur, Tir éclair.
  - Templier (Paladin tank, Force) : Intercession (encaisse la moitié des dégâts d'un allié) / Sceau de vie (auto-soin sur la Force) / Aura de protection / **Sacrifice divin** — Vengeance sacrée (vol de vie), Garde du croisé, Martyr.
  - Lumière (Paladin soigneur, Intelligence) : Lumière de l'aube (soin de groupe) / Épuration (retire les effets négatifs) / Sceau de protection / **Lumière divine** — Main de lumière, Lumière purifiante, Aura de guérison. Soins un peu moins forts que le Prêtre (Lumière sacrée 0,9 contre Soin Majeur 1,1 ; soin de groupe 0,45 contre 0,55), compensés par une meilleure survie et la purification.
- **Effets (buffs / debuffs)** : un **catalogue unique** (`src/data/effects.js`). Un effet est défini une seule fois ; une compétence (héros ou ennemi) ne fait que l'appliquer via `effects` (à ses cibles) ou `selfEffects` (au lanceur), avec sa durée et, pour les effets à valeur, sa puissance. C'est la compétence qui décide qui est touché (un ennemi, un allié, toute l'équipe…), jamais l'effet.
  - Buffs : **Bouclier** (absorbe des dégâts), **Régénération** (soin par tour), **Puissance** (+25 % puissance physique et magique), **Hâte** (+25 % Vitesse), **Protection** (+50 % Défense et Défense magique), **Provocation** (attire les attaques, +30 % Défense), **Enragé** (+30 % puissance physique, −20 % Défense).
  - Debuffs : **Poison**, **Saignement**, **Brûlure**, **Ténèbres** (dégâts par tour), **Ralenti** (−30 % Vitesse), **Étourdi** (perd son prochain tour), **Confus** (1 chance sur 2 de frapper un allié), **Affaibli** (−20 % puissance physique et magique), **Terreur** (−30 % Défense et Défense magique).
  - Exemples : Rempart (Défendre), Mur de boucliers (toute l'équipe), Bouclier sacré (un allié) et Mur d'os (ennemi) appliquent tous l'effet Bouclier ; Hymne divin et Cri de ralliement appliquent Puissance ; le Hurlement du Loup alpha applique Puissance + Hâte ; la Malédiction applique Affaibli.
  - Durée en tours, décomptée en fin de tour (sauf l'étourdissement, consommé au tour perdu) ; les dégâts et soins par tour ignorent la défense. Le même effet appliqué deux fois se rafraîchit au lieu de se cumuler ; des effets différents cohabitent (Poison + Saignement).
- **Ciblage** : les compétences de zone, de groupe ou personnelles demandent maintenant une confirmation qui affiche l'effet et qui sera touché ; la Résurrection propose les alliés tombés (« Relever … »).

## Classes à Énergie : Voleur (choix d'implémentation)

- **Plusieurs actions par tour** : chaque action coûte de l'Énergie — Attaquer 35, Défendre 20, Objet 20, compétences selon leur coût. Le Voleur garde la main tant qu'il peut payer une action ; bouton **« Finir le tour »** pour s'arrêter avant (l'Énergie restante est conservée). S'il ne peut plus rien payer, son tour se termine seul. Une seule garde par tour.
- **Énergie** : 100 max, pleine au début de chaque combat, **+45 au début de chacun de ses tours** (pas une recharge complète : place pour des compétences/talents qui en rendent).
- **Points de combo** (inspiré de WoW), 5 max, remis à zéro à chaque combat : les **générateurs** (Coup Vicieux, Taillade, Lame empoisonnée) en donnent 1 ; les **finishers** (Éviscération, Lacération, Déluge de lames, Fiole de peste) les dépensent tous et exigent au moins 1 point. Puissance et valeur des effets d'un finisher sont données **par point de combo** (`finisher: true`, voir `game/combo.js`, `atCombo`).
- **Passer le tour** : disponible pour toutes les classes (les autres n'ont qu'une action par tour, et leurs actions de base sont gratuites).
- Équilibrage (simulation) : le Voleur est le meilleur DPS mono-cible (~1,3 × le Mage en dégâts directs), difficulté globale des donjons proche de la version précédente.

## Scène de combat (sprites)

- Au-dessus des fiches des combattants : scène sur fond neutre (un vrai décor de combat viendra plus tard), l'équipe à gauche tournée vers les monstres à droite ; corps à corps plus près du centre, distance en retrait ; boss agrandi.
- Animations générées par le code : respiration, entrée en scène, marche sur place et flèche au-dessus de l'unité active, bond + entaille pour un coup d'arme, halo et étincelles pour un sort / soin / objet, recul + éclair blanc à l'impact, chiffres de dégâts (jaunes et plus grands en critique) et de soins, nom des effets posés, clignement puis disparition d'un monstre vaincu, héros à terre couché et grisé.
- Ciblage : les cibles valides sont entourées ; clic sur le personnage ou sur le bouton (estimation affichée sur le bouton). Fin de combat : le dernier coup reste visible ~1,2 s (`TIMING.outcomeMs`).

## Combat : règles de défense et journal (choix d'implémentation)

- **Esquive** (rare, max 50 %) : annule entièrement un coup direct, quel qu'il soit (attaque simple ou compétence, physique ou magique, dans les deux camps). **Blocage** (plus fréquent, boucliers, max 50 %) : réduit un coup direct de 50 %. **Riposte** : renvoie des dégâts au corps à corps. Les dégâts sur la durée ne s'esquivent pas.
- **Effets sur la durée** (poison, régénération…) : appliqués et décomptés **à la fin du tour de l'unité** qui les porte (un effet posé sur soi pendant son tour n'est pas décompté ce tour-là).
- **Journal** : chaque coup indique critique / bloqué / esquivé ; le calcul détaillé apparaît au survol (puissance × compétence × critique × défense × variation, puis blocage, garde, bouclier). Le journal du dernier combat reste consultable après le combat ; un résumé de victoire détaille or, XP, équipement, matéria, consommables et montées de niveau.
- **Tente** : 30 % des PV et de la ressource, une fois par palier de 5 étages, 300 or. Prix des consommables doublés. XP : niveau L → L+1 demande 80 + 40 × L.

## Expédition : étages et soins hors combat (choix d'implémentation)

- **Plusieurs combats par étage** : 2 ou 3 combats par étage ordinaire (`DUNGEON.fightsPerFloor`), le boss seul sur son étage. L'événement éventuel se tire à la fin de l'étage.
- **Effets négatifs persistants** : ils restent d'un combat à l'autre (durée décomptée seulement en combat) jusqu'à un remède, une purification ou le retour au village ; les effets positifs disparaissent à la fin de chaque combat. Ils s'affichent sur les héros entre deux combats.
- **Hors combat** (entre deux combats) : bouton **Objets** (tous les consommables, remèdes compris) et bouton **Sorts** (choix du héros, grisé s'il n'a aucun soin ; seuls les soins directs et les purifications, `game/field.js`, pour éviter de se sur-préparer avec des buffs).

## Événements d'expédition (choix d'implémentation)

- À la fin de chaque étage ordinaire, **35 %** de chance d'un événement (`EVENT_RULES`, contenu dans `src/data/events.js`, règles dans `src/game/events.js`). Il faut le régler (un choix ou « Passer son chemin ») avant l'étage suivant.
- Chaque choix affiche ses chances et ses issues. Un événement ne tue jamais (1 PV minimum).
- Événements : Sorcière (50 % objet peu commun ou mieux / 50 % deux héros perdent 30 % de leurs PV), Autel oublié (offrande payante : soin / piller : or + matéria ou malédiction), Coffre abandonné (or + consommable ou piège), Voyageur blessé (une potion contre une matéria rare et de l'or), Source mystérieuse (soin ou poison), Joueur de dés (pari), **Marchand ambulant** (3 équipements peu communs à légendaires à 2 × le prix de revente au lieu de 4 ×, consommables à 75 % du prix).
- Format extensible : coût (or selon le niveau, consommable) et effets (or, objet de rareté minimale, matéria, consommable, soin, blessures).

## Difficulté (choix d'implémentation)

- Rareté **Divin** (rouge) : 5 secondaires, fourchette au-dessus du légendaire. Uniquement sur les boss : 0 % en Balade et Aventure, 1 % en Guerre, 5 % en Horreur (`bossRarityWeights`). Pas de matéria divine (`MATERIA_RARITIES`) : un divin se décrafte en matéria légendaires et s'améliore avec elles.
- **Forge divine** (onglet de la Forge, `absorbLegendary` dans `game/forge.js`) : un objet divin absorbe le pouvoir unique d'un légendaire du sac, qui est détruit (`item.absorbed`, appliqué par `getSkills`, sans réserver l'objet à une classe ; un nouveau pouvoir remplace l'ancien).

- 4 niveaux (`DIFFICULTIES` dans `config.js`) : Balade ×1 (réglages d'origine), Aventure ×1,3, Guerre ×1,7, Horreur ×2,2 sur les PV et l'Attaque des ennemis.
- Chaque niveau surcharge les chances et raretés de butin (`lootRules` dans `game/difficulty.js`) ; les types d'équipement restent équiprobables, l'or et l'XP ne changent pas.
- Choix à l'écran « Difficulté » du village (`ui/screens/difficulty.js`), bloqué pendant une expédition ; stocké dans `state.difficulty`.

## Village : auberge et banque (choix d'implémentation)

- **Personnages sur les cartes** (`ui/spriteCatalog.js`) : un sprite par classe habitants et monstres issus d'une compilation de charsets RPG Maker 2003 (`assets/rm2k3/`, 4 directions, recolorés par zone) ; l'équipe avance en file indienne. Usage non commercial (voir `assets/CREDITS.md`).
- **Village à parcourir** (`data/village.js` : carte 34 × 24, bâtiments, décors, arbres, habitants ; `game/village.js` : grille de marche, parler ; `ui/villageView.js` : rendu et contrôles). Chaque service est un habitant (aubergiste, forgeron, banquier, marchande, runomancienne, maître des compétences, traqueur du bestiaire, Oracle de la difficulté, garde des portails) : Espace/Entrée/E face à lui, ou clic dessus (le groupe y marche). Passer sous l'arche de la porte ouvre aussi les portails (`ui/screens/portals.js`). Équipement, statistiques et stratégie restent en raccourcis sous la carte. Les habitants utilisent le sprite du héros recoloré (`tintedSheet`, `ui/actors.js`) en attendant de vrais personnages. Retour d'expédition : le groupe réapparaît à la porte (`arriveAtVillage`).

- Auberge : au plus 4 compagnons au repos (`INN.maxReserve`) ; on peut renvoyer définitivement un compagnon au repos (`dismiss`) : ses objets communs portés sont détruits, les autres rendus au sac.
- Bestiaire (`game/bestiary.js`, écran `ui/screens/bestiary.js`) : `state.bestiary` note les rencontres (`recordEncounter`, au lancement du combat) et les ennemis vaincus (`recordKills`, victoire et défaite). Fiche par donjon : stats au premier et dernier étage (difficulté actuelle, via `enemyStats`), capacités ; page vide « ??? » pour un ennemi jamais rencontré.

- **Auberge** (`game/roster.js`, écran `inn`) : repos gratuit ; **recrutement** d'un compagnon de n'importe quelle classe, au niveau 1 avec l'équipement de départ, à la place d'un membre de l'équipe ; le héros remplacé part **à l'auberge** (`state.reserve`) avec son équipement et ses talents, et n'y gagne pas d'XP. On peut échanger à tout moment un héros de l'équipe avec un héros de l'auberge (au village uniquement). Survoler un héros affiche l'équipement qu'il porte.
- **Banque** (`game/bank.js`, écran `bank`) : dépôt et retrait d'or, d'objets, de consommables et de matéria. Ce qui est à la banque ne se perd pas lors d'une défaite. Fermée pendant une expédition. Le sac reste limité à 9 exemplaires par consommable ; la banque n'a pas de limite.
- **Sac du joueur** : objets, consommables et matéria (visibles dans l'écran Équipement ; la Forge ne fait que les utiliser).
- **Butin** : n'importe quel légendaire peut tomber, quelle que soit l'équipe (on peut recruter la classe correspondante).

## Corps à corps / distance (choix d'implémentation)

- **Position** de chaque héros choisie au village (bouton **Stratégie**, `hero.position`) ; par défaut Guerrier, Voleur, Paladin au corps à corps, Prêtre, Mage, Chasseur à distance. Chaque combat repart de cette position (`unit.row`).
- **Ciblage** : un héros au corps à corps a 3 fois plus de chances d'être ciblé (`COMBAT.meleeTargetWeight`) ; la Provocation reste prioritaire.
- **Armes** : attaque simple et compétences physiques (« à l'arme ») impossibles si la position ne correspond pas à l'arme (arc : distance ; autres : corps à corps). Sorts, soins, pièges, objets : partout.
- **Changer de position** (bouton en combat) : prend tout le tour ; pour le Voleur et le Chasseur, seulement avant d'avoir agi.
- **Riposte** (nouvelle stat secondaire, max 50 %) : une unité au corps à corps frappée au corps à corps (attaque simple ou compétence physique sur une cible) peut contre-attaquer pour 50 % de sa puissance physique, réduite par la Défense. Guerrier 5 %, Voleur et Paladin 3 % de base ; certains ennemis en ont (Chevalier squelette 20 %…).
- **Ennemis** : magiciens (Spectre, Reine sylvestre, Nécromancien, Banshee, Liche) à distance ; les autres au corps à corps.

## Chasseur et Paladin (choix d'implémentation)

- **Chasseur** : classe à Énergie comme le Voleur (plusieurs actions par tour, mêmes coûts d'actions de base), mais **sans points de combo** ; Agilité, arc, armure moyenne. Tir visé (45 Énergie) et Tir rapide (20).
- **Pièges** (effets du catalogue `piege`, `piegeDeGivre`) : posés sur un ennemi, ils se déclenchent au début de son prochain tour (dégâts, puis Étourdi ou Ralenti). Remède : Outils de désamorçage.
- **Paladin** : Mana, Force **et** Intelligence (+1 de chaque par niveau ; chaque orientation n'en utilise qu'une). Frappe du croisé (physique, Force) et Lumière sacrée (soin, Intelligence).
- **Intercession** (effet `intercession`) : la moitié des dégâts subis par l'allié est encaissée par le Paladin qui l'a lancée (s'il est en vie).
- **Soins sur la Force** (`physHeal`) : les auto-soins du Templier utilisent la puissance physique.
- Simulation : le Chasseur Œil de Faucon est au niveau du Voleur (meilleurs DPS mono-cible) ; une équipe avec un Paladin (Templier) à la place du Guerrier termine les donjons actuels.

## Donjons (choix d'implémentation)

Contenu dans `src/data/dungeons.js` et `src/data/enemies.js`, logique dans `src/game/dungeon.js`, réglages dans `src/config.js` (`DUNGEON`, `LOOT`).
- **Zones** (= donjons, jusqu'au niveau 50) : Forêt Maudite (1-10), Catacombes oubliées (11-20), Cavernes ardentes (21-30), Pics gelés (31-40), Abîme infernal (41-50). Chaque zone a **3 sous-zones de 5 étages** (niveaux 1-3 / 4-6 / 7-10, puis 11-13 / 14-17 / 18-20, etc.), chacune avec ses ennemis, ses élites et son boss au 5e étage. Terminer une zone ouvre la suivante.
- **Étages** : dans une sous-zone, le niveau des ennemis monte de son minimum (1er étage) à son maximum (boss). Étages ordinaires : 2 ennemis (sous-zone 1) ou 3 (sous-zones 2-3), chacun ayant 15 % de chances d'être un **élite** de la sous-zone (ennemi renforcé, ×1,5 XP et or). Boss accompagné de 0 à 2 acolytes selon la sous-zone.
- **Exploration** (`game/floorMap.js`, `ui/mapView.js`) : chaque étage est une carte générée (salles et couloirs, 36 × 24 cases, brouillard). Le groupe se déplace case par case (clavier, clic sur une case pour y marcher, croix tactile) ; à chaque pas, les monstres bougent : ils errent dans leur salle, poursuivent le groupe s'ils le voient (5 cases, ligne de vue) et abandonnent au-delà de 9. Toucher un groupe lance le combat (`exp.engaged`, `floorCombat`, `winFight`). 2-3 groupes par étage ordinaire, chacun ayant sa composition tirée à la génération. Événements posés sur la carte (0 à 2 par étage, `DUNGEON.mapEventChances`), déclenchés en marchant dessus. Échelle dans la salle la plus éloignée, libre (`takeLadder`) : éviter les monstres fait perdre leur XP et leur butin. Étage du boss : pas d'échelle, le boss (immobile) garde la salle la plus éloignée, avec un groupe ordinaire (`DUNGEON.bossFloorGroups`). Graphismes des étages : chipsets RPG Maker 2003 (`assets/rm2k3/chip_*`, thèmes dans `ui/mapThemes.js`) : forêt (chemins de terre, arbres, souches, rochers), catacombes (dalles, murs de briques, torches, statues), cavernes (roche volcanique au milieu d'un lac de lave), Pics gelés (neige, forêt de sapins enneigés, cristaux, neige qui tombe), Abîme (la lave recolorée en pourpre). Le village aussi : maisons construites tuile par tuile (toits, murs à colombages ou en pierre, portes, fenêtres, enseignes), rues pavées, puits, statue, charrette de fleurs, braseros, piliers de la porte. Images : `assets/` (crédits dans `assets/CREDITS.md`), intégrées au jeu par `tools/assets.mjs` → `src/ui/assetData.js`.
- **Butin** : le niveau des équipements (et l'or, l'XP) suit le niveau des ennemis vaincus, pas celui des héros.
- **XP** : courbe réglée pour que les héros finissent chaque zone vers son niveau maximum (simulation : niv. 12, 20, 30, 38, 46 en Balade).
- **Expédition** (DESIGN_DOC §5) : on enchaîne les étages sans repasser par le village. **Aucun soin automatique entre deux combats** : PV et ressources restent tels qu'à la fin du combat (seuls les potions, la Tente, les compétences de soin et l'auberge soignent) ; les héros tombés restent à terre jusqu'à une Plume de phénix ou une Résurrection. On ne peut rentrer qu'au départ ou juste après un boss ; sinon, on continue à ses risques et périls. Entre deux étages : objets, équipement, talents et statistiques restent accessibles.
- **Après un boss : choix obligatoire** entre « Rentrer au village » (tout le butin est conservé) et « Continuer le donjon ». Continuer rend **40 % des PV et de la ressource** aux héros en vie (`DUNGEON.continueRegenPct`), une seule fois, puis il faut vaincre le boss suivant pour pouvoir rentrer.
- **Points de passage** : chaque boss vaincu devient un point de départ (entrer à l'étage 1, 6, 11…). Une défaite fait perdre l'or et une partie du sac (règle existante) et ramène au village ; la progression reste au dernier boss vaincu. On peut toujours repartir d'un palier inférieur pour s'entraîner.
- **Boss** : 4 à 6 fois plus d'or, 5 à 8 fois plus d'XP, et un objet garanti de rareté peu commune à légendaire (deux pour le boss final).
- **Capacités ennemies** : les ennemis et surtout les boss utilisent des capacités (morsure qui fait saigner, crachat venimeux, cri de ralliement, étourdissement, soins, malédiction…), au même format que les compétences des héros ; la provocation du Gardien s'applique aussi à ces capacités.
- **Simulation d'équilibrage** (joueur automatique simple, sans équipement trouvé, sans Forge ni potions, qui rentre après chaque boss), sans soin automatique entre les combats : sans talents, la Forêt se termine en 4 à 10 défaites et les Catacombes en 16 à 23 ; avec talents, 1 à 2 et 4 à 6. À affiner avec de vraies parties.
- `state.dungeonLvl` devient « plus haut niveau atteint » : il sert au stock du Marchand.

## Marchand (choix d'implémentation)

Réglages dans `src/config.js` (`MERCHANT`), consommables dans `src/data/consumables.js`, logique dans `src/game/merchant.js` et `src/game/consumables.js`.
- **Revente** : uniquement les objets du sac. Prix = (5 + 2 × niveau) × rareté (commun ×1, peu commun ×2, rare ×4, épique ×8, légendaire ×16) × (1 + 20 % par amélioration). Confirmation pour un objet épique ou légendaire ; bouton « vendre tous les communs » avec confirmation.
- **Consommables** (`src/data/consumables.js`, 9 maximum de chaque ; l'équipe part avec 2 potions ; jamais perdus en cas de défaite) :
  - Soins (combat et entre deux étages) : Potion de soin (30 % des PV max, 20 or), Grande potion (60 %, 50 or), Élixir (50 % de la ressource, 35 or), Plume de phénix (relève à 30 % des PV, 100 or).
  - Remèdes (combat seulement, car les effets négatifs disparaissent à la fin de chaque combat) : un remède bon marché par effet — Antidote (poison), Bandage (saignement), Onguent (brûlure), Sels revigorants (étourdissement), Tisane de clarté (confusion), Tonique (ralentissement), Fortifiant (affaiblissement), Potion de courage (terreur), Eau bénite (malédiction, ténèbres), 12 à 18 or — et le Remède universel (tous les effets, 60 or). Un remède ne peut viser qu'un héros qui a l'effet qu'il guérit. Un test vérifie que chaque effet négatif du jeu a un remède dédié.
  - Utilitaires : Corde d'évasion (150 or, en combat ou entre deux étages : retour au village sans perte, progression au dernier boss vaincu) ; Tente (100 or, entre deux étages : PV et ressource restaurés pour les héros en vie).
- **Confusion des héros** : la Banshee et la Reine sylvestre peuvent rendre un héros confus ; à son tour, il a une chance sur deux de frapper un allié au lieu de jouer.
- **Équipement en vente** : 4 objets du niveau du donjon (commun 55 %, peu commun 35 %, rare 10 %), renouvelés à chaque nouveau niveau de donjon ; prix d'achat = 4 × prix de revente.
- **Action « Objet » en combat** (DESIGN_DOC §2) : utiliser un consommable prend le tour du héros ; cible toujours choisie, avec l'effet prévu affiché (ex. « Cibler Mage · +28 PV », « retire Poison ») ; la Corde demande une confirmation. La Plume de phénix ne propose que les alliés tombés.
- **Objets entre deux étages** : l'écran d'expédition liste les objets utilisables sur place (soins, Plume, Tente, Corde).

## Forge (choix d'implémentation)

Réglages dans `src/config.js` (`FORGE`), logique dans `src/game/forge.js`.
- **Décraft** : uniquement les objets du sac (jamais un objet porté). Rapporte **1 à 3 matéria (au hasard)** de la rareté de l'objet : matéria d'arme pour une arme, matéria d'armure pour une armure ou un bouclier, matéria de bijou pour un bijou. Confirmation demandée pour un objet épique ou légendaire, et pour le décraft en lot de tous les communs du sac.
- **Amélioration** (+1 à +5), possible sur un objet porté ou dans le sac. Coût du passage à +1/+2/+3/+4/+5 : **2/4/6/8/10 matéria de chaque rareté**, de commun jusqu'à celle de l'objet, plus (10 + 5 × niveau de l'objet) × niveau visé en pièces d'or. Exemple : une arme rare +1 demande 2 matéria d'arme commune, 2 peu commune, 2 rare.
- **Fabrication** : 20 matéria de la rareté voulue (sorte de la catégorie), +10 par caractéristique imposée (arme : type, stat principale ; armure : pièce ou bouclier, type d'armure, stat principale ; bijou : anneau/collier, stat principale). Le reste est tiré au sort ; niveau = plus haut niveau atteint. En légendaire, un légendaire de la catégorie respectant les filtres est tiré (voir `craftLegendaries`).
- **Effet** : chaque +1 augmente les stats de l'objet de 10 % (arrondi ; la stat obligatoire gagne au moins +1 par niveau). Les stats de base restent stockées dans `item.stats` ; les stats effectives se lisent via `itemStats(item)`.

## Système d'équipement (choix d'implémentation)

Réglages chiffrés dans `src/config.js` (`COMBAT`, `ITEM`, `LOOT`), contenus dans `src/data/items.js`.
- **Emplacements** : casque, épaulières, plastron, gants, ceinture, bottes, collier, anneau ×2, main droite, main gauche.
- **Trois catégories** : armes, armures (casque, épaulières, plastron, gants, bottes — plus de ceinture), bijoux (anneaux, collier).
- **Stat obligatoire** : Attaque (armes), **Armure** (armures ; bouclier : Armure + Blocage), **aucune pour les bijoux**. L'Armure compte à la fois comme Défense et comme Défense magique ; Défense et Défense magique sont désormais des stats secondaires qui s'y ajoutent : un bijou commun n'a que sa stat principale, avec un coefficient plus élevé (anneau 1,8, collier 2,2 ; arme à deux mains 1,6, plastron 1). **Exception : le bouclier a deux stats obligatoires, Armure et Blocage**, et le Blocage peut en plus ressortir en stat secondaire (il se cumule alors et s'affiche sur deux lignes).
- **Un objet commun ne porte que sa/ses stat(s) obligatoire(s) et sa stat principale** (2 stats, 3 pour un bouclier). Les stats secondaires n'apparaissent qu'à partir de peu commun ; elles sont rangées à part dans `item.bonus`.
- **Stat principale** : toute arme, toute armure (lourde, moyenne, légère) et tout bijou peut sortir en Force, Agilité ou Intelligence ; les boucliers en Force ou Intelligence. (Voir « Dégâts physiques et magiques » ci-dessous pour leur effet.)
- **Raretés** : commun (gris, 0 secondaire), peu commun (vert, 1), rare (bleu, 2), épique (violet, 3), légendaire (orange, 4 + passif unique). Les stats obligatoire/principale sont aussi multipliées par la rareté.
- **Niveau** : un objet a le niveau du donjon où il est trouvé ; ses stats en dépendent.
- **Armes** : épée moins puissante, hache intermédiaire, marteau plus puissant ; versions 2 mains plus fortes ; dague faible ; bâton à deux mains. La notion de vitesse d'arme du design doc n'est pas encore rendue (elle ne peut pas être une stat, les communs n'ayant que 2 stats). Arme en main gauche (Voleur, ambidextrie) : son attaque compte à 50 %.
- **Maîtrises** : Guerrier (armes 1M/2M, bouclier, armure lourde/moyenne), Voleur (armes 1M et dagues dans les deux mains, armure moyenne), Prêtre (bâton, dague, armure légère), Mage (bâton, armure légère), Chasseur (arc, armure moyenne), Paladin (armes 1M/2M de corps à corps, bouclier, armure lourde/légère).
- **Armes** (de la plus lente à la plus rapide) : masse à deux mains, hache à deux mains, épée à deux mains, bâton, arc, masse, hache, épée, dague. **Coefficient de vitesse d'attaque** (0,8 à 1,12) : il multiplie la Vitesse du héros (moyenne des deux armes en ambidextrie) ; les armes lentes frappent plus fort. **Toute arme peut sortir en Force, Agilité ou Intelligence.** Arc = seule arme à distance ; toutes les autres sont de corps à corps. Les boucliers peuvent porter Force ou Intelligence.
- **Légendaires** (consultables à la création : bouton Détails, onglet Légendaires, avec le symbole de la classe ; un légendaire sans classe serait neutre et équipable par tous) : un par orientation (14), chacun renforce une compétence de cette orientation (voir `LEGENDARIES`). N'importe quel légendaire peut tomber, quelle que soit l'équipe.
- **Combat** : dégâts × 100 / (100 + Défense ou Défense magique de la cible) ; critique selon Taux/Dégâts critiques ; Esquive = attaque évitée ; Blocage = dégâts réduits de moitié. Le Voleur utilise des points de combo (voir plus haut).

## Dégâts physiques et magiques

- **Puissance physique** = Attaque (armes et bonus d'objets) + stat physique de la classe × coefficient : **Force × 0,5** (Guerrier, et par défaut les classes magiques Prêtre et Mage), **Agilité × 0,6** (Voleur). À stat principale égale, un voleur fait donc un peu plus mal qu'un guerrier. Utilisée par l'attaque de base de toutes les classes et par les compétences non magiques ; réduite par la Défense de la cible.
- **Puissance magique** = 2 × Intelligence. Utilisée par les sorts (compétences `magic: true` : Boule de Feu, Éclair, Éclat de Lumière) et par tous les soins ; réduite par la Défense magique de la cible. Elle ne compte jamais pour une attaque à l'arme : un Mage qui tape au bâton fait peu de dégâts.
- Les éléments (feu, glace, foudre, lumière…) viendront plus tard sur les sorts.
- Coefficients dans `src/config.js` (`COMBAT.physStatFactor`, `COMBAT.magicPerInt`) ; stat physique par classe dans `src/data/classes.js` (`physStat`).
- **Butin** (`src/game/loot.js`, réglages `LOOT`) : pour chaque ennemi vaincu, **trois tirages indépendants** — un ennemi peut tout laisser, rien, ou un mélange :
  - équipement : 40 % (commun 50 %, peu commun 30 %, rare 14 %, épique 5 %, légendaire 1 %) ; boss : garanti, peu commun à légendaire ;
  - matéria (arme ou armure au hasard) : 50 %, 1 à 2, **moins rares que l'équipement** (commun 40 %, peu commun 32 %, rare 18 %, épique 8 %, légendaire 2 %) ; boss : 2 à 4 garanties, peu commune à légendaire ;
  - consommable : 20 % (60 % pour un boss), tiré selon son poids `drop` (potions fréquentes, Plume, Tente et Corde rares). Un consommable trouvé au-delà du maximum transporté est perdu.
- **Défaite** : chaque objet du sac a 50 % de chance d'être perdu ; l'équipement porté, les matéria et les consommables ne sont jamais perdus.
- **Départ** : chaque héros commence avec une arme et un plastron communs ; les stats de base ont été ajustées pour garder la même puissance qu'avant l'équipement.

## Architecture actuelle (à connaître avant de modifier)

Le prototype monofichier `anyem.html` a été découpé (voir `CLAUDE.md` pour le détail) :
- `src/data/` : `CLASSES` (stats de base, croissance par niveau, maîtrises d'équipement, kit de départ, ressource, compétences), `TALENTS` (arbres), `STATS`, objets (`SLOTS`, `RARITIES`, types d'armes/armures, `LEGENDARIES`), `ENEMIES`, `DUNGEONS`.
- `src/game/` : moteur pur et testé — `combat.js` (file de tour par vitesse, actions, compétences généralisées, IA avec provocation/confusion, fin de combat), `statuses.js` (effets à durée), `talents.js` (points, paliers, effets), `party.js` (héros, niveaux/XP, `getStats()`, `getSkills()`), `items.js` (génération d'objets), `equipment.js` (règles d'équipement, sac), `dungeon.js` (expéditions, étages, boss, points de passage), `forge.js`, `merchant.js`, `consumables.js`, `loot.js`, `progression.js` (victoire, défaite, auberge), `formulas.js` (jets et estimations), `rng.js`.
- `src/ui/` : un écran par fichier, `router.js` pour la navigation, `encounter.js` pour le rythme des tours ennemis (`setTimeout`).
- `src/state.js` : état global (`screen`, `party`, `bag`, `materia`, `consumables`, `shop`, `gold`, `dungeonLvl`, `dungeons`, `expedition`, `combat`, `hubMessage`, `hubLoot`).
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
- Donjons procéduraux (étages générés, cartes) : pour l'instant, étages = suite de combats
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
3. ~~Donjons à étages multiples + plusieurs donjons de niveau croissant~~ (fait)
4. Intégration des vrais sprites
5. Village explorable avec déplacement libre
6. Paladin, Chasseur, et autres classes

## Préférences de l'utilisateur exprimées jusqu'ici

- Veut systématiquement voir/choisir une cible, même si une seule option est possible.
- Veut voir les dégâts/soins estimés avant de valider une action.
- Veut un accès facile aux statistiques de ses personnages.
- Veut que les tours ennemis ne soient jamais instantanés (délai + feedback visuel).
- Veut une vraie ambiance JRPG avec de vrais sprites, pas juste des formes/emoji.
