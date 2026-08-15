// Refreshes openapi/company-v3.json from the deployment that implements it.
// `--check` writes nothing and exits 1 on a difference, which is what CI runs.

import { readFile, writeFile } from 'node:fs/promises';
import { argv, env, exit } from 'node:process';

const SOURCE = env.CLOCKSTER_SPEC_URL ?? 'https://api.clockster.com/openapi/v3.json';

const TARGET = new URL('../openapi/company-v3.json', import.meta.url);

const check = argv.includes('--check');

const response = await fetch(SOURCE);

if (!response.ok) {
  console.error(`${SOURCE} answered ${response.status}.`);
  exit(1);
}

const published = await response.json();
const committed = await readFile(TARGET, 'utf8').then(JSON.parse, () => null);

// Compared as documents rather than as text: the builder writes four-space indentation and this
// writes two, and that difference is not drift.
if (committed !== null && JSON.stringify(committed) === JSON.stringify(published)) {
  console.log('Specification is current.');
  exit(0);
}

if (check) {
  console.error(`Specification has drifted from ${SOURCE}. Run \`npm run spec && npm run generate\`.`);
  exit(1);
}

await writeFile(TARGET, `${JSON.stringify(published, null, 2)}\n`);
console.log('Specification updated. Run `npm run generate`.');
