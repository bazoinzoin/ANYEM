// Événements d'expédition : rencontres posées sur la carte de l'étage, qui proposent un
// DILEMME au joueur (chaque choix a son prix ou son risque). Données pures (règles :
// game/events.js).
//
// Événement : { name, icon, text, weight, choices: [choix] } ou, pour un marchand
// ambulant, { kind: 'merchant', … } (stock tiré à la rencontre, voir EVENTS dans config.js).
// « Passer son chemin » est toujours proposé en plus.
//
// Choix : { label, cost?, outcomes: [{ chance, text, effects }] } (chances en %, total 100)
//   cost     payé en choisissant (un ou plusieurs) :
//              gold { base, perLevel }        or
//              consumable clé                 un consommable
//              hpPct %                        chaque héros en vie perd ce % de ses PV max
//              materia { rarity, amount }     matéria de cette rareté (toutes sortes confondues)
//              bagItem true                   un objet du sac, au hasard
// Effets (le niveau est celui de l'étage) :
//   gold        { base, perLevel }      or gagné
//   item        { minRarity }           un équipement de cette rareté ou mieux
//   materia     { rarity, amount }      matéria (d'arme ou d'armure au hasard)
//   consumable  'random' | clé          un consommable
//   restoreAll  %                       PV et ressource rendus aux héros en vie
//   hurtRandom  { count, pct }          `count` héros au hasard perdent pct % de leurs PV max
//   hurtAll     %                       chaque héros en vie perd ce % de ses PV max
//   curseRandom { id, turns }           un héros au hasard subit cet effet négatif (il reste
//                                       d'un combat à l'autre, voir data/effects.js)
//   curseAll    { id, turns }           toute l'équipe le subit
//   blessAll    [{ id, turns }]         effets positifs posés au début du prochain combat
//   xpPct       %                       chaque héros gagne ce % de l'XP de son niveau suivant
//   cleanseAll  true                    retire les effets négatifs de toute l'équipe
//   consumables n                       n consommables au hasard
// Un événement ne tue jamais : un héros garde au moins 1 PV.
//
// look : ce qui le représente sur la carte (dessiné par ui/mapView.js, mis en valeur) :
//   { hero: apparence (data/appearance.js), pose? }  un personnage (pose 'hit' : blessé)
//   { object: [planche, x, y, l, h] }                 un objet d'une planche Raven Fantasy
//   extra : objet posé à côté du personnage (même format que object)

export const EVENTS = {
  sorciere: {
    name: 'La sorcière', icon: '🧙‍♀️', weight: 9,
    look: { hero: { hair: 'longs', hairColor: 'noir', eyes: 'violets', skin: 'pale', top: 'sorciere', bottom: 'sombre' } },
    text: 'Une sorcière encapuchonnée vous barre la route : « Un marché, ou un philtre ? Les deux ont un prix. »',
    choices: [
      {
        label: 'Accepter son marché',
        outcomes: [
          { chance: 50, text: 'La sorcière tient parole et vous tend un objet.', effects: { item: { minRarity: 'peuCommun' } } },
          { chance: 50, text: 'Le marché tourne mal : un maléfice frappe deux de vos héros.', effects: { hurtRandom: { count: 2, pct: 30 } } },
        ],
      },
      {
        label: 'Lui acheter un philtre', cost: { gold: { base: 15, perLevel: 4 } },
        outcomes: [{ chance: 100, text: 'Le philtre bout dans vos veines : vous frapperez fort au prochain combat.', effects: { blessAll: [{ id: 'puissance', turns: 3 }] } }],
      },
    ],
  },
  autel: {
    name: 'Autel oublié', icon: '🕯️', weight: 9,
    look: { object: ['dungeon_obj', 248, 176, 32, 32] },
    text: "Un autel couvert d'offrandes anciennes luit faiblement. Il réclame quelque chose : de l'or, du sang… ou rien, si l'on se sert soi-même.",
    choices: [
      {
        label: 'Faire une offrande', cost: { gold: { base: 10, perLevel: 3 } },
        outcomes: [
          { chance: 70, text: "Une douce lumière enveloppe l'équipe et chasse ses maux.", effects: { restoreAll: 40, cleanseAll: true } },
          { chance: 30, text: "L'autel reste silencieux.", effects: {} },
        ],
      },
      {
        label: 'Offrir son sang', cost: { hpPct: 20 },
        outcomes: [{ chance: 100, text: "Le sang s'écoule sur la pierre, qui se fend : une matéria y brille.", effects: { materia: { rarity: 'rare', amount: 1 } } }],
      },
      {
        label: 'Piller les offrandes',
        outcomes: [
          { chance: 50, text: "Vous raflez l'or et les pierres de l'autel.", effects: { gold: { base: 20, perLevel: 8 }, materia: { rarity: 'peuCommun', amount: 2 } } },
          { chance: 50, text: "Une malédiction s'abat sur l'équipe.", effects: { hurtAll: 15, curseAll: { id: 'affaibli', turns: 3 } } },
        ],
      },
    ],
  },
  coffre: {
    name: 'Coffre abandonné', icon: '🧰', weight: 10,
    look: { object: ['dungeon_obj', 323, 124, 26, 19] },
    text: 'Un coffre abandonné gît au milieu du chemin. Trop beau pour être vrai ?',
    choices: [
      {
        label: "L'ouvrir",
        outcomes: [
          { chance: 60, text: 'Le coffre contient de l\'or et des provisions.', effects: { gold: { base: 15, perLevel: 6 }, consumable: 'random' } },
          { chance: 40, text: "C'était un piège ! Une lame jaillit du coffre.", effects: { hurtRandom: { count: 1, pct: 35 } } },
        ],
      },
      {
        label: 'Le fracasser de loin',
        outcomes: [{ chance: 100, text: 'Le piège se déclenche dans le vide… et brise les fioles. Il reste un peu d\'or.', effects: { gold: { base: 8, perLevel: 3 } } }],
      },
    ],
  },
  voyageur: {
    name: 'Voyageur blessé', icon: '🤕', weight: 8,
    look: { hero: { hair: 'courts', hairColor: 'chatain', eyes: 'clos', skin: 'halee', top: 'voyageur', bottom: 'cuir' }, pose: 'hit' },
    text: 'Un voyageur blessé, adossé à un mur, implore votre aide. Sa bourse est bien remplie.',
    choices: [
      {
        label: 'Le soigner', cost: { consumable: 'potion' },
        outcomes: [{ chance: 100, text: 'Reconnaissant, il vous offre ce qu\'il a de plus précieux.', effects: { materia: { rarity: 'rare', amount: 1 }, gold: { base: 10, perLevel: 4 } } }],
      },
      {
        label: "L'escorter jusqu'à la sortie", cost: { hpPct: 10 },
        outcomes: [{ chance: 100, text: 'Le chemin est long, mais il vous apprend tout ce qu\'il sait de ces lieux.', effects: { xpPct: 20 } }],
      },
      {
        label: 'Le détrousser',
        outcomes: [{ chance: 100, text: 'Vous prenez sa bourse. Son regard vous hantera longtemps.', effects: { gold: { base: 30, perLevel: 10 }, curseRandom: { id: 'terreur', turns: 3 } } }],
      },
    ],
  },
  source: {
    name: 'Source mystérieuse', icon: '⛲', weight: 8,
    look: { object: ['dungeon_obj', 290, 177, 28, 30] },
    text: "Une source aux reflets irisés murmure doucement. L'eau semble… vivante.",
    choices: [
      {
        label: 'Boire',
        outcomes: [
          { chance: 55, text: "L'eau vous revigore.", effects: { restoreAll: 50 } },
          { chance: 45, text: "L'eau est empoisonnée !", effects: { hurtAll: 20 } },
        ],
      },
      {
        label: 'Remplir une gourde',
        outcomes: [
          { chance: 70, text: "L'eau se change en élixir dans la gourde.", effects: { consumable: 'potion' } },
          { chance: 30, text: "L'eau croupit aussitôt : celui qui la porte s'en trouve affaibli.", effects: { curseRandom: { id: 'affaibli', turns: 3 } } },
        ],
      },
    ],
  },
  joueur: {
    name: 'Le joueur de dés', icon: '🎲', weight: 7,
    look: { hero: { hair: 'crete', hairColor: 'rose', eyes: 'plisses', skin: 'mate', top: 'barde', bottom: 'pourpre' } },
    text: 'Un joueur de dés goguenard vous propose de parier votre or. « Petite mise, petit gain… ou tout sur un seul lancer ? »',
    choices: [
      {
        label: 'Parier', cost: { gold: { base: 10, perLevel: 5 } },
        outcomes: [
          { chance: 45, text: 'Double six ! Vous doublez votre mise.', effects: { gold: { base: 20, perLevel: 10 } } },
          { chance: 55, text: 'Les dés ne vous aiment pas : vous perdez votre mise.', effects: {} },
        ],
      },
      {
        label: 'Tout miser', cost: { gold: { base: 30, perLevel: 12 } },
        outcomes: [
          { chance: 30, text: 'Le dé roule, roule… et tombe sur le bon côté : vous triplez votre mise !', effects: { gold: { base: 90, perLevel: 36 } } },
          { chance: 70, text: 'Le joueur ramasse vos pièces en souriant.', effects: {} },
        ],
      },
    ],
  },
  marchand: {
    kind: 'merchant', name: 'Marchand ambulant', icon: '🧳', weight: 9,
    look: { hero: { hair: 'chignon', hairColor: 'blanc', eyes: 'dores', skin: 'foncee', top: 'rodeur', bottom: 'toile' }, extra: ['dungeon_obj', 322, 156, 26, 19] },
    text: "Un marchand ambulant déballe sa marchandise : des pièces rares, à des prix qu'on ne trouve pas au village.",
  },
  cadavre: {
    name: "Dépouille d'aventurier", icon: '💀', weight: 8,
    look: { object: ['dungeon_obj', 226, 66, 27, 32] },
    text: "Les restes d'un aventurier enchaîné gisent là. Sa besace n'a pas l'air vide… mais une odeur de maladie flotte autour.",
    choices: [
      {
        label: 'Fouiller le cadavre',
        outcomes: [
          { chance: 55, text: 'Sa besace contient encore de quoi survivre.', effects: { gold: { base: 12, perLevel: 5 }, consumable: 'random' } },
          { chance: 20, text: 'Sous les haillons, une pièce d\'équipement intacte !', effects: { item: { minRarity: 'rare' } } },
          { chance: 25, text: 'Une maladie ronge celui qui a fouillé la dépouille.', effects: { curseRandom: { id: 'affaibli', turns: 4 } } },
        ],
      },
      {
        label: 'Lui offrir une sépulture',
        outcomes: [{ chance: 100, text: 'Vous l\'enterrez sans rien prendre. Au prochain combat, une présence veille sur vous.', effects: { blessAll: [{ id: 'protection', turns: 3 }] } }],
      },
    ],
  },
  prisonnier: {
    name: 'Le prisonnier', icon: '⛓️', weight: 8,
    look: { hero: { hair: 'boucles', hairColor: 'brun', eyes: 'bruns', skin: 'halee', top: 'bure', bottom: 'toile' }, pose: 'hit', extra: ['dungeon_obj', 224, 14, 28, 34] },
    text: "Un prisonnier vous supplie derrière des barreaux. Son geôlier dort tout près, la clé à la ceinture ; il paierait bien qui lui signalerait une évasion.",
    choices: [
      {
        label: 'Voler la clé et le libérer',
        outcomes: [
          { chance: 60, text: 'Le prisonnier file en vous glissant ses secrets et ses provisions cachées.', effects: { xpPct: 15, consumable: 'random' } },
          { chance: 40, text: 'Le geôlier se réveille ! Vous fuyez avec le prisonnier sous les coups.', effects: { hurtAll: 20, xpPct: 15 } },
        ],
      },
      {
        label: 'Réveiller le geôlier',
        outcomes: [{ chance: 100, text: 'Le geôlier vous paie grassement. Les cris du prisonnier vous poursuivent.', effects: { gold: { base: 35, perLevel: 12 }, curseRandom: { id: 'terreur', turns: 3 } } }],
      },
    ],
  },
  pelerin: {
    name: 'Le pèlerin fiévreux', icon: '🙏', weight: 7,
    look: { hero: { hair: 'rase', hairColor: 'blanc', eyes: 'clos', skin: 'claire', top: 'pretre', bottom: 'lin' }, pose: 'hit' },
    text: "Un vieux pèlerin grelotte de fièvre. Il ne vous demande rien… mais il porte au cou une amulette qui luit.",
    choices: [
      {
        label: 'Lui donner un remède', cost: { consumable: 'remede' },
        outcomes: [{ chance: 100, text: 'Guéri, il vous bénit et vous confie son amulette.', effects: { item: { minRarity: 'rare' }, blessAll: [{ id: 'protection', turns: 2 }] } }],
      },
      {
        label: 'Prier avec lui',
        outcomes: [{ chance: 100, text: 'Vous veillez le vieil homme. La prière apaise l\'équipe.', effects: { restoreAll: 25, cleanseAll: true } }],
      },
      {
        label: 'Prendre l\'amulette',
        outcomes: [
          { chance: 60, text: 'Il n\'a pas la force de vous en empêcher.', effects: { item: { minRarity: 'peuCommun' } } },
          { chance: 40, text: 'L\'amulette brûle la main qui la prend : elle était maudite.', effects: { curseAll: { id: 'terreur', turns: 2 } } },
        ],
      },
    ],
  },
  stele: {
    name: 'La stèle aux deux visages', icon: '🗿', weight: 7,
    look: { object: ['dungeon_obj', 104, 304, 32, 34] },
    text: "Une stèle sculptée de deux visages : l'un sourit, l'autre grimace. Une inscription : « Choisis. »",
    choices: [
      {
        label: 'Toucher le visage souriant',
        outcomes: [{ chance: 100, text: 'Une chaleur douce parcourt l\'équipe.', effects: { restoreAll: 60 } }],
      },
      {
        label: 'Toucher le visage grimaçant',
        outcomes: [{ chance: 100, text: 'La pierre crache deux matéria… et un froid mortel.', effects: { materia: { rarity: 'rare', amount: 2 }, curseAll: { id: 'affaibli', turns: 3 } } }],
      },
    ],
  },
  alchimiste: {
    name: "L'alchimiste fou", icon: '⚗️', weight: 7,
    look: { hero: { hair: 'herisses', hairColor: 'vert', eyes: 'grands', skin: 'pale', top: 'mage', bottom: 'gris' }, extra: ['dungeon_obj', 100, 56, 46, 24] },
    text: "Un alchimiste aux yeux fous agite une fiole fumante : « Goûtez ! C'est presque au point ! » Ses autres fioles, elles, ont l'air sûres… et chères.",
    choices: [
      {
        label: "Boire l'élixir expérimental",
        outcomes: [
          { chance: 50, text: 'Vos muscles se tendent, le monde ralentit : quelle puissance !', effects: { blessAll: [{ id: 'puissance', turns: 3 }, { id: 'hate', turns: 3 }] } },
          { chance: 50, text: "L'élixir tourne la tête de toute l'équipe.", effects: { curseAll: { id: 'confus', turns: 2 } } },
        ],
      },
      {
        label: 'Lui acheter des fioles', cost: { gold: { base: 20, perLevel: 6 } },
        outcomes: [{ chance: 100, text: 'Il vous cède trois fioles en marmonnant.', effects: { consumables: 3 } }],
      },
    ],
  },
  grimoire: {
    name: 'Le grimoire interdit', icon: '📕', weight: 6,
    look: { object: ['dungeon_obj', 8, 304, 34, 34] },
    text: "Dans une crypte ouverte, un grimoire relié de peau attend sur un cercueil. Il chuchote des secrets… et des folies.",
    choices: [
      {
        label: 'Lire le grimoire',
        outcomes: [{ chance: 100, text: 'Un savoir terrible s\'imprime dans vos esprits… qui vacillent.', effects: { xpPct: 30, curseAll: { id: 'confus', turns: 2 } } }],
      },
      {
        label: 'Le brûler',
        outcomes: [{ chance: 100, text: 'Les flammes purifient la crypte, et l\'équipe avec elle.', effects: { cleanseAll: true, restoreAll: 20 } }],
      },
    ],
  },
  mercenaire: {
    name: 'Le mercenaire', icon: '🗡️', weight: 7,
    look: { hero: { hair: 'queue', hairColor: 'roux', eyes: 'gris', skin: 'mate', top: 'loup', bottom: 'cuir' } },
    text: "Un mercenaire désœuvré aiguise sa lame : « Je me bats avec vous pour de l'or… ou contre vous, pour le plaisir. »",
    choices: [
      {
        label: "L'engager", cost: { gold: { base: 20, perLevel: 7 } },
        outcomes: [{ chance: 100, text: 'Il vous suit jusqu\'au prochain combat et montre l\'exemple.', effects: { blessAll: [{ id: 'puissance', turns: 3 }, { id: 'protection', turns: 2 }] } }],
      },
      {
        label: 'Le défier en duel',
        outcomes: [
          { chance: 50, text: 'Vous l\'emportez : il paie son dû et vous en tirez une leçon.', effects: { gold: { base: 20, perLevel: 8 }, xpPct: 15 } },
          { chance: 50, text: 'Il vous donne une rude leçon.', effects: { hurtRandom: { count: 2, pct: 40 } } },
        ],
      },
    ],
  },
  forgeron: {
    name: 'Le forgeron fantôme', icon: '🔨', weight: 6,
    look: { hero: { hair: 'rase', hairColor: 'blanc', eyes: 'clos', skin: 'pale', top: 'bronze', bottom: 'jambieres' } },
    text: "Le spectre d'un forgeron frappe une enclume invisible. Il tend la main : il lui faut de la matière, ou de l'or.",
    choices: [
      {
        label: 'Lui confier des matéria', cost: { materia: { rarity: 'peuCommun', amount: 3 } },
        outcomes: [{ chance: 100, text: 'Il forge en silence une pièce remarquable.', effects: { item: { minRarity: 'rare' } } }],
      },
      {
        label: 'Le payer', cost: { gold: { base: 25, perLevel: 8 } },
        outcomes: [{ chance: 100, text: 'Il forge une pièce honnête avant de s\'évanouir.', effects: { item: { minRarity: 'peuCommun' } } }],
      },
    ],
  },
  gouffre: {
    name: 'Le gouffre qui murmure', icon: '🕳️', weight: 6,
    look: { object: ['dungeon_obj', 148, 228, 40, 24] },
    text: "Au bord d'un gouffre sans fond, une voix murmure : « Donne-moi ce qui compte pour toi, je te rendrai mieux. »",
    choices: [
      {
        label: 'Jeter un objet du sac', cost: { bagItem: true },
        outcomes: [
          { chance: 70, text: 'Le gouffre recrache un objet bien meilleur.', effects: { item: { minRarity: 'epique' } } },
          { chance: 30, text: 'Le gouffre garde tout et se tait.', effects: {} },
        ],
      },
      {
        label: 'Jeter de l\'or', cost: { gold: { base: 15, perLevel: 5 } },
        outcomes: [
          { chance: 50, text: 'Un souffle tiède remonte du gouffre.', effects: { restoreAll: 35 } },
          { chance: 50, text: 'Rien. Juste l\'écho des pièces qui tombent.', effects: {} },
        ],
      },
    ],
  },
};

export const EVENT_ORDER = Object.keys(EVENTS);
