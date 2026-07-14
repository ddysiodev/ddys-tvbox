import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('tvbox config declares one CatVod JS source', async () => {
  const config = JSON.parse(await readFile(new URL('../tvbox.json', import.meta.url), 'utf8'));
  assert.equal(config.sites.length, 1);
  assert.equal(config.sites[0].type, 3);
  assert.equal(config.sites[0].api, './spider/ddys.js');
  assert.equal(config.sites[0].searchable, 1);
  assert.equal(config.sites[0].quickSearch, 1);
  assert.equal(config.sites[0].ext.apiBase, 'https://ddys.io/api/v1');
  assert.equal(config.sites[0].ext.apiKey, '');
  assert.ok(config.sites[0].ext.categories.some((item) => item.type_id === 'documentary'));
  assert.equal(config.sites[0].changeable, 1);
});

test('subscription points to the independent GitHub repo', async () => {
  const subscription = JSON.parse(await readFile(new URL('../config/subscription.json', import.meta.url), 'utf8'));
  assert.equal(subscription.version, '0.1.1');
  assert.equal(subscription.items[0].url, 'https://raw.githubusercontent.com/ddysiodev/ddys-tvbox/main/tvbox.json');
});

test('package metadata stays private and versioned', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'ddys-tvbox');
  assert.equal(pkg.version, '0.1.1');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.match(pkg.engines.node, />=20/);
});
