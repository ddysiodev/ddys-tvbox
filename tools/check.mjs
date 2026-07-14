import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const version = '0.1.1';
const failures = [];
const forbiddenDirs = new Set(['.git', '.wrangler', 'node_modules', 'coverage', 'package', 'dist', 'build', 'releases']);
const textFilePattern = /\.(js|mjs|json|md|txt|ps1|ya?ml|toml|gitignore|gitattributes)$/i;
const mojibakeCodePoints = [
  0xfffd, 0x9428, 0x93be, 0x9363, 0x527c, 0x93c8, 0x7ec0, 0x8f70,
  0x7de5, 0x9353, 0x6ce6, 0x6d63, 0x5ea3, 0x8930, 0x8fab, 0x93c2,
  0x626e, 0x6578, 0x9411, 0x93bc, 0x6ec5, 0x5132, 0x568e, 0x74a7,
  0x52ec, 0x93bb, 0x612c, 0x942e, 0x53a0, 0x6220, 0x6d0f, 0x7ebe,
  0x4f78, 0x5a67, 0x612e, 0x7039, 0x590e, 0x95b0, 0x5d87, 0x7586,
  0x9352, 0x55db, 0x68e3, 0x682d, 0x74d2, 0x546e, 0x7f02, 0x64b3,
  0x935a, 0xe21c, 0x705e, 0x66e0, 0x9422, 0x71b8, 0x95be, 0x70ac,
  0x951b
];
const mojibakePattern = new RegExp(`[${mojibakeCodePoints.map((codePoint) => String.fromCodePoint(codePoint)).join('')}]`, 'u');
const secretPattern = /ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|npm_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+/u;

const requiredFiles = [
  '.gitattributes',
  '.github/workflows/build.yml',
  '.gitignore',
  'tvbox.json',
  'package.json',
  'README.md',
  'README.en.md',
  'LICENSE',
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
await checkWorkflow();
await checkGitAttributes();
await checkTvboxConfig();
await checkSpider();
await checkDocs();
await checkBuildScript();
await checkForbiddenFilesAndText();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, files: (await listFiles(root)).length, package: 'ddys-tvbox', version }, null, 2));

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
  assert(pkg.version === version, 'package version mismatch.');
  assert(pkg.private === true, 'package must be private.');
  assert(pkg.type === 'module', 'package must use ESM for CatVod JS checks.');
  assert(pkg.scripts?.check === 'node tools/check.mjs', 'check script mismatch.');
  assert(pkg.scripts?.test?.includes('node --test tests/*.test.mjs'), 'test script mismatch.');
  assert(pkg.scripts?.package?.includes('tools/build-package.ps1'), 'package script mismatch.');
  assert(pkg.engines?.node?.includes('>=20'), 'Node engine must be declared.');
}

async function checkWorkflow() {
  const workflow = await read('.github/workflows/build.yml');
  for (const fragment of [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'node-version: "24"',
    'node tools/check.mjs',
    'node --test tests/*.test.mjs',
    'tools/build-package.ps1',
    `ddys-tvbox-v${version}.zip`,
    `ddys-tvbox-v${version}.zip.sha256`,
    'actions/upload-artifact@v4',
    `name: ddys-tvbox-v${version}`
  ]) {
    assert(workflow.includes(fragment), `workflow missing ${fragment}.`);
  }
}

async function checkGitAttributes() {
  const gitAttributes = await read('.gitattributes');
  for (const fragment of ['* text=auto eol=lf', '*.zip binary', '*.sha256 text eol=lf']) {
    assert(gitAttributes.includes(fragment), `.gitattributes missing ${fragment}.`);
  }
}

async function checkTvboxConfig() {
  const config = JSON.parse(await read('tvbox.json'));
  assert(Array.isArray(config.sites) && config.sites.length === 1, 'tvbox sites must contain one DDYS site.');
  const site = config.sites[0];
  assert(site.key === 'ddys', 'site key mismatch.');
  assert(site.name === '低端影视', 'site name mismatch.');
  assert(site.type === 3, 'site type must be 3.');
  assert(site.api === './spider/ddys.js', 'site api must point to ./spider/ddys.js.');
  assert(site.searchable === 1, 'site searchable must be enabled.');
  assert(site.quickSearch === 1, 'site quickSearch must be enabled.');
  assert(site.filterable === 1, 'site filterable must be enabled.');
  assert(site.changeable === 1, 'site changeable must be enabled.');
  assert(site.ext && typeof site.ext === 'object' && !Array.isArray(site.ext), 'site ext must be inline object.');
  assert(site.ext.apiBase === 'https://ddys.io/api/v1', 'default apiBase mismatch.');
  assert(site.ext.siteBase === 'https://ddys.io', 'default siteBase mismatch.');
  assert(site.ext.apiKey === '', 'default apiKey must be empty.');
  assert(Array.isArray(site.ext.categories) && site.ext.categories.some((item) => item.type_id === 'documentary'), 'default categories missing documentary.');
  const ext = JSON.parse(await read('config/ext.json'));
  assert(ext.apiBase === site.ext.apiBase, 'config/ext apiBase mismatch.');
  assert(ext.pageSize === 24 && ext.homeLimit === 24, 'config/ext paging mismatch.');
  const subscription = JSON.parse(await read('config/subscription.json'));
  assert(subscription.version === version, 'subscription version mismatch.');
  assert(subscription.items?.[0]?.url === 'https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json', 'subscription URL mismatch.');
}

async function checkSpider() {
  const spider = await read('spider/ddys.js');
  for (const fragment of [
    '__jsEvalReturn',
    'homeContent',
    'categoryContent',
    'detailContent',
    'searchContent',
    'playerContent',
    'Authorization',
    'Bearer',
    'async: false',
    'Request helper returned a Promise',
    '在线播放',
    '下载资源',
    '网盘资源',
    '提取码',
    'sanitizeEpisodeName',
    'encodePlayId',
    'decodePlayId'
  ]) {
    assert(spider.includes(fragment), `spider missing ${fragment}.`);
  }
}

async function checkDocs() {
  const readme = await read('README.md');
  for (const fragment of ['TVBox', 'FongMi', '影视仓', 'OK影视', 'CatVod JS Spider', 'API Key', 'Release 资产', `ddys-tvbox-v${version}.zip.sha256`, 'Get-FileHash', '确定性 ZIP']) {
    assert(readme.includes(fragment), `README.md missing ${fragment}.`);
  }
  const readmeEn = await read('README.en.md');
  for (const fragment of ['TVBox', 'Release assets', `ddys-tvbox-v${version}.zip`, `ddys-tvbox-v${version}.zip.sha256`, 'Local checks']) {
    assert(readmeEn.includes(fragment), `README.en.md missing ${fragment}.`);
  }
  const compatibility = await read('docs/compatibility.md');
  for (const fragment of ['homeContent', 'categoryContent', 'detailContent', 'playerContent', '__jsEvalReturn', '.sha256', '.gitattributes']) {
    assert(compatibility.includes(fragment), `compatibility.md missing ${fragment}.`);
  }
  const apiMapping = await read('docs/api-mapping.md');
  for (const fragment of ['/latest', '/hot', '/movies', '/search', '/sources', '/related']) {
    assert(apiMapping.includes(fragment), `api-mapping.md missing ${fragment}.`);
  }
}

async function checkBuildScript() {
  const buildScript = await read('tools/build-package.ps1');
  for (const fragment of [
    'ddys-tvbox-v{0}.zip',
    'DdysZipCrc32',
    '0x04034b50',
    '0x02014b50',
    '0x06054b50',
    '[System.StringComparer]::Ordinal.Compare',
    'Get-FileHash',
    '[System.IO.File]::WriteAllText',
    '[System.Text.Encoding]::ASCII',
    'Assert-InRoot',
    '.wrangler',
    'releases',
    'sha256'
  ]) {
    assert(buildScript.includes(fragment), `build script missing ${fragment}.`);
  }
  assert(!buildScript.includes('Compress-Archive'), 'build script must not use non-deterministic Compress-Archive.');
  assert(!buildScript.includes('CreateEntryFromFile'), 'build script must not use timestamp-dependent ZipFileExtensions.');
  assert(!buildScript.includes('Set-Content -LiteralPath $ShaFile'), 'checksum writer must not add implicit newlines.');
}

async function checkForbiddenFilesAndText() {
  for (const full of await listFiles(root)) {
    const rel = slash(path.relative(root, full));
    const segments = rel.split('/');
    for (const segment of segments) {
      assert(!forbiddenDirs.has(segment), `forbidden path: ${rel}`);
    }
    assert(!/\.(log|tmp|cache|tgz|zip|sha256)$/i.test(rel), `forbidden generated file: ${rel}`);
    assert(!/(^|\/)\.env(\.|$)/.test(rel), `forbidden env file: ${rel}`);
    assert(!['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(path.basename(rel)), `forbidden lockfile: ${rel}`);
    if (!isTextFile(rel)) continue;
    const text = await fs.readFile(full, 'utf8');
    assert(!secretPattern.test(text), `${rel} contains token-like secret.`);
    assert(!mojibakePattern.test(text), `${rel} contains mojibake-like text.`);
    assert(!/\r\n/.test(text), `${rel} contains CRLF line endings.`);
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
    if (forbiddenDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}

function isTextFile(rel) {
  return textFilePattern.test(rel) || rel === 'LICENSE' || rel === '.gitignore' || rel === '.gitattributes';
}

function slash(value) {
  return value.replace(/\\/g, '/');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
