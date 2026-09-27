# Anyem — RPG tour par tour roguelite

Prototype développé par itérations dans le chat Claude (claude.ai) avant transfert vers Claude Code.
Ce fichier résume l'état du projet pour reprendre le développement sans perdre le contexte.

## Fichiers

- `index.html` + `css/` + `src/` — le jeu, en modules ES sans build ni dépendance. Lancer avec `npm start` (voir `README.md`).
- `docs/DESIGN_DOC.md` — le document de conception original de l'utilisateur : vision complète du jeu (classes, combat, équipement, arbres de compétences, donjons, village). C'est la référence pour toutes les décisions de design futures.
- `CLAUDE.md` — architecture et conventions à respecter lors des modifications.

## Ce qui est déjà fonctionnel

- **Création d'équipe** : 4 héros, chacun d'une classe au choix parmi 6 (Guerrier/Rage, Voleur/Énergie, Prêtre/Mana, Mage/Mana, Chasseur/Énergie, Paladin/Mana ; doublons permis), avec nom personnalisable.
- **Menu principal** (`ui/screens/title.js`) : nom du jeu sur une scène animée (clairière de nuit, feu de camp, les six classes, lucioles), menu façon JRPG (flèches + Entrée, ou souris) : Nouvelle partie (choix d'un emplacement de sauvegarde), Charger, Options, Quitter (ferme l'onglet si le navigateur le permet, sinon message), **Debug** (`game/debug.js`) : équipe par défaut + les deux autres classes à l'auberge, toutes niveau 50 avec sorts de départ appris et points de talent libres, 1 000 000 d'or, 999 matéria de chaque sorte et rareté, consommables au maximum, toutes les zones terminées (tous les points de départ), et dans le sac chaque base d'objet dans chaque stat principale en Divin / Épique / Rare / Peu commun, plus tous les légendaires.
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
- **Structure** (2e refonte) : chaque orientation alterne **gros paliers** et **petits paliers** (15 paliers, 0 à 14). Gros paliers (1 point, obligatoires) : palier 0 = sort de départ, paliers 2, 4, 6, 8, 10, 12 = nouvelle compétence ou passif important, palier 14 = **compétence signature**. Petits paliers (1, 3, 5, 7, 9, 11, 13) : **trois bonus de stats, on en prend deux** (`CHOICE_PICKS`), à 2 rangs chacun (`CHOICE_RANKS`) ; changer d'avis demande une réinitialisation. Un palier s'ouvre quand tous les précédents sont complets. Orientation entière : **36 points** (8 gros nœuds + 28 rangs de bonus, contre 6 + 39 avant) ; au niveau 50, il reste 14 points pour une seconde orientation (jusqu'à son 2e gros palier). Les bonus suivent la logique de l'orientation : un test vérifie qu'aucun bonus (dégâts sur la durée, soins, boucliers, pièges, zone, finishers, cibles affaiblies) n'arrive avant la première compétence qui en profite. Sauvegardes antérieures : talents inconnus retirés, rangs ramenés au maximum, et si l'arbre n'est plus cohérent les points sont rendus (`sanitizeTalents`, message au village).
- **Réinitialisation** au Maître des compétences contre 10 × niveau du héros en or.
- **XP** : chaque ennemi rapporte 10 + 5 × niveau du donjon, à chaque héros (tombés compris). Niveau L → L+1 : 80 + 40 × L XP. Chaque niveau donne des PV et +1 dans la stat principale (`growth` dans `data/classes.js`).
- **Passifs disponibles** (voir l'en-tête de `data/talents.js`) : berserk, vol de vie, exécution (bonus sous 30 % de PV), bonus contre cible affaiblie, bonus de zone, garde renforcée, boucliers renforcés, soins, dégâts sur la durée, ressource max / régénération, Rage par coup, combo sur critique, Énergie rendue par les finishers. Compétences : `cleanse` (retire les effets négatifs), `resourceGain` + `oncePerCombat`, `executePct`.
- **Gros paliers par orientation** (2 / 4 / 6 / 8 / 10 / 12 / signature 14 ; *nouveaux* en italique) :
  - Gardien : Provocation / Rempart (Défendre donne un Bouclier de 20 % des PV) / Coup de bouclier (étourdit) / *Cri de défi* (tous les ennemis Affaiblis) / Mur de boucliers / *Contre-attaque* (+15 % Riposte, Rage par coup encaissé) / **Dernier rempart**.
  - Berserker : Frappe sauvage / Berserk / *Rage aveugle* (Enragé 3 tours) / Tourbillon (zone) / Exécution / *Soif de carnage* (puissance, vol de vie) / **Carnage sanglant**.
  - Assassin : Taillade / Sceau du destin / *Frappe de l'ombre* (générateur à 2 points de combo, +20 % critique) / Déluge de lames (finisher) / Poussée d'adrénaline / *Lames dansantes* (critique) / **Marque de la mort**.
  - Empoisonneur : Lame empoisonnée (2 points de combo) / Venin virulent / *Poison paralysant* (poison + Ralenti) / Gaz nauséabond / Fiole de peste / *Maître des toxines* / **Mort lente**. Ses finishers sont à pleine puissance dès 3 points de combo (`fullAt: 3`).
  - Clerc : Prière de soins / Grâce / *Bénédiction* (Puissance + Régénération sur un allié) / Résurrection / Purification / *Âme charitable* / **Miracle**.
  - Prêcheur : Rénovation / Bouclier sacré / Bouclier de lumière / *Flamme sacrée* (zone + Brûlure) / Jugement / *Parole ardente* / **Hymne divin**.
  - Profane : Mot de douleur / Douleur prolongée / *Siphon d'âme* (dégâts + Régénération du Prêtre) / Confusion / Fléau / *Voile de l'abîme* / **Apocalypse**.
  - Feu : Immolation / Boule ardente / Mur de flammes / *Pyroclasme* / Pluie de feu / *Cœur de brasier* / **Météore**.
  - Glace : Éclat de glace / Nova de givre / Éclatement / *Armure de glace* (Bouclier + Protection) / Lance de glace / *Hiver éternel* / **Blizzard**.
  - Foudre : Chaîne d'éclairs / Éclair renforcé / Onde de choc / *Canalisation* (Mana + Hâte, une fois par combat) / Tempête / *Conducteur* / **Jugement céleste**.
  - Œil de Faucon : Tir perçant / Calme du tireur / Salve / *Tir en pleine tête* (double sous 30 % de PV) / Tir de l'aigle / *Patience du prédateur* / **Tir fatal**.
  - Traqueur : Piège à mâchoires / Flèches barbelées / *Flèche empoisonnée* / Tir incapacitant / Champ de givre / *Maître des pièges* / **Terrain piégé**.
  - Templier : Intercession / Sceau de vie / Vengeance sacrée / *Marteau de justice* (étourdit) / Aura de protection / *Rempart de foi* / **Sacrifice divin**.
  - Lumière : Lumière de l'aube / Main de lumière / Épuration / *Cercle de guérison* (Régénération de l'équipe) / Sceau de protection / *Foi rayonnante* / **Lumière divine**.
  - Les anciens passifs retirés à la 1re refonte (Démence, Feu persistant, Gel profond, Électrocution, Flèche perforante, Martyr, Lumière purifiante…) sont devenus des pouvoirs de légendaires (voir Équipement) ; Cri de défi, Frénésie et Prière fervente reviennent sous une autre forme (sort du Gardien, bonus au choix).
- **Équilibrage** (`tests/balance.test.js`, et une simulation plus complète dans le bloc-notes) : chaque orientation joue seule 10 rounds contre une cible, avec un équipement rare de son niveau. Au niveau 50, les 9 orientations de dégâts sont à ±20 % de la médiane (mesuré après la 2e refonte : 1 145 à 1 560 dégâts par round) ; hybrides et tanks en dessous (Prêcheur ~67 %, Templier ~38 %, Gardien ~34 %). Au niveau 25, aucune ne décroche et l'Empoisonneur est dans la moyenne. Retouches : Voleur (Coup Vicieux, Éviscération, Taillade, Déluge, Marque), Berserker (Frappe brutale, Frappe sauvage, Exécution), Glace (Trait de givre, Éclat, Lance), Chasseur (Tir visé, Tir perçant, Tir de l'aigle, Tir fatal), Profane (Trait d'ombre, Mot de douleur), Foudre un peu moins fort (Éclair, Tempête, Éclair renforcé), Prêcheur (Jugement), Gardien (Coup de bouclier) ; 2e refonte : Boule de Feu, Éclair, Chaîne d'éclairs, Pluie de feu, Météore, Déluge de lames et Marque de la mort baissés, Frappe sauvage et Exécution relevées.
- **Effets (buffs / debuffs)** : un **catalogue unique** (`src/data/effects.js`). Un effet est défini une seule fois ; une compétence (héros ou ennemi) ne fait que l'appliquer via `effects` (à ses cibles) ou `selfEffects` (au lanceur), avec sa durée et, pour les effets à valeur, sa puissance. C'est la compétence qui décide qui est touché (un ennemi, un allié, toute l'équipe…), jamais l'effet.
  - Buffs : **Bouclier** (absorbe des dégâts), **Régénération** (soin par tour), **Puissance** (+25 % puissance physique et magique), **Hâte** (+25 % Vitesse), **Protection** (+50 % Défense et Défense magique), **Provocation** (attire les attaques, +30 % Défense), **Enragé** (+30 % puissance physique, −20 % Défense).
  - Debuffs : **Poison**, **Saignement**, **Brûlure**, **Ténèbres** (dégâts par tour), **Ralenti** (−30 % Vitesse), **Étourdi** (perd son prochain tour), **Confus** (1 chance sur 2 de frapper un allié), **Affaibli** (−20 % puissance physique et magique), **Terreur** (−30 % Défense et Défense magique).
  - Exemples : Rempart (Défendre), Mur de boucliers (toute l'équipe), Bouclier sacré (un allié) et Mur d'os (ennemi) appliquent tous l'effet Bouclier ; Hymne divin et Cri de ralliement appliquent Puissance ; le Hurlement du Loup alpha applique Puissance + Hâte ; la Malédiction applique Affaibli.
  - Durée en tours, décomptée en fin de tour (sauf l'étourdissement, consommé au tour perdu) ; les dégâts et soins par tour ignorent la défense. Le même effet appliqué deux fois se rafraîchit au lieu de se cumuler ; des effets différents cohabitent (Poison + Saignement).
- **Ciblage** : les compétences de zone, de groupe ou personnelles demandent maintenant une confirmation qui affiche l'effet et qui sera touché ; la Résurrection propose les alliés tombés (« Relever … »).

## Classes à Énergie : Voleur (choix d'implémentation)

- **Plusieurs actions par tour** : chaque action coûte de l'Énergie — Attaquer 35, Défendre 20, Objet 20, compétences selon leur coût. Le Voleur garde la main tant qu'il peut payer une action ; bouton **« Finir le tour »** pour s'arrêter avant (l'Énergie restante est conservée). S'il ne peut plus rien payer, son tour se termine seul. Une seule garde par tour.
- **Énergie** : 100 max, pleine au début de chaque combat, **+45 au début de chacun de ses tours** (pas une recharge complète : place pour des compétences/talents qui en rendent).
- **Points de combo** (inspiré de WoW), 5 max, remis à zéro à chaque combat : les **générateurs** (Coup Vicieux, Taillade, Lame empoisonnée) en donnent 1 ; les **finishers** (Éviscération, Lacération, Déluge de lames, Fiole de peste) les dépensent tous et exigent au moins 1 point. Puissance et valeur des effets d'un finisher sont données **par point de combo** (`finisher: true`, voir `game/combo.js`, `atCombo`) ; ceux de l'Empoisonneur atteignent leur pleine puissance (celle de 5 points) dès 3 points (`fullAt`).
- **Passer le tour** : disponible pour toutes les classes (les autres n'ont qu'une action par tour, et leurs actions de base sont gratuites).
- Équilibrage : voir « Arbres de compétences » (`tests/balance.test.js`).

## Interface pixel art (tous les écrans en plein écran, sans défilement)

- **Habillage** (`ui/skin.js`, `css/skin.css`) : cadres, boutons, emplacements et polices du pack d'interface de Franuka (cadres bleu nuit recolorés, infobulles sur parchemin, police pixel pour les grands titres) ; icônes Raven Fantasy (`ui/icons.js` : arme par type avec teinte selon la rareté, armure par pièce, type et rareté, bijoux, boucliers, consommables, matéria, effets, compétences d'après leur élément, orientations, classes).
- **Écran Personnage** (`ui/screens/equipment.js`, bouton Équipement) : plein écran sans défilement ; stats (écart au survol d'un objet), héros et 10 emplacements à silhouette, sac en grille d'icônes (onglets Tout / Équipable / Armes / Armures / Bijoux / Objets / Matéria, pages ajustées à l'écran, `ui/bagView.js`), fiche et comparaison ; glisser-déposer, double-clic ou clic puis emplacement.
- **Talents** (`ui/screens/talents.js`) : une colonne par orientation, 8 rangées : à gauche le gros palier (un nœud), à droite le petit palier qui le suit, 2/3 (trois bonus ; une fois deux choisis, le troisième s'estompe) ; états verrouillé, disponible, appris, maîtrisé ; rang affiché ; fenêtre de détail avec « Apprendre » ; double-clic pour apprendre.
- **Cadre commun** (`ui/screenFrame.js`) : barre du haut (titre en icône, onglets ou héros, or, retour), fenêtres en grille CSS, grilles d'icônes paginées qui s'ajustent à l'écran (`itemGrid` / `wireGrid` / `fitGrids` : survol = fiche, clic = choix, double-clic = action, glisser), cases de consommables et de matéria, fiche d'objet, objets portés par héros (`wornRows`). Portraits des héros et monstres (sprites de face) : `ui/portraits.js`.
- **Marchand** : consommables et équipement en vente en icônes, fiche au centre (Acheter / Vendre, confirmation pour Épique et plus), sac à vendre en grille, « Vendre les communs ». **Banque** : sac ↔ coffre (double-clic ou glisser), consommables (clic = 1, Maj + clic = tout) et matéria (clic = tout le tas) de chaque côté, or au centre. **Forge** : onglets Améliorer / décrafter (objets portés par héros + sac), Fabriquer (commande en boutons icônes : catégorie, rareté, type, pièce, stat), Forge divine (grilles des objets divins et des légendaires) ; matéria toujours visible. **Runomancien** : même choix d'objet, relance stat par stat.
- **Personnages** (`stats`) : un onglet par héros ; stats, compétences (icône, coût, effet estimé), équipement porté (fiche au survol), accès à l'équipement et aux talents. **Stratégie** : une colonne par héros (portrait, arme, corps à corps / distance en boutons icônes). **Auberge** : équipe et compagnons au repos en vignettes (portrait, PV, objets portés), renvoi avec aperçu des objets rendus ou perdus, recrutement par portraits de classes. **Bestiaire** : un onglet par zone, créatures en portraits (silhouettes noires si jamais rencontrées), fiche détaillée à droite. **Difficulté** : une colonne par difficulté, 4 visibles, barre de défilement horizontale. **Portails** : une colonne par zone avec le portrait de son dernier boss et ses 3 sous-zones. **Création d'équipe** : quatre colonnes (grand portrait, nom, classe en icônes, orientations), fenêtre « Classes et légendaires » (stats, sorts de départ et signatures, équipement de départ ; légendaires en icônes par classe avec fiche au survol).
- **Village et expédition en carte plein écran** (`ui/hud.js`, `ui/viewport.js`) : le canvas prend toute la fenêtre (`fitCanvas`, caméra `clampView`), interface posée dessus : lieu et or (ou frise des étages et gains) en haut à gauche, raccourcis en icônes en haut à droite (Personnage, Talents avec points libres, Stats, Stratégie ; en expédition Objets, Sorts, Rentrer), équipe en bas à gauche, repliée par défaut (le bouton Personnage l'affiche ; clic sur un héros = son menu Personnage), aide aux déplacements repliée derrière « ? », croix / Parler / échelle en bas à droite, messages dans une fenêtre fermable ; objets et sorts hors combat en fenêtre flottante, événements et choix après un boss en fenêtre centrale. Échelle et événements dessinés sur la carte (plus d'emoji).
- Création de personnage (apparence) : le pack « Character Base » fourni est la démo gratuite (3 morphologies × 3 teintes de peau, sans cheveux ni vêtements) : pas encore exploitable ; à reprendre avec la version complète ou un générateur de personnages en couches.

## Scène de combat (sprites)

- **Écran de combat plein écran, sans défilement** (`ui/screens/combat.js`) : en haut le titre et les 2 dernières lignes du journal (bouton pour ouvrir le journal complet) ; au centre la scène, ajustée à la place disponible (`fitStage`) ; en bas trois fenêtres façon JRPG : **équipe** (PV, ressource, combo, effets en icônes ; clic = fiche de stats), **commandes** (Attaquer, Compétences, Objets, Défendre, Avancer/Reculer, Fin du tour ; touches 1-6, Échap pour revenir ; sous-menus avec icône, estimation et coût), **infos** (effet de la commande survolée, puis choix de la cible avec l'estimation sur chacune, ou confirmation). Noms et effets des monstres affichés sur la scène. Version téléphone : équipe sur deux colonnes, commandes et infos côte à côte. Icônes Raven Fantasy (`ui/icons.js`).

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
- **Événements sur la carte** : chaque événement est tiré dès la génération de l'étage (`e.key`) et dessiné sur sa case (`look` dans `data/events.js`) : un personnage composé avec les pièces de la création de héros (sorcière, voyageur blessé qui se tient le flanc, joueur de dés, marchand ambulant et son coffre) ou un objet du pack Green Dungeon (coffre, autel runique, source, dépouille enchaînée), mis en valeur par un halo qui pulse (bleu pour un personnage, doré pour un objet) et un « ! » qui flotte.
- Événements : Dépouille d'aventurier (fouiller : or et consommable, équipement rare ou mieux, ou une maladie qui affaiblit un héros), Sorcière (50 % objet peu commun ou mieux / 50 % deux héros perdent 30 % de leurs PV), Autel oublié (offrande payante : soin / piller : or + matéria ou malédiction), Coffre abandonné (or + consommable ou piège), Voyageur blessé (une potion contre une matéria rare et de l'or), Source mystérieuse (soin ou poison), Joueur de dés (pari), **Marchand ambulant** (3 équipements peu communs à légendaires à 2 × le prix de revente au lieu de 4 ×, consommables à 75 % du prix).
- Format extensible : coût (or selon le niveau, consommable) et effets (or, objet de rareté minimale, matéria, consommable, soin, blessures).

## Lexique au survol

- Les mots importants du jeu (équipement, matéria, consommable, légendaire, divin, stats, ressources, combo, finisher, positions, boss, élite, talents, orientations, paliers, expédition, sous-zone, difficulté, effets positifs et négatifs…) sont **soulignés en pointillés** partout où ils apparaissent (une fois par bloc de texte) ; au survol, une bulle parchemin les explique. Contenu : `data/glossary.js` ; moteur : `ui/glossary.js` (découpage pur `splitGloss`, testé, et un observateur de la page qui traite chaque nouvel écran). Les boutons, les titres et les textes qui ont déjà leur infobulle ne sont pas soulignés.

## Sauvegardes et menu Échap

- **4 emplacements** (stockage du navigateur, `ui/saves.js`). « Nouvelle partie » demande d'abord un emplacement (écraser une aventure demande confirmation) : l'aventure s'y sauvegarde toujours, dès la création de l'équipe, sans toucher aux autres. « Charger » liste les emplacements (équipe en portraits, lieu, difficulté, or, zones terminées, date) ; on peut aussi effacer une aventure.
- **Menu Échap** sur tous les écrans de jeu (`ui/pause.js`) : Reprendre, Sauvegarder (n'importe quand, même en plein combat ou en expédition : on reprend exactement au même endroit), Options (vitesse des tours ennemis : lents, normaux, rapides — jamais instantanés), Quitter (retour au menu principal, avec ou sans sauvegarde). Le jeu est figé pendant la pause. En combat, Échap annule d'abord un choix en cours. La partie Debug n'a pas d'emplacement : « Sauvegarder » propose d'en choisir un.
- Format (`game/save.js`) : version, date, résumé, et l'état de la partie encodé en graphe (les objets partagés, comme les héros dans le combat, le restent au chargement). Les identifiants d'objets reprennent après le plus grand chargé.

## Difficulté (choix d'implémentation)

- Rareté **Divin** (rouge) : 5 secondaires, fourchette au-dessus du légendaire. Uniquement sur les boss : 0 % en Balade et Aventure, 1 % en Guerre, 5 % en Horreur, 9 % en Cauchemar, 14 % en Insanie (`bossRarityWeights`). Pas de matéria divine (`MATERIA_RARITIES`, aucune case dans les tableaux de l'écran Difficulté) : un divin se décrafte en matéria légendaires ; chaque amélioration d'un divin coûte 10 / 10 / 10 / 20 / 30 matéria (commun → légendaire, `FORGE.divineCost`).
- **Forge divine** (onglet de la Forge, `absorbLegendary` dans `game/forge.js`) : un objet divin absorbe le pouvoir unique d'un légendaire du sac, qui est détruit (`item.absorbed`, sans réserver l'objet à une classe ; un nouveau pouvoir remplace l'ancien). **L'objet divin prend aussi le nom du légendaire** (il garde sa rareté et ses stats).

- 6 niveaux (`DIFFICULTIES` dans `config.js`) : Balade ×1,15, Aventure ×1,5, Guerre ×2, Horreur ×2,6, Cauchemar ×3,3, Insanie ×4,2 sur les PV et l'Attaque des ennemis. À partir d'Horreur (`maxLevel`), tous les ennemis de toutes les zones sont niveau 50 (`difficultyLevel`, `expeditionLevel`).
- Butin des boss : l'équipement est moins bon que les matéria (comme pour les monstres). Équipement de boss épique / légendaire / divin : Balade 20 / 5 / 0 %, Aventure 26 / 9 / 0 %, Guerre 30 / 13 / 1 %, Horreur 33 / 19 / 5 %, Cauchemar 35 / 25 / 9 %, Insanie 36 / 32 / 14 %. Consommables plus fréquents (30 % à 48 % par monstre, 90 % par boss).
- Mort (écran `defeat` : or, objets du sac et équipement perdus, en icônes avec fiche au survol) : 20 % de l'or et chaque objet du sac à 50 % (jamais tout le sac) ; à partir de Guerre, chaque pièce portée a 25 % (Guerre) à 40 % (Insanie) de chances d'être perdue, au plus la moitié des pièces de chaque héros (`defeatWornLossChance`, `applyDefeat`).
- Chaque niveau surcharge les chances et raretés de butin (`lootRules` dans `game/difficulty.js`) ; les types d'équipement restent équiprobables, l'or et l'XP ne changent pas.
- **Médailles de zone** : vaincre le dernier boss d'une zone à partir d'Horreur (`MEDALS.from`) donne la médaille de cette zone pour cette difficulté (3 par zone : Horreur, Cauchemar, Insanie), affichée aux portails avec les emplacements vides. Chaque zone a son ruban et son emblème ; plus la difficulté est haute, plus la médaille est précieuse (bronze, or, prisme ; perles, laurier, gemmes, rayons, lueur animée) et la dernière est plus grande. Une difficulté ajoutée à la fin reçoit automatiquement sa médaille.
- Choix à l'écran « Difficulté » du village (`ui/screens/difficulty.js`, colonnes avec barre de défilement horizontale, molette comprise), bloqué pendant une expédition ; stocké dans `state.difficulty`.

## Village : auberge et banque (choix d'implémentation)

- **Personnages** : tous issus des packs de Franuka (même style chibi que l'interface). Héros personnalisables (voir ci-dessous), 55 monstres animés (attente, marche, attaque avec effet, dégâts, mort, 4 directions), villageois du « Character pack ». L'équipe avance en file indienne.
- **Création de personnage** : pour chaque héros, coupe (10 : courts, mèche, longs, queue de cheval, chignon, hérissés, tresses, rasés, crête, bouclés), couleur des cheveux (10), yeux (10 : 7 couleurs, grands, plissés, sereins), peau (5), haut (23 tenues sur les 4 corps du pack : armures de gladiateur / d'acier / dorée / noire / de templier, cuirasse de bronze, fourrure, peau de loup, cuir de chasseur, tunique de rôdeur, tenue de druide, robes écarlate / de prêtre / de mage / du nécromant / de givre / de sorcière, bure de moine, manteaux de corsaire / de voyageur, tenue d'ombre, pourpoint de barde, tenue de duelliste). **Tous les héros ont la même taille** : les trois corps du pack plus petits que le gladiateur ont été allongés (ligne des épaules répétée, image par image en suivant le rebond du corps), tous ont le cou à la ligne 24 et bas (10 ; caché sous une robe). Aperçu animé qui tourne, « Au hasard », « Tenue de la classe ». Les corps viennent des planches du pack (tête retirée, animations conservées), les coupes sont dessinées pixel par pixel en face / profil / dos et posées image par image (`ui/heroCompose.js`).
- **Bestiaire refait avec le pack de monstres** : 66 créatures (les 55 monstres du pack, certaines recolorées selon la zone : loup de givre, golem de magma, zombie, chevalier infernal, béhémoth…). Rangs visibles à l'écran : les élites sont 1,5 fois plus grandes, les boss 2 fois (sur la carte et en combat ; les très grands dragons sont bornés). En combat, les grands monstres se placent en rangée arrière. Répartition : Forêt Maudite (gobelins, loups, gelées, lapins soldats, orques, fées, satyres ; élites loup alpha, fauve éclipse, ours-hibou, dragon féerique ; boss chef gobelin sur son loup, ogre des bois, reine sylvestre), Catacombes (squelettes, zombies, chauves-souris, spectres, momies ; élites abomination, gardien d'Anubis, banshee, vampire ; boss chevalier de la mort, évêque maudit, liche), Cavernes ardentes (kobolds, salamandres, chiens des enfers, diablotins, gogs ; élites golem de magma, fouisseur, blemmye, cyclope des forges ; boss ver des profondeurs, éfrit, dragon rouge), Pics gelés (loups de givre, bonnets-rouges, salamandres de givre, griffons, kappas, rônins, golems de glace, dragonnets ; élites yéti, samouraï, oni, tengu ; boss sorcière des neiges, géant du givre, dragon de glace), Abîme infernal (démons, chevaliers infernaux, succubes, sorciers noirs ; élites béhémoth, djinn noir ; boss gardien de la Porte, ange déchu, Nidhogg).
- **Boss d'Akari21** (planches plus grandes et plus détaillées, avec une animation de sort) : wendigo (fin de la Forêt, la reine sylvestre devient élite), minotaure (Cavernes 1), wendigo des neiges (Pics 1), démon de givre (Pics 2), démon ailé (Abîme 1) et reine gorgone (Abîme 2) ; les anciens boss remplacés deviennent des élites de leur zone. En combat, un boss peut atteindre 240 px de haut (`BOSS_BODY`, `ui/battleStage.js`), se place seul au fond de la scène, entouré d'une aura rouge pulsée et de braises ; la rangée des petits monstres avance selon sa largeur. Ses capacités jouent l'animation `cast` quand la planche en a une (`hasCast`).
- **Village à parcourir** (`data/village.js` : carte 54 × 40, une maison par habitant avec porte et panneau (planche + icône du métier), décors d'ambiance par métier, arbres ; `data/interiors.js` : intérieurs des 11 maisons (sol, murs, mobilier du pack Interiors, place de l'habitant) ; `game/village.js` : scènes (`sceneOf` : village ou maison), grille de marche, entrer par la porte (`enter`) / sortir par le bas (`leave`), habitants chez eux ou devant leur porte tirés à chaque retour (`rollResidents`), parler ; `ui/villageView.js` : rendu et contrôles). Chaque service est un habitant (aubergiste, forgeron, banquier, marchande, runomancienne, maître des compétences, traqueur du bestiaire, Oracle de la difficulté, garde des portails) : Espace/Entrée/E face à lui, ou clic dessus (le groupe y marche). Passer sous l'arche de la porte ouvre aussi les portails (`ui/screens/portals.js`). Équipement, statistiques et stratégie restent en raccourcis sous la carte. Habitants : villageois du pack de Franuka (aubergiste, forgeron, banquier, marchand, runomancienne, traqueur), le vieux mage et le paladin du pack de monstres (maître des compétences, garde), l'Oracle composé comme un héros, plus trois villageois qui n'ont qu'une phrase (pêcheur, enfants). Retour d'expédition : le groupe réapparaît à la porte (`arriveAtVillage`).

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
- **Exploration** (`game/floorMap.js`, `ui/mapView.js`) : chaque étage est une carte générée (salles et couloirs, 36 × 24 cases, brouillard). Le groupe se déplace case par case (clavier, clic sur une case pour y marcher, croix tactile) ; à chaque pas, les monstres bougent : ils errent dans leur salle, poursuivent le groupe s'ils le voient (5 cases, ligne de vue) et abandonnent au-delà de 9. Toucher un groupe lance le combat (`exp.engaged`, `floorCombat`, `winFight`). 2-3 groupes par étage ordinaire, chacun ayant sa composition tirée à la génération. Événements posés sur la carte (0 à 2 par étage, `DUNGEON.mapEventChances`), déclenchés en marchant dessus. Échelle (trappe ouverte du pack Green Dungeon, avec halo doré, étincelles et flèche, `drawLadder`) dans la salle la plus éloignée, libre (`takeLadder`) : éviter les monstres fait perdre leur XP et leur butin. Étage du boss : pas d'échelle, le boss (immobile) garde la salle la plus éloignée, avec un groupe ordinaire (`DUNGEON.bossFloorGroups`). Graphismes des étages et du village : packs **Raven Fantasy** achetés par le joueur (`assets/raven/`, archives dans `texture zip/map/`), un décor par sous-zone (`ui/mapThemes.js`) :
  - Forêt Maudite : Lisière (forêt verte, clairières de terre battue), Sous-bois (arbres d'automne, champignons), Cœur de la forêt (arbres morts, menhirs et dolmens).
  - Catacombes : Vieux cimetière (tombes, arbres morts, allées pavées), Ossuaire (pavés, murs de pierre, torches, squelettes enchaînés), Crypte royale (dallage orné, cercueils).
  - Cavernes ardentes (pack Miner's Cave) : Galeries (mine, lanternes, minerais), Forges noyées (îlots dans un lac souterrain), Lac de lave.
  - Pics gelés : Contreforts (forêt enneigée), Col des tempêtes (falaises de roche sous la neige), Nid du dragon (lac gelé) ; neige qui tombe.
  - Abîme infernal : La Porte (champ d'ossements, tombes, arbres rouges, cristaux), Palais des tourments (dalles au-dessus du vide), Trône (lac d'acide).
  - Village : maisons entières (auberge à deux pignons avec porche, maison du maître, forge avec annexe en pierre et fourneau, banque en pierre au toit bleu, échoppe de la marchande), chemins de terre, puits, table de runes, alambic de l'Oracle, tente du traqueur, clôtures, fleurs.
  - Intérieurs des maisons : packs Interiors et Cozy Home (planches RPG Maker réduites : `interiors_A4/A5/B/C`, `cozy_A5/B`), murs en autotiles (plafond + façade), sols en tuiles, meubles entiers ; chaque maison meublée selon son métier (banque : statues, coffres, comptoir et pièces ; forge : fourneau, enclumes, minerai ; auberge : tables, tonneaux, lits, cheminée…).
  - Packs achetés non encore utilisés : désert (Red Rock Desert, Red Desert Ruin, Sun City), plage (Beach, Ocean and Shore), Honey Bee, Farmlands (animaux), Winter Village.
- Images : `assets/` (crédits dans `assets/CREDITS.md`), intégrées au jeu par `tools/assets.mjs` → `src/ui/assetData.js`.
- **Butin** : le niveau des équipements (et l'or, l'XP) suit le niveau des ennemis vaincus, pas celui des héros.
- **XP** : courbe réglée pour que les héros finissent chaque zone vers son niveau maximum (simulation : niv. 12, 20, 30, 38, 46 en Balade).
- **Expédition** (DESIGN_DOC §5) : on enchaîne les étages sans repasser par le village. **Aucun soin automatique entre deux combats** : PV et ressources restent tels qu'à la fin du combat (seuls les potions, la Tente, les compétences de soin et l'auberge soignent) ; les héros tombés restent à terre jusqu'à une Plume de phénix ou une Résurrection. On ne peut rentrer qu'au départ ou juste après un boss ; sinon, on continue à ses risques et périls. Entre deux étages : objets, équipement, talents et statistiques restent accessibles.
- **Après un boss : choix obligatoire** entre « Rentrer au village » (tout le butin est conservé) et « Continuer le donjon ». Continuer rend **40 % des PV et de la ressource** aux héros en vie (`DUNGEON.continueRegenPct`), une seule fois, puis il faut vaincre le boss suivant pour pouvoir rentrer.
- **Points de passage** : chaque boss vaincu devient un point de départ (entrer à l'étage 1, 6, 11…). Une défaite fait perdre une part de l'or et du sac (et de l'équipement porté à partir de Guerre) et ramène au village ; la progression reste au dernier boss vaincu. On peut toujours repartir d'un palier inférieur pour s'entraîner.
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
  - Utilitaires (la Corde d'évasion a été retirée : plus de fuite gratuite) : Tente (100 or, entre deux étages : PV et ressource restaurés pour les héros en vie).
- **Confusion des héros** : la Banshee et la Reine sylvestre peuvent rendre un héros confus ; à son tour, il a une chance sur deux de frapper un allié au lieu de jouer.
- **Équipement en vente** : 4 objets du niveau du donjon (commun 55 %, peu commun 35 %, rare 10 %), renouvelés à chaque nouveau niveau de donjon ; prix d'achat = 4 × prix de revente.
- **Action « Objet » en combat** (DESIGN_DOC §2) : utiliser un consommable prend le tour du héros ; cible toujours choisie, avec l'effet prévu affiché (ex. « Cibler Mage · +28 PV », « retire Poison ») . La Plume de phénix ne propose que les alliés tombés.
- **Objets entre deux étages** : l'écran d'expédition liste les objets utilisables sur place (soins, Plume, Tente).

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
- **Légendaires** (refonte ; consultables à la création : bouton Détails, onglet Légendaires) : noms tirés de la littérature française, toujours la même base et la même stat principale (des uniques). **Trois par orientation** (42), chacun renforce une compétence ou un passif d'un **gros palier** de l'orientation (`power` : `skillMod`, ou bonus de stats avec `requires` = le passif renforcé, sans effet tant qu'il n'est pas appris). Exemples : La Statue du Commandeur (Provocation donne Protection), La Bête humaine (Berserk plus fort), Les Fleurs du Mal (Lame empoisonnée), L'Arsenic d'Emma (Venin virulent ralentit), Le Horla (Confusion + Terreur), Une saison en enfer (Immolation), Ô temps, suspends ton vol (Nova de givre), L'Albatros (Tir perçant), Le Roman de Renart (Piège à mâchoires), Le Panache de Cyrano (Intercession), Demain, dès l'aube (Lumière de l'aube purifie)…
  **Légendaires communs** (toutes classes) : Plume légère (bottes légères, Intelligence : changer de position ne prend pas le tour, une fois par tour), Fratricide (dague, Agilité : 15 % de chance de refaire gratuitement l'attaque ou la compétence), Cœur sacrifié (collier, Force : +15 % de dégâts infligés, mais 10 % des PV max par attaque ou compétence, jamais le dernier PV), Les Bottes de sept lieues (+25 % de Vitesse), L'Olifant de Roland (Puissance sur toute l'équipe au début de chaque combat). Effets en combat dans `game/combat.js` (`canMove`, `hasFreeMove`, `echoes`, `payBloodPrice`, `startEffects`). N'importe quel légendaire peut tomber, quelle que soit l'équipe.
- **Combat** : dégâts × 100 / (100 + Défense ou Défense magique de la cible) ; critique selon Taux/Dégâts critiques ; Esquive = attaque évitée ; Blocage = dégâts réduits de moitié. Le Voleur utilise des points de combo (voir plus haut).

## Dégâts physiques et magiques

- **Puissance physique** = Attaque (armes et bonus d'objets) + stat physique de la classe × coefficient : **Force × 0,5** (Guerrier, et par défaut les classes magiques Prêtre et Mage), **Agilité × 0,6** (Voleur). À stat principale égale, un voleur fait donc un peu plus mal qu'un guerrier. Utilisée par l'attaque de base de toutes les classes et par les compétences non magiques ; réduite par la Défense de la cible.
- **Puissance magique** = 2 × Intelligence. Utilisée par les sorts (compétences `magic: true` : Boule de Feu, Éclair, Éclat de Lumière) et par tous les soins ; réduite par la Défense magique de la cible. Elle ne compte jamais pour une attaque à l'arme : un Mage qui tape au bâton fait peu de dégâts.
- Les éléments (feu, glace, foudre, lumière…) viendront plus tard sur les sorts.
- Coefficients dans `src/config.js` (`COMBAT.physStatFactor`, `COMBAT.magicPerInt`) ; stat physique par classe dans `src/data/classes.js` (`physStat`).
- **Butin** (`src/game/loot.js`, réglages `LOOT`) : pour chaque ennemi vaincu, **trois tirages indépendants** — un ennemi peut tout laisser, rien, ou un mélange :
  - équipement : 40 % (commun 50 %, peu commun 30 %, rare 14 %, épique 5 %, légendaire 1 %) ; boss : garanti (peu commun 35 %, rare 40 %, épique 20 %, légendaire 5 % en Balade) ;
  - matéria (arme ou armure au hasard) : 50 %, 1 à 2, **moins rares que l'équipement** (commun 40 %, peu commun 32 %, rare 18 %, épique 8 %, légendaire 2 %) ; boss : 2 à 4 garanties, meilleures que l'équipement du boss (épique 28 %, légendaire 12 % en Balade) ;
  - consommable : 20 % (60 % pour un boss), tiré selon son poids `drop` (potions fréquentes, Plume et Tente rares). Un consommable trouvé au-delà du maximum transporté est perdu.
- **Défaite** : chaque objet du sac a 50 % de chance d'être perdu (jamais tout le sac) ; l'équipement porté se perd aussi à partir de Guerre (voir Difficulté) ; les matéria et les consommables ne sont jamais perdus.
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
