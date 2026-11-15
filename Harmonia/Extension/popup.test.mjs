import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const readJson = name => JSON.parse(readFileSync(new URL(name, here), 'utf8'));
const manifest = readJson('manifest.json');
const buildInfo = readJson('build-info.json');
const popup = readFileSync(new URL('popup.html', here), 'utf8');

test('popup displays the exact version declared by the manifest and build metadata', () => {
  const match = popup.match(/<span class="version">v([^<]+)<\/span>/);
  assert.ok(match, 'popup must expose one visible release label');
  assert.equal(manifest.version, buildInfo.version, 'manifest and build metadata must agree');
  assert.equal(match[1], manifest.version, 'visible popup version must match the installable package');
});
