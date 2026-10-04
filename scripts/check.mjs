import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, SOURCE, validateExtension } from './extension-package.mjs';

function scripts(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return scripts(path);
    return /\.(?:js|mjs|cjs)$/.test(entry.name) ? [path] : [];
  });
}
validateExtension(SOURCE);
for (const path of [...scripts(SOURCE), ...scripts(join(ROOT, 'scripts')), ...scripts(join(ROOT, 'Backend_Lite', 'src')), ...scripts(join(ROOT, 'Backend_Lite', 'cloudflare'))]) {
  const result = spawnSync(process.execPath, ['--check', path], { cwd: ROOT, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Current extension and backend syntax/manifest validation: PASS. Legacy TypeScript is excluded.');
