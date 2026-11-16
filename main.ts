import { buildDossier } from './vendor/makefun-frontend.ts';
import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'app');
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
try { await stat(source); } catch { throw new Error(`Cannot package frontend: app directory is missing at ${source}`); }
await mkdir(output, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) await rm(join(output, name), { recursive: true, force: true });
await cp(source, join(output, 'app'), { recursive: true });
await cp(join(here, 'screenshots'), join(output, 'screenshots'), { recursive: true });
const dossier = await buildDossier(here, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 });
await writeFile(join(output, 'dossier.json'), JSON.stringify(dossier));
