import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['mac.local'],
  },
  resolve: {
    alias: {
      '@rekurt/depth': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
    },
  },
});
