import { defineConfig } from 'vite';

// Paquete del agente para insertar en un HTML ya publicado. Uso: npm run build:embed
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    lib: { entry: 'src/agent/embed.js', formats: ['iife'], name: 'FMAgent', fileName: () => 'agent-embed.js' },
  },
});
