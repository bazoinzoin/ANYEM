// Intègre les images (PNG) et polices (TTF) de assets/ au jeu : génère src/ui/assetData.js,
// qui exporte chaque fichier en data URI (le jeu reste un seul fichier, jouable en double-clic).
// Lancé par « npm run build » ; un test vérifie que le fichier est à jour.
//
// Clé d'un fichier : son chemin sous assets/, sans extension (ex. « raven/forest_A5 »,
// « fonts/FantasyRPGtitle »).

const TYPES = { '.png': 'image/png', '.ttf': 'font/ttf' };
const extOf = (name) => name.slice(name.lastIndexOf('.'));

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const ASSET_MODULE = join(root, 'src/ui/assetData.js');

async function pngFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, e.name);
    if (e.isDirectory()) files.push(...await pngFiles(path));
    else if (TYPES[extOf(e.name)]) files.push(path);
  }
  return files;
}

export async function assetModule() {
  const lines = [
    '// Fichier généré par tools/assets.mjs (npm run build) : ne pas modifier à la main.',
    '// Images et polices de assets/ en data URI ; voir ui/sprites.js, ui/skin.js et assets/CREDITS.md.',
    '',
    'export const ASSET_DATA = {',
  ];
  for (const file of await pngFiles(join(root, 'assets'))) {
    const ext = extOf(file);
    const key = relative(join(root, 'assets'), file).replaceAll('\\', '/').slice(0, -ext.length);
    const data = (await readFile(file)).toString('base64');
    lines.push(`  ${JSON.stringify(key)}: 'data:${TYPES[ext]};base64,${data}',`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

export async function writeAssets() {
  await writeFile(ASSET_MODULE, await assetModule());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeAssets();
  console.log(`Écrit : ${relative(root, ASSET_MODULE)}`);
}
