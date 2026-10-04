import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ROOT } from './extension-package.mjs';

const suites = [
  ...readdirSync(new URL('../tests/', import.meta.url)).filter((name) => name.endsWith('.test.cjs')).map((name) => `tests/${name}`),
  ...readdirSync(new URL('../Backend_Lite/tests/', import.meta.url)).filter((name) => name.endsWith('.test.mjs')).map((name) => `Backend_Lite/tests/${name}`)
].sort();
const result = spawnSync(process.execPath, ['--test', ...suites], { cwd: ROOT, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
