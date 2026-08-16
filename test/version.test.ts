import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { DEFAULT_USER_AGENT, VERSION } from '../src/version.ts';

test('the version constant matches the manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  // The published package would otherwise announce a version nobody can install.
  assert.equal(VERSION, manifest.version);
});

test('the user agent names this sdk and its version', () => {
  // So the request log says which client made a call rather than which runtime did.
  assert.equal(DEFAULT_USER_AGENT, `clockster-typescript/${VERSION}`);
});
