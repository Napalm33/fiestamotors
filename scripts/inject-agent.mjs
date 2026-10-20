// Inserta el agente (dist-embed/) en un HTML de Artifact ya publicado y deja un HTML listo para publicar.
// Uso: npm run build:embed && node scripts/inject-agent.mjs <entrada.html> <salida.html>
// Es idempotente: si la entrada ya trae un agente insertado, lo reemplaza.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) { console.error('Uso: inject-agent.mjs <entrada.html> <salida.html>'); process.exit(1); }

const dir = new URL('../dist-embed/', import.meta.url);
const js = readFileSync(new URL('agent-embed.js', dir), 'utf8');
const css = readFileSync(new URL(readdirSync(dir).find((f) => f.endsWith('.css')), dir), 'utf8');

let html = readFileSync(input, 'utf8');
// El HTML publicado viene envuelto en <!doctype><html><head>…<body>: la plataforma lo vuelve a envolver.
const body = html.match(/<body>([\s\S]*)<\/body>\s*<\/html>\s*$/);
if (body) html = body[1];
html = html.replace(/<!--fm-embed:start-->[\s\S]*?<!--fm-embed:end-->/, '');

const block = [
  '<!--fm-embed:start-->',
  `<style>${css}</style>`,
  // Módulo al final: se ejecuta después del código de la página, que ya creó la instancia anterior.
  `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`,
  '<!--fm-embed:end-->',
].join('\n');
writeFileSync(output, `${html.trimEnd()}\n${block}\n`);
console.log('ok', output, `(${(readFileSync(output).length / 1e6).toFixed(2)} MB)`);
