import { removeOutputDirectory, DIST } from './extension-package.mjs';

removeOutputDirectory(DIST);
console.log('Removed generated dist. Source and legacy snapshots are preserved.');
