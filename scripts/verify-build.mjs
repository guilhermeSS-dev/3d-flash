import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const angular = JSON.parse(await readFile(resolve(root, 'angular.json'), 'utf8'));
const output = angular.projects['3d-flash'].architect.build.options.outputPath;
const directory = resolve(root, output.base, output.browser ?? 'browser');
const fail = (message) => {
  throw new Error(message);
};
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function requireFile(reference) {
  const name = reference.split(/[?#]/)[0].replace(/^\//, '');
  const path = resolve(directory, name);
  if (!path.startsWith(directory + sep)) fail(`Referência fora do build: ${reference}`);
  const info = await stat(path).catch(() => fail(`Arquivo ausente no build: ${reference}`));
  if (!info.isFile() || !info.size) fail(`Arquivo vazio ou inválido: ${reference}`);
  return path;
}

async function walk(path) {
  const files = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    const entry = resolve(path, item.name);
    if (item.isSymbolicLink()) fail(`Link simbólico inesperado: ${entry}`);
    if (item.isDirectory()) files.push(...(await walk(entry)));
    else files.push(entry);
  }
  return files;
}

const index = await readFile(await requireFile('index.html'), 'utf8');
if (!/<html\b[^>]*lang="pt-BR"/i.test(index)) fail('Idioma pt-BR ausente.');
if (!/<base\s+href="\/"/i.test(index)) fail('O pacote de publicação requer base href /3d-flash/ no GitHub Pages.');
if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(index)) fail('Descrição ausente.');
const entryReferences = [...index.matchAll(/\b(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(
  (match) => match[1],
);
if (!entryReferences.some((name) => name.endsWith('.js'))) fail('Entrada JavaScript ausente.');
for (const reference of entryReferences) await requireFile(reference);

const files = (await walk(directory)).sort();
const inventory = [];
let chunkReferences = 0;
for (const path of files) {
  const name = relative(directory, path).split(sep).join('/');
  if (
    name
      .split('/')
      .some((part) =>
        ['src', 'docs', 'references', 'node_modules', '.git', '.angular'].includes(part),
      ) ||
    name.endsWith('.map')
  )
    fail(`Arquivo de desenvolvimento no build: ${name}`);
  const buffer = await readFile(path);
  inventory.push({ file: name, bytes: buffer.length, sha256: digest(buffer) });
  if (!name.endsWith('.js')) continue;
  const code = buffer.toString('utf8');
  for (const match of code.matchAll(
    /\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+\.js)["']/g,
  )) {
    const target = relative(directory, resolve(dirname(path), match[1]));
    await requireFile(target);
    chunkReferences++;
  }
}

const assets = JSON.parse(await readFile(resolve(root, 'docs/assets-manifest.json'), 'utf8'));
let verifiedAssets = 0;
for (const asset of assets.assets) {
  if (!asset.destination.startsWith('public/')) continue;
  const path = await requireFile(asset.destination.slice('public/'.length));
  if (digest(await readFile(path)) !== asset.sha256_destination)
    fail(`Asset alterado: ${asset.destination}`);
  verifiedAssets++;
}
await requireFile('3rdpartylicenses.txt');
const report = {
  schema_version: 1,
  build_directory: relative(root, directory),
  verification: 'static_artifacts_only',
  entry_references: [...new Set(entryReferences)],
  chunk_references_verified: chunkReferences,
  original_assets_verified: verifiedAssets,
  files: inventory,
};
console.log(JSON.stringify(report, null, 2));
