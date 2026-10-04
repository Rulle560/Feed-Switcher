import { validateExtension, DIST } from './extension-package.mjs';

validateExtension(DIST, { compareSource: true });
console.log('dist validation: PASS (version, permissions, resource paths, syntax and exact source bytes).');
