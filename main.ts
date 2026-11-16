// Package the static frontend and its live-data screenshots for the scorer.
// Usage: MAKEFUN_OUTPUT_DIR=out node main.ts (the grader uses /output).

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const sourceApp = join(repository, 'app');

if (!existsSync(sourceApp)) {
  throw new Error(`Cannot package frontend: required directory is missing (${sourceApp})`);
}

mkdirSync(output, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) {
  const stale = join(output, name);
  if (existsSync(stale)) rmSync(stale, { recursive: true, force: true });
}

cpSync(sourceApp, join(output, 'app'), { recursive: true });
const sourceShots = join(repository, 'screenshots');
if (existsSync(sourceShots)) cpSync(sourceShots, join(output, 'screenshots'), { recursive: true });

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(output, 'dossier.json'), dossier);
