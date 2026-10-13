// Prépare la version Windows (Electron) : copie dist/onde-studio.html et l'icône dans
// desktop/app/, reporte la version de package.json dans desktop/package.json. La fabrication
// du .exe se fait ensuite dans desktop/ (npm install puis npm run dist), sur Windows : c'est
// ce que fait le workflow GitHub .github/workflows/studio-release.yml.
// Usage (dans studio/) : npm run desktop
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const app = join(root, 'desktop', 'app');
await mkdir(app, { recursive: true });
await copyFile(join(root, 'dist', 'onde-studio.html'), join(app, 'onde-studio.html'));
await copyFile(join(root, 'desktop', 'onde-studio.ico'), join(app, 'onde-studio.ico'));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const pkgPath = join(root, 'desktop', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
if (pkg.version !== version) {
  pkg.version = version;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
console.log(`Version Windows prête (${version}) : desktop/app/`);
