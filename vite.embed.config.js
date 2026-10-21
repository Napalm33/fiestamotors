import { defineConfig } from 'vite';

// Paquete del agente para insertar en un HTML ya publicado. Uso: npm run build:embed
// El Artifact bloquea las conexiones externas, así que el paquete que se inserta ahí se compila SIEMPRE en modo
// demostración, aunque exista un .env con el ID del agente. Para forzar el modo en vivo (un sitio que sí pueda
// conectarse): FM_EMBED_LIVE=1 npm run build:embed
const live = process.env.FM_EMBED_LIVE === '1';
const demoOnly = {
  'import.meta.env.VITE_ELEVENLABS_AGENT_ID': '""',
  'import.meta.env.VITE_AGENT_API_URL': '""',
  'import.meta.env.VITE_AGENT_TEXT_PROVIDER': '""',
  'import.meta.env.VITE_WHATSAPP_NUMBER': '""', // un número personal de pruebas no debe quedar escrito en una página publicada
};

export default defineConfig({
  define: live ? {} : demoOnly,
  publicDir: false,
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    lib: { entry: 'src/agent/embed.js', formats: ['iife'], name: 'FMAgent', fileName: () => 'agent-embed.js' },
  },
});
