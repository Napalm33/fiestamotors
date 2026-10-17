import { defineConfig } from 'vite';

// `--mode artifact`: un solo bundle (sin chunks dinámicos) para incrustarlo en el HTML del Artifact.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: { output: { inlineDynamicImports: mode === 'artifact' } },
  },
}));
