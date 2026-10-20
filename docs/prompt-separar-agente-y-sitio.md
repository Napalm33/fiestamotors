# Prompt para la conversación del sitio inmersivo: el agente se modifica en otra conversación

```
Cambio de reglas en el proyecto. A partir de ahora el AGENTE (asistente virtual) se desarrolla y modifica en otra conversación. En esta conversación solo modificas el WEBSITE como tal. No tocas la funcionalidad, el comportamiento, los textos ni el diseño del agente.

## 1. Qué es tuyo y qué no
Tuyo: hero, showroom, sección inv y sus videos, 3D, estilos del sitio, textos del sitio, inventario en pantalla, contacto, reseñas, scripts de build del sitio.
NO tuyo (no lo edites, no lo "arregles", no lo regeneres): todo lo que esté en src/agent/, src/styles/agent.css, vite.embed.config.js, scripts/inject-agent.mjs y los textos de src/agent/i18n/. Tampoco cambies cómo responde el agente, sus botones de respuesta rápida, su flujo, su idioma ni su aspecto. Si ves un error o algo que mejorar del agente, dímelo a mí y yo lo llevo a la otra conversación.
Si en src/main.js quedaron las llamadas del agente que se integraron antes (initAgent, setAgentState, openSitePage), déjalas como están. No agregues otras nuevas.

## 2. Qué no debes romper del sitio (contrato con el agente)
El agente se engancha a estos elementos. Puedes cambiar su diseño y su posición, pero conserva sus ids, clases y atributos:
- #inv, #inv-card, .hero (el agente lee la sección visible y qué auto se ve a partir de ellos).
- <html lang="es|en">: el agente sigue el idioma del sitio con este atributo.
- Los botones de la ficha con data-open-page="test_drive" y data-open-page="calculadora", y el botón con data-agent-open. Sin esos atributos no abren el agente ni las páginas del sitio original.
- Tu panel inferior de la sección inv le manda mensajes al agente así: abre el panel (clic en .fm-agent__fab si #fm-agent-panel está hidden), escribe en .fm-agent__input y envía .fm-agent__form. Esos elementos los crea el agente: no los reemplaces ni los ocultes de forma permanente. Puedes atenuar .fm-agent__fab como ya lo haces.
No uses z-index por encima de 2147482000 en nada del sitio: el agente va siempre encima.

## 3. Cómo publicar el Artifact SIN perder el agente (obligatorio cada vez)
El agente ya no viaja dentro de tu build: se inserta al final, con un script, en el HTML ya generado. Si publicas el HTML sin ese paso, el agente desaparece o queda una versión vieja. Cada vez que publiques:

1. Trae la versión actual del agente, sin fusionar ramas:
   git fetch origin claude/hopeful-carson-t2qp10
   git checkout origin/claude/hopeful-carson-t2qp10 -- src/agent src/styles/agent.css vite.embed.config.js scripts/inject-agent.mjs
   Confirma que package.json tenga la dependencia @elevenlabs/client y el script "build:embed": "vite build --config vite.embed.config.js --mode artifact". Si falta, agrégalos y ejecuta npm install.
2. Genera tu HTML como siempre (build del sitio y scripts/build-artifact.mjs, con los modelos 3D incrustados).
3. Genera el paquete del agente:
   npm run build:embed
4. Insértalo:
   node scripts/inject-agent.mjs <tu-html.html> <tu-html-con-agente.html>
5. Verifica antes de publicar: abre <tu-html-con-agente.html> en un navegador headless y comprueba que existe exactamente un .fm-agent__fab, que al tocarlo abre el panel con cuatro respuestas rápidas de "qué te trae por aquí", y que no hay errores de consola.
6. Publica <tu-html-con-agente.html> sobre el MISMO Artifact "Fiesta Motors Showroom video". Nunca publiques el HTML sin el agente. Si la publicación te rechaza porque hay una versión más nueva, parte de esa versión, repite los pasos 4 a 6 y vuelve a publicar.

## 4. Regla de los créditos
Todo se prueba en local y en los Artifacts de Claude. No despliegues a Netlify ni quites el ignore de netlify.toml hasta que yo lo apruebe al final.

## 5. Entrega
Cuando termines un cambio, dime qué cambió del sitio, confirma que el agente quedó insertado (un botón, abre, sin errores) y detente.
```
