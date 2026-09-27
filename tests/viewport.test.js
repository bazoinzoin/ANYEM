import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampView } from '../src/ui/viewport.js';

test('la vue reste dans la carte', () => {
  assert.equal(clampView(-50, 400), 0);
  assert.equal(clampView(120, 400), 120);
  assert.equal(clampView(900, 400), 400);
});

test('une carte plus petite que l\'écran est centrée', () => {
  assert.equal(clampView(300, -200), -100);
  assert.equal(clampView(-300, -200), -100);
});
