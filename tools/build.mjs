// Assemble le jeu en un seul fichier HTML autonome : dist/anyem.html.
// Ce fichier s'ouvre d'un double-clic (file://), sans serveur ni installation.
// Usage : npm run build
//
// Chaque module de src/ devient une fonction dont le résultat (ses exports) est
// rangé dans une table ; les modules sont ordonnés pour que chaque dépendance
// soit évaluée avant les modules qui l'importent. Formes supportées :
//   import { a, b as c } from './x.js';   export function / const / let / class

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const OUTPUT = join(root, 'dist', 'anyem.html');

const IMPORT_RE = /^import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

async function loadModule(file, modules, order, visiting) {
  const id = relative(root, file).replaceAll('\\', '/');
  if (modules.has(id)) return id;
  if (visiting.has(id)) throw new Error(`Import circulaire détecté : ${[...visiting, id].join(' → ')}`);
  visiting.add(id);

  let code = await readFile(file, 'utf8');
  if (/^\s*(import|export)\b/m.test(code.replace(IMPORT_RE, '').replace(EXPORT_RE, ''))) {
    throw new Error(`${id} : forme d'import/export non supportée par tools/build.mjs`);
  }

  const imports = [];
  for (const [, names, spec] of code.matchAll(IMPORT_RE)) {
    const depId = await loadModule(resolve(dirname(file), spec), modules, order, visiting);
    const bindings = names.split(',').map((n) => n.trim()).filter(Boolean)
      .map((n) => n.replace(/\s+as\s+/, ': '));
    imports.push(`const { ${bindings.join(', ')} } = __modules[${JSON.stringify(depId)}];`);
  }
  const exported = [...code.matchAll(EXPORT_RE)].map((m) => m[2]);
  code = code.replace(IMPORT_RE, '').replace(/^export\s+/gm, '');

  modules.set(id, `__modules[${JSON.stringify(id)}] = (() => {\n${imports.join('\n')}\n${code}\nreturn { ${exported.join(', ')} };\n})();`);
  order.push(id);
  visiting.delete(id);
  return id;
}

export async function build() {
  const html = await readFile(join(root, 'index.html'), 'utf8');

  // CSS : chaque <link rel="stylesheet" href="css/..."> local est remplacé par son contenu.
  let out = html;
  for (const [tag, href] of html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)) {
    const css = await readFile(join(root, href), 'utf8');
    out = out.replace(tag, `<style>\n/* ${href} */\n${css}</style>`);
  }

  // JS : le point d'entrée module est remplacé par l'ensemble des modules assemblés.
  const modules = new Map();
  const order = [];
  await loadModule(join(root, 'src/main.js'), modules, order, new Set());
  const bundle = `const __modules = {};\n${order.map((id) => `// ---- ${id}\n${modules.get(id)}`).join('\n\n')}`;
  if (bundle.includes('</script')) throw new Error('Le code contient « </script » : impossible de l\'intégrer tel quel.');

  const scriptTag = '<script type="module" src="src/main.js"></script>';
  if (!out.includes(scriptTag)) throw new Error(`index.html doit contenir ${scriptTag}`);
  // Le script est placé en fin de <body> pour que #app existe à son exécution.
  out = out.replace(scriptTag, '').replace('</body>', `<script>\n"use strict";\n${bundle}\n</script>\n</body>`);
  out = out.replace(/<!-- Remplacé par le jeu[\s\S]*?<\/div>\n/, '<div class="card center">Chargement…</div>\n');
  out = out.replace('<html lang="fr">', '<html lang="fr">\n<!-- Fichier généré par tools/build.mjs (npm run build) : ne pas modifier à la main. -->');
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = await build();
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, out);
  console.log(`Écrit : ${relative(root, OUTPUT)} (${Math.round(out.length / 1024)} Ko)`);
}
