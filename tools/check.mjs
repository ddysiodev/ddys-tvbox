import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

const requiredFiles = [
  'tvbox.json',
  'package.json',
  'README.md',
  'README.en.md',
  'LICENSE',
  '.gitignore',
  'config/ext.json',
  'config/subscription.json',
  'spider/ddys.js',
  'examples/auth-ext.example.json',
  'examples/worker-proxy-ext.json',
  'examples/tvbox-remote.json',
  'docs/compatibility.md',
  'docs/api-mapping.md',
  'tests/config.test.mjs',
  'tests/spider.test.mjs',
  'tools/check.mjs',
  'tools/build-package.ps1'
];

for (const file of requiredFiles) await mustExist(file);
await checkJson();
await checkSyntax();
await checkPackage();
await checkTvboxConfig();
await checkDocs();
await checkForbiddenFiles();
await checkForbiddenText();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: (await listFiles(root)).length, package: 'ddys-tvbox' }, null, 2));

async function checkJson() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!/\.json$/i.test(rel)) continue;
    try {
      JSON.parse(await fs.readFile(full, 'utf8'));
    } catch (error) {
      assert(false, `${rel} is not valid JSON: ${error.message}`);
    }
  }
}

async function checkSyntax() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!/\.(js|mjs)$/i.test(rel)) continue;
    const result = spawnSync(process.execPath, ['--check', full], { stdio: 'inherit' });
    assert(result.status === 0, `${rel} failed node --check.`);
  }
}

async function checkPackage() {
  const pkg = JSON.parse(await read('package.json'));
  assert(pkg.name === 'ddys-tvbox', 'package name mismatch.');
  assert(pkg.version === '0.1.0', 'package version mismatch.');
  assert(pkg.private === true, 'package must be private.');
  assert(pkg.type === 'module', 'package must use ESM for CatVod JS checks.');
}

async function checkTvboxConfig() {
  const config = JSON.parse(await read('tvbox.json'));
  assert(Array.isArray(config.sites) && config.sites.length === 1, 'tvbox sites must contain one DDYS site.');
  const site = config.sites[0];
  assert(site.key === 'ddys', 'site key mismatch.');
  assert(site.type === 3, 'site type must be 3.');
  assert(site.api === './spider/ddys.js', 'site api must point to ./spider/ddys.js.');
  assert(site.searchable === 1, 'site searchable must be enabled.');
  assert(site.quickSearch === 1, 'site quickSearch must be enabled.');
  assert(site.filterable === 1, 'site filterable must be enabled.');
  assert(site.ext && typeof site.ext === 'object' && !Array.isArray(site.ext), 'site ext must be inline object.');
  assert(site.ext.apiBase === 'https://ddys.io/api/v1', 'default apiBase mismatch.');
  assert(site.ext.apiKey === '', 'default apiKey must be empty.');
  assert((await read('spider/ddys.js')).includes('__jsEvalReturn'), 'spider missing __jsEvalReturn.');
  assert((await read('spider/ddys.js')).includes('Authorization'), 'spider missing Authorization support.');
}

async function checkDocs() {
  const readme = await read('README.md');
  for (const fragment of ['TVBox', 'FongMi', '影视仓', 'OK影视', 'CatVod JS Spider', 'API Key', 'Release ZIP']) {
    assert(readme.includes(fragment), `README.md missing ${fragment}.`);
  }
  const compatibility = await read('docs/compatibility.md');
  for (const fragment of ['homeContent', 'categoryContent', 'detailContent', 'playerContent', '__jsEvalReturn']) {
    assert(compatibility.includes(fragment), `compatibility.md missing ${fragment}.`);
  }
}

async function checkForbiddenFiles() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    assert(!/(^|\/)(node_modules|coverage|package|\.git)(\/|$)/.test(rel), `forbidden path: ${rel}`);
    assert(!/\.(log|tmp|cache|tgz|zip)$/i.test(rel), `forbidden file: ${rel}`);
    assert(!/(^|\/)\.env(\.|$)/.test(rel), `forbidden env file: ${rel}`);
    assert(!['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(path.basename(rel)), `forbidden lockfile: ${rel}`);
  }
}

async function checkForbiddenText() {
  const patterns = ['ghp_', 'github_pat_', 'npm_', '\uFFFD'];
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    if (!isTextFile(rel) || rel === 'tools/check.mjs') continue;
    const text = await fs.readFile(full, 'utf8');
    for (const pattern of patterns) assert(!text.includes(pattern), `${rel} contains forbidden text pattern ${pattern}.`);
  }
}

async function mustExist(rel) {
  try {
    await fs.stat(path.join(root, rel));
  } catch {
    failures.push(`Missing required file: ${rel}`);
  }
}

async function read(rel) {
  return fs.readFile(path.join(root, rel), 'utf8');
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'coverage', 'package'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}

function isTextFile(rel) {
  return /\.(js|mjs|json|md|txt|ps1|yml|yaml)$/i.test(rel) || rel === '.gitignore' || rel === 'LICENSE';
}

function slash(value) {
  return value.replace(/\\/g, '/');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
