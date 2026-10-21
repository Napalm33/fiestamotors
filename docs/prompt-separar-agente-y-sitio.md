# Prompt para la conversación del sitio inmersivo: el agente se modifica en otra conversación (v2)

```
Cambio de reglas en el proyecto. El AGENTE (asistente virtual) se desarrolla y modifica en otra conversación. En esta conversación solo modificas el WEBSITE. No tocas la funcionalidad, el comportamiento, los textos ni el diseño del agente.

## 1. Por qué te lo digo
En la última versión del sitio agregaste un menú propio encima del agente (#inv-dock, con "Consultar info de una unidad en específico", "Solo estoy mirando", "Charlar a voz…", "Otro"), un manejador de clics que atrapa el botón rojo (.fm-agent__fab) para abrir ese menú en vez del panel del agente, un botón de llamada azul (.inv-call) y estilos nuevos para el botón. Efecto: el cliente nunca veía el inicio del agente (las cuatro preguntas de "qué te trae por aquí"), y al elegir una unidad en tu menú la respuesta del agente se generaba pero el panel no se abría. El agente ya sabe empezar la conversación por sí mismo: no necesita un menú previo. Desde ahora esas capas no existen en el sitio.

## 2. Qué es tuyo y qué no
Tuyo: hero, showroom, sección inv y sus videos y transiciones, 3D, estilos del sitio, textos del sitio, inventario en pantalla, contacto, reseñas, scripts de build del sitio.
NO tuyo (no lo edites, no lo "arregles", no lo regeneres, no lo imites): todo lo que esté en src/agent/, src/styles/agent.css, vite.embed.config.js, scripts/inject-agent.mjs y src/agent/i18n/. Y todo lo que el agente pinta en pantalla: el botón flotante (.fm-agent__fab), el panel (#fm-agent-panel) y el panel de páginas del sitio original (.fm-site-panel).
Prohibido, aunque parezca una mejora del sitio:
- Interceptar, reemplazar o retrasar el clic del botón del agente (nada de addEventListener sobre .fm-agent__fab, ni en captura, ni stopPropagation).
- Mostrar un menú, tarjeta, modal, globo o botón propio que sea la puerta de entrada al agente o que hable por él (como #inv-dock o .inv-call).
- Cambiar el aspecto del botón del agente (colores, brillos, animaciones, tamaño, posición) o su comportamiento.
- Abrir el panel del agente por programa (fab.click()) o escribirle mensajes por programa desde un menú del sitio.
- Poner nada del sitio por encima del agente: no uses z-index mayor que 2147482000.
Si algo del agente te parece mal o falta (el inicio, el estilo, un botón, el idioma, la voz), no lo implementes: dímelo a mí y yo lo llevo a la otra conversación.

## 3. Lo que sí puedes hacer con el agente
Solo estos puntos de contacto, sin cambiarles el nombre:
- Mantener <html lang="es|en">: el agente sigue el idioma del sitio con ese atributo.
- Mantener #inv, #inv-card y .hero (el agente lee de ahí la sección visible y qué auto se ve).
- Al llegar al final del sitio, disparar UNA vez el evento window.dispatchEvent(new CustomEvent('fm:site-end')). El agente se encarga de abrir su panel, una sola vez por visita. El sitio no abre nada por su cuenta (ni menú, ni dock): solo avisa con el evento.
- En las fichas, dejar los botones con data-open-page="test_drive", data-open-page="calculadora" y data-agent-open: el agente los atiende solo.
Todo lo demás del sitio es libre.

## 4. Cómo publicar el Artifact SIN perder el agente (obligatorio cada vez)
El agente no viaja dentro de tu build: se inserta al final, con un script, en el HTML ya generado. Si publicas sin ese paso, el agente desaparece o queda una versión vieja.
1. Trae la versión actual del agente, sin fusionar ramas:
   git fetch origin claude/hopeful-carson-t2qp10
   git checkout origin/claude/hopeful-carson-t2qp10 -- src/agent src/styles/agent.css vite.embed.config.js scripts/inject-agent.mjs
   Confirma que package.json tenga la dependencia @elevenlabs/client y el script "build:embed": "vite build --config vite.embed.config.js --mode artifact". Si falta, agrégalos y ejecuta npm install.
2. Genera tu HTML como siempre (build del sitio y scripts/build-artifact.mjs, con los modelos 3D incrustados).
3. npm run build:embed
4. node scripts/inject-agent.mjs <tu-html.html> <tu-html-con-agente.html>
5. Verifica en un navegador headless sobre <tu-html-con-agente.html>: existe exactamente un .fm-agent__fab; al tocarlo se abre DIRECTO el panel #fm-agent-panel con cuatro respuestas rápidas ("Es mi primer auto", "Quiero cambiar mi auto", "Ya soy cliente y quiero un upgrade", "Solo estoy mirando"); no hay ningún menú del sitio entre el botón y el panel; no hay errores de consola.
6. Publica <tu-html-con-agente.html> sobre el MISMO Artifact "Fiesta Motors Showroom video". Nunca publiques el HTML sin el agente. Si te rechaza por una versión más nueva, parte de esa versión, repite 4 a 6 y publica de nuevo.
Nota: el paquete del agente ya neutraliza en el navegador cualquier menú propio del sitio (#inv-dock) y atiende el botón del agente directamente. Eso es una red de seguridad, no una invitación a seguir creando esos elementos: no los generes.

## 5. Créditos
Todo se prueba en local y en los Artifacts de Claude. No despliegues a Netlify ni quites el ignore de netlify.toml hasta que yo lo apruebe al final.

## 6. Entrega
Cuando termines un cambio, dime qué cambió del sitio, confirma que el agente quedó insertado (un botón, abre directo, sin errores) y detente.
```
