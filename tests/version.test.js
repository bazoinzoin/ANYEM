import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { VERSION } from '../src/version.js';
import { changelogSection } from '../tools/changelog.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('version : package.json, src/version.js et la version Windows concordent ; le journal la décrit', () => {
  const pkg = JSON.parse(read('package.json'));
  const desktop = JSON.parse(read('desktop/package.json'));
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, VERSION);
  assert.equal(desktop.version, VERSION, 'desktop/package.json (npm run desktop)');
  const changelog = read('CHANGELOG.md');
  const section = changelogSection(changelog, VERSION);
  assert.ok(section && section.length > 20, `CHANGELOG.md : section [${VERSION}]`);
  // La version la plus récente est en tête du journal.
  assert.equal(changelog.match(/^## \[([^\]]+)\]/m)[1], VERSION);
});
