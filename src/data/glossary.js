// Lexique du jeu : les mots importants sont soulignés dans les textes et expliqués au
// survol (ui/glossary.js). Données pures.
//
// Entrée : { terms: [formes du mot], desc, cs? }
//   terms  formes reconnues (singulier, pluriel…) ; la plus longue gagne (« Puissance
//          physique » avant « Puissance »)
//   cs     sensible à la casse : pour les mots courants qui ne sont des termes du jeu
//          qu'avec une majuscule (« Force » la stat, pas « force les ennemis »)
// Les effets (data/effects.js) sont ajoutés automatiquement avec leur description.

import { EFFECTS } from './effects.js';
import { COMBAT } from '../config.js';

const MANUAL = {
  // ---- Objets ----
  equipement: { terms: ['équipement', 'équipements'], desc: "Armes, armures, boucliers et bijoux. Chaque pièce a une rareté, un niveau, des stats obligatoires, une stat principale et des secondaires. Écran Personnage : glisser un objet sur un emplacement pour l'équiper." },
  materia: { terms: ['matéria', 'matérias'], desc: "Cristaux de trois sortes (arme, armure, bijou) et cinq raretés. Tombent des monstres ou s'obtiennent en décraftant un objet. Servent à la Forge : améliorer (+1 à +5) et fabriquer des objets." },
  consommable: { terms: ['consommable', 'consommables'], desc: 'Potions, remèdes, Plume de phénix, Tente… Utilisables en combat (action Objets) ou entre deux combats. 9 exemplaires au plus de chacun dans le sac.' },
  legendaire: { terms: ['légendaire', 'légendaires'], desc: "Rareté orange : 4 secondaires et un pouvoir unique. Trois par orientation (chacun renforce un gros palier) et quelques-uns pour toutes les classes." },
  divin: { terms: ['divin', 'divins', 'divine', 'Divin'], desc: "Rareté rouge, uniquement sur les boss à partir de Guerre : 5 secondaires très fortes. À la Forge divine, un objet divin peut absorber le pouvoir (et le nom) d'un légendaire." },
  epique: { terms: ['épique', 'épiques'], desc: 'Rareté violette : 3 stats secondaires.' },
  statPrincipale: { terms: ['stat principale', 'stats principales'], desc: "Force, Agilité ou Intelligence : la stat mise en avant par l'objet. Force et Agilité renforcent les coups physiques (selon la classe), l'Intelligence les sorts et les soins." },
  secondaire: { terms: ['secondaire', 'secondaires', 'stat secondaire', 'stats secondaires'], desc: "Stats tirées au hasard sur un objet à partir de peu commun (1 à 5 selon la rareté). Le Runomancien peut en relancer une." },
  amelioration: { terms: ['amélioration', 'améliorer', 'améliorations'], desc: "À la Forge : +1 à +5, chaque niveau augmente les stats de l'objet de 10 %. Coûte de l'or et des matéria de chaque rareté jusqu'à celle de l'objet." },
  decraft: { terms: ['décraft', 'décrafter', 'décrafte'], desc: "Détruire un objet du sac à la Forge pour obtenir 1 à 3 matéria de sa rareté." },
  sac: { terms: ['sac'], desc: "Objets, matéria et consommables transportés. En cas de défaite, une partie du sac est perdue (jamais tout) ; la banque met à l'abri." },
  // ---- Stats ----
  force: { terms: ['Force'], cs: true, desc: 'Stat principale : renforce les coups physiques du Guerrier, du Paladin (Templier)…' },
  agilite: { terms: ['Agilité'], cs: true, desc: 'Stat principale : renforce les coups physiques du Voleur et du Chasseur (un peu plus que la Force).' },
  intelligence: { terms: ['Intelligence'], cs: true, desc: "Stat principale : puissance magique (× 2), qui renforce les sorts et les soins. Ne renforce jamais une attaque à l'arme." },
  attaque: { terms: ['Attaque'], cs: true, desc: 'Apportée par les armes : compte pour la puissance physique.' },
  armure: { terms: ['Armure'], cs: true, desc: 'Stat des armures et boucliers : compte à la fois comme Défense et comme Défense magique.' },
  defense: { terms: ['Défense'], cs: true, desc: 'Réduit les dégâts physiques subis.' },
  defenseMagique: { terms: ['Défense magique', 'Défenses'], cs: true, desc: 'Réduit les dégâts magiques subis.' },
  vitesse: { terms: ['Vitesse'], cs: true, desc: "Ordre de jeu en combat : le plus rapide agit en premier. Multipliée par la vitesse d'attaque de l'arme." },
  critique: { terms: ['Coup critique', 'critique', 'critiques'], desc: 'Coup critique : chance (en %) qu\'un coup direct (attaque, compétence, riposte) soit critique. Un critique multiplie les dégâts de ce coup par 1 + Dégâts critiques (50 % de base : ×1,5). Poisons, brûlures, pièges et soins ne sont jamais critiques.' },
  degatsCritiques: { terms: ['Dégâts critiques'], desc: 'Dégâts critiques : bonus de dégâts d\'un coup critique, en points de % qui s\'ajoutent aux 50 % de base (+36 % → un critique fait ×1,86 au lieu de ×1,5).' },
  esquive: { terms: ['Esquive'], cs: true, desc: `Chance d'éviter entièrement un coup (${COMBAT.caps.esquive} % au plus).` },
  blocage: { terms: ['Blocage'], cs: true, desc: `Chance de bloquer un coup, qui perd la moitié de ses dégâts (${COMBAT.caps.blocage} % au plus).` },
  riposte: { terms: ['Riposte'], cs: true, desc: 'Au corps à corps, chance de contre-attaquer quand on est frappé au corps à corps.' },
  pv: { terms: ['PV'], cs: true, desc: 'Points de vie. À 0, le héros tombe (relevé par une Plume de phénix, une Résurrection ou au village).' },
  puissancePhysique: { terms: ['puissance physique', 'Puissance physique'], desc: "Attaque des armes + Force ou Agilité (selon la classe) : base des coups physiques." },
  puissanceMagique: { terms: ['puissance magique', 'Puissance magique'], desc: 'Intelligence × 2 : base des sorts, des soins et des dégâts magiques sur la durée.' },
  // ---- Ressources et combat ----
  rage: { terms: ['Rage'], cs: true, desc: 'Ressource du Guerrier : se remplit en frappant et en encaissant des coups.' },
  energie: { terms: ['Énergie'], cs: true, desc: "Ressource du Voleur et du Chasseur : +45 par tour ; chaque action en coûte, on agit tant qu'on peut payer." },
  mana: { terms: ['Mana'], cs: true, desc: 'Ressource des lanceurs de sorts (Prêtre, Mage, Paladin) : +10 par tour.' },
  combo: { terms: ['points de combo', 'point de combo', 'combo', 'combos'], desc: "Voleur : les générateurs en donnent, les finishers les dépensent tous (5 au plus). Les finishers de l'Empoisonneur sont à pleine puissance dès 3 points." },
  finisher: { terms: ['finisher', 'finishers', 'Finisher'], desc: 'Compétence qui dépense tous les points de combo : plus il y en a, plus elle frappe fort.' },
  corpsACorps: { terms: ['corps à corps'], desc: "Position de combat en première ligne : on est plus souvent ciblé ; seules les armes de mêlée y servent. Riposte possible." },
  distance: { terms: ['à distance'], desc: "Position de combat en retrait : moins souvent ciblé ; l'arc ne sert qu'à distance." },
  boss: { terms: ['boss'], desc: "Gardien du dernier étage de chaque sous-zone : bien plus fort, bien meilleur butin. Le vaincre ouvre un point de départ." },
  elite: { terms: ['élite', 'élites'], desc: 'Monstre renforcé (plus gros, 1,5 × plus d\'XP et d\'or).' },
  // ---- Progression ----
  talent: { terms: ['point de talent', 'points de talent', 'talents'], desc: '1 point par niveau, à dépenser au Maître des compétences dans les orientations de la classe.' },
  orientation: { terms: ['orientation', 'orientations'], desc: 'Spécialisation de la classe (ex. Gardien ou Berserker) : un arbre de talents de 45 points.' },
  grosPalier: { terms: ['gros palier', 'gros paliers'], desc: 'Palier obligatoire : sort de départ, nouvelle compétence, passif important ou signature.' },
  petitPalier: { terms: ['petit palier', 'petits paliers'], desc: 'Trois bonus de stats au choix : on n\'en prend qu\'un, à tous ses rangs.' },
  signature: { terms: ['signature'], desc: "Compétence ultime d'une orientation, au dernier palier." },
  expedition: { terms: ['expédition', 'expéditions'], desc: "Descente dans un donjon : on enchaîne les étages sans soin automatique ; on ne rentre qu'après un boss." },
  sousZone: { terms: ['sous-zone', 'sous-zones'], desc: 'Chaque zone a 3 sous-zones de 5 étages, avec un boss au dernier.' },
  difficulte: { terms: ['difficulté'], desc: 'De Balade à Insanie : puissance des ennemis, butin et pertes en cas de mort. À partir d\'Horreur, tous les ennemis sont niveau 50.' },
};

// Lexique complet : entrées manuelles + effets du catalogue.
export const GLOSSARY = {
  ...Object.fromEntries(Object.entries(EFFECTS).map(([k, e]) => [`effet:${k}`, { terms: [e.name], cs: true, desc: `${e.kind === 'debuff' ? 'Effet négatif' : 'Effet positif'} : ${e.desc}` }])),
  ...MANUAL,
};
