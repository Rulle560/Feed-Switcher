import { defineConfig } from 'vite';

// Vite is intentionally used as the fast local UI development server for popup work.
// Production extension scripts use deterministic tsc outFile builds so manifest paths
// never depend on hashed filenames.
export default defineConfig({
  root: 'src/popup',
  server: { port: 4173, strictPort: true },
  build: { outDir: '../../dist-vite-preview', emptyOutDir: true }
});
