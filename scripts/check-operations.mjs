// Every operation in the specification must be reachable on the client.
// A naming scheme that shortens method names can collapse two operations onto one silently.

import { readFile } from 'node:fs/promises';
import { exit } from 'node:process';

const VERBS = ['get', 'post', 'put', 'patch', 'delete'];

const SPEC = new URL('../openapi/company-v3.json', import.meta.url);

const SDK = new URL('../src/generated/sdk.gen.ts', import.meta.url);

const document = JSON.parse(await readFile(SPEC, 'utf8'));

const operations = Object.values(document.paths).flatMap((path) =>
  Object.keys(path).filter((verb) => VERBS.includes(verb)),
).length;

const source = await readFile(SDK, 'utf8');

const classes = new Map();

for (const [, name, body] of source.matchAll(/^export class (\w+) extends HeyApiClient \{(.*?)^\}/gms)) {
  classes.set(name, {
    methods: [...body.matchAll(/^ {4}public (\w+)</gm)].map(([, method]) => method),
    children: [...body.matchAll(/^ {4}get (\w+)\(\): (\w+)/gm)].map(([, property, type]) => [property, type]),
  });
}

// Walked from the root rather than counted, so a container nothing reaches does not pass as covered.
const reachable = [];

const walk = (name, prefix) => {
  const container = classes.get(name);

  if (!container) {
    return;
  }

  for (const method of container.methods) {
    reachable.push(`${prefix}.${method}()`);
  }

  for (const [property, type] of container.children) {
    walk(type, `${prefix}.${property}`);
  }
};

walk('Clockster', 'clockster');

if (reachable.length !== operations) {
  console.error(`${operations} operations in the specification, ${reachable.length} reachable on the client.`);
  console.error('Two operations whose names collide are silently merged. Check `nesting` in openapi-ts.config.mjs.');
  exit(1);
}

console.log(`${reachable.length} operations, all reachable.`);
