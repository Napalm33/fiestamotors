// Convierte dist/ (Vite) en un solo HTML para publicar como Artifact de vista previa privada.
// Uso: npm run build && node scripts/build-artifact.mjs <salida.html>
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2];
if (!out) { console.error('Falta la ruta de salida'); process.exit(1); }

const dist = new URL('../dist/', import.meta.url);
let html = readFileSync(new URL('index.html', dist), 'utf8');
const uri = (file, mime) => `data:${mime};base64,${readFileSync(new URL(file, dist)).toString('base64')}`;
const poster = uri('video/hero-poster.jpg', 'image/jpeg');
const video = uri('video/hero-16x9.mp4', 'video/mp4');

const cssHref = html.match(/href="\.\/(assets\/[^"]+\.css)"/)[1];
const jsSrc = html.match(/src="\.\/(assets\/[^"]+\.js)"/)[1];
const css = readFileSync(new URL(cssHref, dist), 'utf8').replaceAll('../video/hero-poster.jpg', poster);
const js = readFileSync(new URL(jsSrc, dist), 'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '')
  .replaceAll('./video/hero-poster.jpg', poster)
  .replaceAll('./video/hero-16x9.mp4', video);

writeFileSync(out, [
  title,
  '<meta name="robots" content="noindex, nofollow">',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<style>${css}</style>`,
  body,
  `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`,
].join('\n'));
console.log('ok', out);
