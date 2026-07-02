/**
 * Repo-wide TypeScript check: `npm run typecheck`.
 *
 * The root tsconfig.json and the per-project tsconfig.json files are
 * "solution style" (`files: []` + references) — running `tsc -p` on them
 * checks zero files. This script targets the leaf configs that actually
 * include sources. Add an entry when a new project lands.
 *
 * Angular templates are NOT covered here (tsc only); `nx build web` runs the
 * Angular compiler with strictTemplates for that.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const projects = [
  'apps/api/tsconfig.app.json',
  'apps/api/tsconfig.spec.json',
  'apps/web/tsconfig.app.json',
  'apps/web/tsconfig.spec.json',
  'apps/api-e2e/tsconfig.spec.json',
  'apps/web-e2e/tsconfig.json',
  'libs/api/domain/tsconfig.json',
  'libs/api/infrastructure/tsconfig.json',
  'libs/api/application/tsconfig.lib.json',
  'libs/api/application/tsconfig.spec.json',
  'libs/api/shared/tsconfig.lib.json',
  'libs/shared/contracts/tsconfig.lib.json',
  'libs/shared/contracts/tsconfig.spec.json',
  'libs/web/data-access/tsconfig.lib.json',
  'libs/web/data-access/tsconfig.spec.json',
  'libs/web/features/tsconfig.lib.json',
  'libs/web/features/tsconfig.spec.json',
  'libs/web/ui/tsconfig.lib.json',
  'libs/web/ui/tsconfig.spec.json',
];

let failed = false;
for (const project of projects) {
  process.stdout.write(`— ${project} … `);
  const result = spawnSync(process.execPath, [tsc, '--noEmit', '-p', project], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status === 0) {
    console.log('OK');
  } else {
    failed = true;
    console.log('FAIL');
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  }
}

process.exit(failed ? 1 : 0);
