// Événements d'expédition : après un combat gagné (hors boss), une chance
// qu'une rencontre propose un choix au joueur. Données pures (règles : game/events.js).
//
// Événement : { name, icon, text, weight, choices: [choix] } ou, pour un marchand
// ambulant, { kind: 'merchant', … } (stock tiré à la rencontre, voir EVENTS dans config.js).
// « Passer son chemin » est toujours proposé en plus.
//
// Choix : { label, cost?, outcomes: [{ chance, text, effects }] } (chances en %, total 100)
//   cost     { gold: { base, perLevel } } ou { consumable: clé } : payé en choisissant
// Effets (le niveau est celui de l'étage) :
//   gold        { base, perLevel }      or gagné
//   item        { minRarity }           un équipement de cette rareté ou mieux
//   materia     { rarity, amount }      matéria (d'arme ou d'armure au hasard)
//   consumable  'random' | clé          un consommable
//   restoreAll  %                       PV et ressource rendus aux héros en vie
//   hurtRandom  { count, pct }          `count` héros au hasard perdent pct % de leurs PV max
//   hurtAll     %                       chaque héros en vie perd ce % de ses PV max
// Un événement ne tue jamais : un héros garde au moins 1 PV.

export const EVENTS = {
  sorciere: {
    name: 'La sorcière', icon: '🧙‍♀️', weight: 10,
    text: 'Une sorcière encapuchonnée vous barre la route et vous propose un marché.',
    choices: [{
      label: 'Accepter le marché',
      outcomes: [
        { chance: 50, text: 'La sorcière tient parole et vous tend un objet.', effects: { item: { minRarity: 'peuCommun' } } },
        { chance: 50, text: 'Le marché tourne mal : un maléfice frappe deux de vos héros.', effects: { hurtRandom: { count: 2, pct: 30 } } },
      ],
    }],
  },
  autel: {
    name: 'Autel oublié', icon: '🕯️', weight: 10,
    text: "Un autel couvert d'offrandes anciennes luit faiblement dans la pénombre.",
    choices: [
      {
        label: 'Faire une offrande', cost: { gold: { base: 10, perLevel: 3 } },
        outcomes: [
          { chance: 70, text: "Une douce lumière enveloppe l'équipe.", effects: { restoreAll: 40 } },
          { chance: 30, text: "L'autel reste silencieux.", effects: {} },
        ],
      },
      {
        label: 'Piller les offrandes',
        outcomes: [
          { chance: 50, text: "Vous raflez l'or et les pierres de l'autel.", effects: { gold: { base: 20, perLevel: 8 }, materia: { rarity: 'peuCommun', amount: 2 } } },
          { chance: 50, text: "Une malédiction s'abat sur l'équipe.", effects: { hurtAll: 15 } },
        ],
      },
    ],
  },
  coffre: {
    name: 'Coffre abandonné', icon: '🧰', weight: 12,
    text: 'Un coffre abandonné gît au milieu du chemin. Trop beau pour être vrai ?',
    choices: [{
      label: "L'ouvrir",
      outcomes: [
        { chance: 60, text: 'Le coffre contient de l\'or et des provisions.', effects: { gold: { base: 15, perLevel: 6 }, consumable: 'random' } },
        { chance: 40, text: "C'était un piège ! Une lame jaillit du coffre.", effects: { hurtRandom: { count: 1, pct: 35 } } },
      ],
    }],
  },
  voyageur: {
    name: 'Voyageur blessé', icon: '🤕', weight: 8,
    text: 'Un voyageur blessé, adossé à un arbre, implore votre aide.',
    choices: [{
      label: 'Lui donner une potion de soin', cost: { consumable: 'potion' },
      outcomes: [
        { chance: 100, text: 'Reconnaissant, il vous offre ce qu\'il a de plus précieux.', effects: { materia: { rarity: 'rare', amount: 1 }, gold: { base: 10, perLevel: 4 } } },
      ],
    }],
  },
  source: {
    name: 'Source mystérieuse', icon: '⛲', weight: 10,
    text: "Une source aux reflets irisés murmure doucement. L'eau semble… vivante.",
    choices: [{
      label: 'Boire',
      outcomes: [
        { chance: 55, text: "L'eau vous revigore.", effects: { restoreAll: 50 } },
        { chance: 45, text: "L'eau est empoisonnée !", effects: { hurtAll: 20 } },
      ],
    }],
  },
  joueur: {
    name: 'Le joueur de dés', icon: '🎲', weight: 8,
    text: 'Un joueur de dés goguenard vous propose de parier votre or.',
    choices: [{
      label: 'Parier', cost: { gold: { base: 10, perLevel: 5 } },
      outcomes: [
        { chance: 45, text: 'Double six ! Vous doublez votre mise.', effects: { gold: { base: 20, perLevel: 10 } } },
        { chance: 55, text: 'Les dés ne vous aiment pas : vous perdez votre mise.', effects: {} },
      ],
    }],
  },
  marchand: {
    kind: 'merchant', name: 'Marchand ambulant', icon: '🧳', weight: 10,
    text: "Un marchand ambulant déballe sa marchandise : des pièces rares, à des prix qu'on ne trouve pas au village.",
  },
};

export const EVENT_ORDER = Object.keys(EVENTS);
