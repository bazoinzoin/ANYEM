import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOK_PARTS, CLASS_LOOKS, TOPS, BODIES } from '../src/data/appearance.js';
import { defaultLook, sanitizeLook, cycleLook, randomLook, lookKey, lookOf } from '../src/game/appearance.js';
import { createHero, createParty } from '../src/game/party.js';
import { CLASS_ORDER } from '../src/config.js';
import { HEADS, HEAD_OFFSETS } from '../src/ui/heroHeads.js';
import { composeHero, bodyColor, headPalette, FRAME, SHEET_COLS } from '../src/ui/heroCompose.js';
import { packFrame } from '../src/ui/actors.js';

test('apparence : au moins 10 choix de coupe, yeux, haut et bas ; chaque classe a sa tenue', () => {
  for (const part of ['hair', 'eyes', 'top', 'bottom', 'hairColor']) assert.ok(Object.keys(LOOK_PARTS[part]).length >= 10, part);
  for (const cls of CLASS_ORDER) {
    const look = CLASS_LOOKS[cls];
    for (const part of Object.keys(LOOK_PARTS)) assert.ok(LOOK_PARTS[part][look[part]], `${cls}.${part}`);
  }
  for (const top of Object.values(TOPS)) assert.ok(BODIES[top.body], top.label);
});

test('apparence : validation, choix suivant en boucle, clé stable', () => {
  assert.deepEqual(sanitizeLook({ hair: 'inconnue', eyes: 'bleus' }, 'mage'), { ...defaultLook('mage'), eyes: 'bleus' });
  const look = defaultLook('guerrier');
  const keys = Object.keys(LOOK_PARTS.hair);
  let l = look;
  for (let i = 0; i < keys.length; i++) l = cycleLook(l, 'hair', 1);
  assert.equal(l.hair, look.hair); // un tour complet
  assert.equal(cycleLook(look, 'hair', -1).hair, keys[(keys.indexOf(look.hair) - 1 + keys.length) % keys.length]);
  assert.notEqual(lookKey(look), lookKey(cycleLook(look, 'top', 1)));
  const r = randomLook();
  for (const part of Object.keys(LOOK_PARTS)) assert.ok(LOOK_PARTS[part][r[part]], part);
});

test('apparence : les héros gardent l\'apparence choisie à la création', () => {
  const look = { hair: 'crete', hairColor: 'vert', eyes: 'dores', skin: 'foncee', top: 'ombre', bottom: 'azur' };
  const [a, b] = createParty(['A', 'B'], ['voleur', 'mage'], [look]);
  assert.deepEqual(a.look, look);
  assert.deepEqual(b.look, defaultLook('mage'));
  assert.deepEqual(lookOf({ classKey: 'pretre' }), defaultLook('pretre')); // ancienne sauvegarde sans apparence
  assert.deepEqual(createHero('paladin').look, defaultLook('paladin'));
});

test('têtes : 10 coupes dessinées de face, de profil et de dos, sur 16 colonnes', () => {
  assert.equal(Object.keys(HEADS).length, Object.keys(LOOK_PARTS.hair).length);
  for (const [style, views] of Object.entries(HEADS)) {
    for (const v of ['f', 'l', 'b']) {
      const head = views[v];
      assert.ok(head, `${style}.${v}`);
      assert.ok(head.chin >= 0 && head.chin < head.rows.length, `${style}.${v} menton`);
      for (const row of head.rows) assert.match(row, /^[.o123sSeE]{16}$/, `${style}.${v}`);
    }
    // Les yeux se voient de face et de profil, jamais de dos.
    assert.ok(views.f.rows.join('').includes('e') && views.l.rows.join('').includes('e'), style);
    assert.ok(!views.b.rows.join('').includes('e'), style);
  }
  for (const body of Object.keys(BODIES)) {
    assert.equal(HEAD_OFFSETS[body].length, 4, body);
    for (const row of HEAD_OFFSETS[body]) assert.equal(row.length, SHEET_COLS, body);
  }
});

test('composition : tenue et peau recolorées, bas du corps selon le bas choisi, tête posée', () => {
  const look = { hair: 'courts', hairColor: 'noir', eyes: 'bleus', skin: 'foncee', top: 'plates', bottom: 'azur' };
  // Peau des mains → nouvelle peau ; métal clair → acier ; jambes (bas de l'image) → bas choisi.
  assert.equal(bodyColor('#ffc2a1', 20, look), '#8f5a3c');
  assert.equal(bodyColor('#d7d3bd', 20, look), '#e9eef2');
  assert.equal(bodyColor('#cc2f7b', 30, look), '#6fa8e8');
  assert.equal(bodyColor('#123456', 20, look), null);
  // Robe : le bas ne change rien.
  assert.equal(bodyColor('#8f4d57', 30, { ...look, top: 'pretre' }), '#e0a63a');
  assert.equal(headPalette(look)[1], '#5e6284');
  // Planche vide : seule la tête apparaît, à la ligne du menton du corps.
  const width = SHEET_COLS * FRAME;
  const px = new Uint8ClampedArray(width * FRAME * 4 * 4);
  composeHero(px, width, look);
  const at = (x, y) => px[((y * width) + x) * 4 + 3];
  const chin = BODIES.gladiator.cut - 1;
  assert.ok(at(16 + 8, chin), 'menton posé');
  assert.equal(at(16 + 8, chin + 1), 0, 'rien sous le menton (coupe courte)');
});

test('animation : image de marche selon le pas, animation jouée une fois selon son avancement', () => {
  const cols = [4, 5, 6, 7];
  assert.equal(packFrame(cols, { anim: 'walk', moving: true, stride: 0, progress: 0.2 }), 4);
  assert.equal(packFrame(cols, { anim: 'walk', moving: true, stride: 1, progress: 0.7 }), 7);
  assert.equal(packFrame([8, 9, 10, 11], { anim: 'melee', animT: 0.6 }), 10);
  assert.equal(packFrame([8, 9, 10, 11], { anim: 'melee', animT: 1 }), 11);
  assert.equal(packFrame(cols, { anim: 'idle', now: 450 }), 6);
});
