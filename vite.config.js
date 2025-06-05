import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3003,
    strictPort: true,
    host: 'localhost'
  },
  build: {
    outDir: 'dist'
  }
});
