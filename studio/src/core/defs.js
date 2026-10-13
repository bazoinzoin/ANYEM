// Catalogue des instruments et des effets : paramètres (bornes, valeur par défaut, unité),
// réglages mis en avant (« commandes rapides ») et textes d'aide. Données pures.
// Un paramètre : { key, label, min, max, step, def, unit, curve: 'lin' | 'log', options }.

const WAVES = [
  { value: 'sawtooth', label: 'Dent de scie' },
  { value: 'square', label: 'Carré' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sine', label: 'Sinus' },
];

const FILTER_TYPES = [
  { value: 'lowpass', label: 'Passe-bas' },
  { value: 'highpass', label: 'Passe-haut' },
  { value: 'bandpass', label: 'Passe-bande' },
];

const p = (key, label, min, max, def, extra = {}) => ({ key, label, min, max, def, step: 0, unit: '', curve: 'lin', ...extra });

export const INSTRUMENTS = {
  synth: {
    label: 'Synthétiseur',
    help: 'Synthé analogique : deux oscillateurs, un filtre et des enveloppes. Idéal pour basses, nappes, leads.',
    params: [
      p('osc1', 'Onde 1', 0, 0, 'sawtooth', { options: WAVES }),
      p('osc2', 'Onde 2', 0, 0, 'square', { options: WAVES }),
      p('osc2Semi', 'Hauteur onde 2', -24, 24, 0, { step: 1, unit: 'demi-tons' }),
      p('detune', 'Désaccord', 0, 50, 7, { unit: 'cents' }),
      p('oscMix', 'Mélange 1 / 2', 0, 1, 0.5),
      p('sub', 'Sous-oscillateur', 0, 1, 0),
      p('noise', 'Bruit', 0, 1, 0),
      p('filterType', 'Type de filtre', 0, 0, 'lowpass', { options: FILTER_TYPES }),
      p('cutoff', 'Brillance', 40, 18000, 3000, { unit: 'Hz', curve: 'log' }),
      p('resonance', 'Résonance', 0, 20, 2),
      p('envAmount', 'Mouvement du filtre', 0, 1, 0.4),
      p('fAttack', 'Attaque du filtre', 0, 2, 0.01, { unit: 's' }),
      p('fDecay', 'Retombée du filtre', 0.01, 4, 0.4, { unit: 's', curve: 'log' }),
      p('attack', 'Attaque', 0.001, 4, 0.005, { unit: 's', curve: 'log' }),
      p('decay', 'Déclin', 0.01, 4, 0.3, { unit: 's', curve: 'log' }),
      p('sustain', 'Maintien', 0, 1, 0.7),
      p('release', 'Relâchement', 0.01, 6, 0.3, { unit: 's', curve: 'log' }),
      p('vibrato', 'Vibrato', 0, 50, 0, { unit: 'cents' }),
      p('lfoRate', 'Vitesse du vibrato', 0.1, 12, 5, { unit: 'Hz' }),
      p('glide', 'Glissando', 0, 0.5, 0, { unit: 's' }),
      p('velSens', 'Sensibilité au toucher', 0, 1, 0.7),
      p('volume', 'Volume', -30, 6, -8, { unit: 'dB' }),
    ],
    smart: ['cutoff', 'resonance', 'attack', 'release', 'detune', 'vibrato'],
  },
  keys: {
    label: 'Piano électrique & cloches',
    help: 'Synthèse FM : sons de pianos électriques, cloches, marimbas. « Éclat » règle le mordant de l\'attaque.',
    params: [
      p('ratio', 'Timbre (rapport)', 0.5, 14, 1, { step: 0.5 }),
      p('index', 'Éclat', 0, 10, 2.5),
      p('modDecay', 'Durée de l\'éclat', 0.05, 5, 0.8, { unit: 's', curve: 'log' }),
      p('tine', 'Lame métallique', 0, 1, 0.3),
      p('attack', 'Attaque', 0.001, 2, 0.003, { unit: 's', curve: 'log' }),
      p('decay', 'Déclin', 0.1, 10, 2.5, { unit: 's', curve: 'log' }),
      p('sustain', 'Maintien', 0, 1, 0.15),
      p('release', 'Relâchement', 0.01, 4, 0.4, { unit: 's', curve: 'log' }),
      p('tremolo', 'Trémolo', 0, 1, 0),
      p('velSens', 'Sensibilité au toucher', 0, 1, 0.8),
      p('volume', 'Volume', -30, 6, -6, { unit: 'dB' }),
    ],
    smart: ['index', 'modDecay', 'tine', 'decay', 'release', 'tremolo'],
  },
  organ: {
    label: 'Orgue à tirettes',
    help: 'Orgue à neuf tirettes (de la plus grave à la plus aiguë), percussion et cabine tournante.',
    params: [
      p('d1', 'Tirette 16\'', 0, 8, 8, { step: 1 }),
      p('d2', 'Tirette 5 1/3\'', 0, 8, 8, { step: 1 }),
      p('d3', 'Tirette 8\'', 0, 8, 8, { step: 1 }),
      p('d4', 'Tirette 4\'', 0, 8, 0, { step: 1 }),
      p('d5', 'Tirette 2 2/3\'', 0, 8, 0, { step: 1 }),
      p('d6', 'Tirette 2\'', 0, 8, 0, { step: 1 }),
      p('d7', 'Tirette 1 3/5\'', 0, 8, 0, { step: 1 }),
      p('d8', 'Tirette 1 1/3\'', 0, 8, 0, { step: 1 }),
      p('d9', 'Tirette 1\'', 0, 8, 0, { step: 1 }),
      p('perc', 'Percussion', 0, 1, 0.4),
      p('click', 'Clic de touche', 0, 1, 0.3),
      p('rotary', 'Cabine tournante', 0, 1, 0.4),
      p('rotarySpeed', 'Vitesse de rotation', 0.5, 7, 1.2, { unit: 'Hz' }),
      p('attack', 'Attaque', 0.001, 1, 0.005, { unit: 's', curve: 'log' }),
      p('release', 'Relâchement', 0.01, 2, 0.05, { unit: 's', curve: 'log' }),
      p('volume', 'Volume', -30, 6, -10, { unit: 'dB' }),
    ],
    smart: ['d1', 'd3', 'd4', 'perc', 'rotary', 'rotarySpeed'],
  },
  drums: {
    label: 'Boîte à rythmes',
    help: 'Batterie synthétisée. Chaque note correspond à un élément (grosse caisse, caisse claire, charleston…).',
    params: [
      p('kit', 'Kit', 0, 0, '808', {
        options: [
          { value: '808', label: 'Kit 808' },
          { value: 'acoustic', label: 'Kit acoustique' },
          { value: 'electro', label: 'Kit électro' },
          { value: 'lofi', label: 'Kit lo-fi' },
        ],
      }),
      p('tune', 'Accord', -12, 12, 0, { step: 1, unit: 'demi-tons' }),
      p('decay', 'Longueur', 0.3, 2.5, 1),
      p('tone', 'Brillance', 0, 1, 0.5),
      p('punch', 'Impact', 0, 1, 0.5),
      p('volume', 'Volume', -30, 6, -4, { unit: 'dB' }),
    ],
    smart: ['tune', 'decay', 'tone', 'punch'],
  },
  sampler: {
    label: 'Échantillonneur',
    help: 'Joue un son enregistré (importé) à toutes les hauteurs du clavier.',
    params: [
      p('root', 'Note d\'origine', 24, 108, 60, { step: 1 }),
      p('fine', 'Accord fin', -100, 100, 0, { unit: 'cents' }),
      p('loop', 'Boucle', 0, 0, 'off', { options: [{ value: 'off', label: 'Non' }, { value: 'on', label: 'Oui' }] }),
      p('cutoff', 'Brillance', 40, 18000, 18000, { unit: 'Hz', curve: 'log' }),
      p('attack', 'Attaque', 0.001, 4, 0.002, { unit: 's', curve: 'log' }),
      p('decay', 'Déclin', 0.01, 4, 0.5, { unit: 's', curve: 'log' }),
      p('sustain', 'Maintien', 0, 1, 1),
      p('release', 'Relâchement', 0.01, 6, 0.2, { unit: 's', curve: 'log' }),
      p('velSens', 'Sensibilité au toucher', 0, 1, 0.6),
      p('volume', 'Volume', -30, 6, -4, { unit: 'dB' }),
    ],
    smart: ['root', 'cutoff', 'attack', 'release'],
  },
};

export const INSTRUMENT_ORDER = ['synth', 'keys', 'organ', 'drums', 'sampler'];

export const EFFECTS = {
  eq: {
    label: 'Égaliseur',
    help: 'Corrige le timbre : grave, médium, aigu. « Coupe-bas » retire les graves inutiles.',
    params: [
      p('lowCut', 'Coupe-bas', 20, 600, 20, { unit: 'Hz', curve: 'log' }),
      p('lowGain', 'Graves', -18, 18, 0, { unit: 'dB' }),
      p('lowFreq', 'Fréquence des graves', 40, 500, 120, { unit: 'Hz', curve: 'log' }),
      p('midGain', 'Médiums', -18, 18, 0, { unit: 'dB' }),
      p('midFreq', 'Fréquence des médiums', 200, 8000, 1000, { unit: 'Hz', curve: 'log' }),
      p('midQ', 'Largeur des médiums', 0.3, 8, 1, { curve: 'log' }),
      p('highGain', 'Aigus', -18, 18, 0, { unit: 'dB' }),
      p('highFreq', 'Fréquence des aigus', 2000, 16000, 8000, { unit: 'Hz', curve: 'log' }),
    ],
  },
  comp: {
    label: 'Compresseur',
    help: 'Resserre la dynamique : les passages forts sont atténués, le son devient plus régulier et présent.',
    params: [
      p('threshold', 'Seuil', -60, 0, -18, { unit: 'dB' }),
      p('ratio', 'Taux', 1, 20, 4, { curve: 'log' }),
      p('attack', 'Attaque', 0.5, 200, 10, { unit: 'ms', curve: 'log' }),
      p('release', 'Relâchement', 20, 1000, 150, { unit: 'ms', curve: 'log' }),
      p('knee', 'Douceur', 0, 30, 6, { unit: 'dB' }),
      p('makeup', 'Gain de sortie', 0, 24, 3, { unit: 'dB' }),
    ],
  },
  reverb: {
    label: 'Réverbération',
    help: 'Place le son dans une pièce, une salle ou une cathédrale.',
    params: [
      p('size', 'Taille de la salle', 0.3, 8, 2.2, { unit: 's', curve: 'log' }),
      p('damping', 'Matité', 0, 1, 0.5),
      p('predelay', 'Pré-délai', 0, 150, 15, { unit: 'ms' }),
      p('mix', 'Dosage', 0, 1, 0.3),
    ],
  },
  delay: {
    label: 'Écho',
    help: 'Répète le son en rythme avec le tempo du morceau.',
    params: [
      p('sync', 'Rythme', 0, 0, '1/8.', {
        options: [
          { value: '1/4', label: 'Noire' }, { value: '1/4.', label: 'Noire pointée' },
          { value: '1/8', label: 'Croche' }, { value: '1/8.', label: 'Croche pointée' },
          { value: '1/8T', label: 'Triolet' }, { value: '1/16', label: 'Double croche' },
          { value: 'ms', label: 'Libre (ms)' },
        ],
      }),
      p('time', 'Temps libre', 20, 2000, 375, { unit: 'ms', curve: 'log' }),
      p('feedback', 'Répétitions', 0, 0.95, 0.35),
      p('tone', 'Couleur', 500, 16000, 5000, { unit: 'Hz', curve: 'log' }),
      p('pingpong', 'Gauche / droite', 0, 0, 'on', { options: [{ value: 'off', label: 'Non' }, { value: 'on', label: 'Oui' }] }),
      p('mix', 'Dosage', 0, 1, 0.25),
    ],
  },
  chorus: {
    label: 'Chorus',
    help: 'Épaissit et élargit le son, comme plusieurs instruments joués ensemble.',
    params: [
      p('rate', 'Vitesse', 0.05, 5, 0.8, { unit: 'Hz', curve: 'log' }),
      p('depth', 'Profondeur', 0, 1, 0.5),
      p('mix', 'Dosage', 0, 1, 0.5),
    ],
  },
  phaser: {
    label: 'Phaser',
    help: 'Balayage tourbillonnant, typique des guitares et pianos électriques des années 70.',
    params: [
      p('rate', 'Vitesse', 0.05, 8, 0.5, { unit: 'Hz', curve: 'log' }),
      p('depth', 'Profondeur', 0, 1, 0.7),
      p('feedback', 'Intensité', 0, 0.9, 0.5),
      p('mix', 'Dosage', 0, 1, 0.5),
    ],
  },
  distortion: {
    label: 'Saturation',
    help: 'Chauffe le son, de la légère couleur à la grosse distorsion.',
    params: [
      p('drive', 'Saturation', 0, 1, 0.3),
      p('tone', 'Couleur', 500, 12000, 4000, { unit: 'Hz', curve: 'log' }),
      p('mix', 'Dosage', 0, 1, 1),
      p('output', 'Sortie', -24, 6, -3, { unit: 'dB' }),
    ],
  },
  filter: {
    label: 'Filtre',
    help: 'Filtre réglable, avec balayage automatique optionnel.',
    params: [
      p('type', 'Type', 0, 0, 'lowpass', { options: FILTER_TYPES }),
      p('cutoff', 'Fréquence', 40, 18000, 2000, { unit: 'Hz', curve: 'log' }),
      p('resonance', 'Résonance', 0, 20, 2),
      p('lfoRate', 'Vitesse du balayage', 0.05, 10, 0.5, { unit: 'Hz', curve: 'log' }),
      p('lfoDepth', 'Ampleur du balayage', 0, 1, 0),
    ],
  },
  tremolo: {
    label: 'Trémolo',
    help: 'Fait varier le volume (ou la position gauche / droite) en rythme.',
    params: [
      p('mode', 'Mode', 0, 0, 'volume', { options: [{ value: 'volume', label: 'Volume' }, { value: 'pan', label: 'Gauche / droite' }] }),
      p('rate', 'Vitesse', 0.1, 15, 4, { unit: 'Hz', curve: 'log' }),
      p('depth', 'Profondeur', 0, 1, 0.5),
    ],
  },
  lofi: {
    label: 'Lo-fi',
    help: 'Dégrade le son façon vieux échantillonneur ou cassette.',
    params: [
      p('bits', 'Résolution', 2, 16, 8, { step: 1, unit: 'bits' }),
      p('tone', 'Bande passante', 1000, 16000, 6000, { unit: 'Hz', curve: 'log' }),
      p('wobble', 'Pleurage', 0, 1, 0.2),
      p('mix', 'Dosage', 0, 1, 1),
    ],
  },
  limiter: {
    label: 'Limiteur',
    help: 'Empêche le son de dépasser un plafond et le rend plus fort. À placer en dernier sur la sortie.',
    params: [
      p('gain', 'Gain', 0, 18, 0, { unit: 'dB' }),
      p('ceiling', 'Plafond', -12, 0, -1, { unit: 'dB' }),
      p('release', 'Relâchement', 10, 500, 80, { unit: 'ms', curve: 'log' }),
    ],
  },
};

export const EFFECT_ORDER = ['eq', 'comp', 'reverb', 'delay', 'chorus', 'phaser', 'distortion', 'filter', 'tremolo', 'lofi', 'limiter'];

export function paramDefaults(defs) {
  const out = {};
  for (const d of defs) out[d.key] = d.def;
  return out;
}

export function instrumentDefaults(type) {
  return paramDefaults((INSTRUMENTS[type] || INSTRUMENTS.synth).params);
}

export function effectDefaults(type) {
  return paramDefaults((EFFECTS[type] || EFFECTS.eq).params);
}

export function findParam(defs, key) {
  return defs.find((d) => d.key === key) || null;
}

// Position 0-1 d'un réglage ↔ valeur (échelle logarithmique pour fréquences et durées).
export function paramToNorm(def, value) {
  if (def.options) return 0;
  const v = Math.max(def.min, Math.min(def.max, value));
  if (def.curve === 'log' && def.min > 0) return Math.log(v / def.min) / Math.log(def.max / def.min);
  return (v - def.min) / (def.max - def.min);
}

export function normToParam(def, norm) {
  const n = Math.max(0, Math.min(1, norm));
  let v = def.curve === 'log' && def.min > 0
    ? def.min * (def.max / def.min) ** n
    : def.min + n * (def.max - def.min);
  if (def.step) v = Math.round(v / def.step) * def.step;
  return v;
}

export function formatParam(def, value) {
  if (def.options) {
    const o = def.options.find((x) => x.value === value);
    return o ? o.label : String(value);
  }
  let txt;
  const a = Math.abs(value);
  if (def.unit === 'Hz' && a >= 1000) return `${(value / 1000).toFixed(a >= 10000 ? 1 : 2)} kHz`;
  if (def.unit === 's' && a < 1) return `${Math.round(value * 1000)} ms`;
  if (def.step >= 1) txt = String(Math.round(value));
  else if (a >= 100) txt = value.toFixed(0);
  else if (a >= 10) txt = value.toFixed(1);
  else txt = value.toFixed(2);
  if (def.min === 0 && def.max === 1 && !def.unit) return `${Math.round(value * 100)} %`;
  if (def.unit === 'dB' && value > 0) txt = `+${txt}`;
  return def.unit ? `${txt} ${def.unit}` : txt;
}
