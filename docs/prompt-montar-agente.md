# Prompt para montar el agente en el showroom (pegar en la conversación "Fiesta Motors Inmersive")

```
Monta el asistente (agente) de Fiesta Motors en el showroom. Ya está construido en otra rama; tu trabajo es traerlo, conectarlo y regenerar el Artifact. Sigue las reglas de CLAUDE.md (nada se publica sin mi aprobación, no inventes datos de autos, sin afirmaciones publicitarias, claves en .env).

## 1. Traer el código (no lo reescribas)
git fetch origin claude/hopeful-carson-t2qp10
git merge origin/claude/hopeful-carson-t2qp10
Resuelve conflictos conservando el showroom actual. Si el merge te da problemas, copia a mano `src/agent/`, `src/styles/agent.css`, `docs/agente-widget.md` y `docs/conocimiento-sitio.md`, y agrega la dependencia `@elevenlabs/client` y las variables de `.env.example`.

## 2. Qué es el agente (widget, solo front)
- Botón flotante abajo a la derecha, por encima de todo, incluso del panel de páginas del sitio original.
- Al tocarlo abre un panel en MODO TEXTO con saludo escrito (se presenta como asistente de IA). En celular ocupa la parte inferior (72 % de alto).
- Botón "Llamar" dentro del panel pasa a voz sin salir del panel; lo hablado aparece transcrito; "Colgar" vuelve a texto.
- Accesos rápidos: Agendar test drive, Calcular pago, Hablar con un asesor, Continuar por WhatsApp.
- Indicador de "consultando" (puntos animados) mientras el agente usa una herramienta.
- Español e inglés según el idioma del sitio. Respeta "reducir movimiento". Navegable con teclado (Escape cierra), foco gestionado, input de 16 px para que iOS no haga zoom.

## 3. Estructura (todo autocontenido en src/agent/)
- index.js: interfaz del widget; exporta initAgent() que devuelve { open, close }.
- connection.js: capa aislada de proveedor. Contrato: connect(ctx), send(text, ctx), updateContext(ctx), isOpen(), disconnect(), y si hay voz startVoice(ctx), stopVoice(ctx), setMicMuted(bool). Eventos hacia la UI: onMessage({role,text}), onThinking(bool), onStatus(status), onError(msg), onAction(action).
- providers/elevenlabs.js: voz y texto con @elevenlabs/client (textOnly en texto). El SDK se carga con import() dinámico solo al abrir el agente. Registra clientTools: abrir_pagina_sitio({pagina}) y abrir_whatsapp(). Descarta el primer mensaje del agente en texto porque el widget ya mostró su saludo.
- providers/api.js: texto contra VITE_AGENT_API_URL. POST { session_id, message, context } responde { reply, actions? }.
- providers/demo.js + demoEngine.js: MODO DEMOSTRACIÓN sin claves (rotulado en el panel). Responde solo con data/inventory.json; campo vacío => "eso lo confirma un asesor"; no calcula pagos, no promete aprobación, no negocia precio.
- context.js: contexto que recibe el agente { idioma, canal: web_texto|web_voz, seccion, panel_sitio, unidad (todos los campos del JSON) }. Se pasa como variables dinámicas de ElevenLabs al iniciar ({{idioma}}, {{canal}}, {{seccion}}, {{panel_sitio}}, {{unidad}}) y con sendContextualUpdate en cada cambio (400 ms de espera).
- sitePages.js + sitePanel.js: panel a pantalla completa con iframe, botón Cerrar, enlace "Abrir en pestaña nueva" y el agente por encima. Páginas: test_drive (/book-a-test-drive/), trade_in (/trade-in-appraisal/), servicio (/book-an-appointment/), contacto (/contact-us/), calculadora (/payment-calculator/), solicitud_credito (https://fiestamotors.zopsoftware.com/api/templates/render/5). Todas verificadas sin X-Frame-Options. Si una no se puede incrustar: embeddable:false y se abre en pestaña nueva.
- whatsapp.js: abre https://wa.me/<VITE_WHATSAPP_NUMBER> con mensaje inicial que incluye la unidad. Sin número, avisa en el panel que falta configurarlo.
- core/state.js (idioma, unitId, sección, sitePage), core/i18n.js, core/format.js, core/inventory.js, i18n/es.json y en.json (textos del agente; no toques los del sitio).
- src/styles/agent.css, con las variables de la paleta del sitio (--bg, --panel, --line, --text, --red, --ease, --font-body).

## 4. Puntos de conexión en src/main.js
- import './styles/agent.css'; const agent = initAgent() al final.
- Cada vez que cambie el idioma: setAgentState({ lang }) (dentro de applyStatic).
- Cada vez que cambie la unidad enfocada del showroom o la seleccionada en el plan B: setAgentState({ unitId: inventory[i].id }).
- Sección visible con IntersectionObserver sobre .hero, #showroom, #units, .contact: setAgentState({ section: 'hero'|'showroom'|'units'|'contact' }).
- Botones de la ficha: "Agendar test drive" (data-open-page="test_drive") y "Calcular pago" (data-open-page="calculadora") abren la página dentro del sitio con openSitePage; "Preguntar al asistente" (data-agent-open) abre el panel. Sin JS siguen siendo enlaces normales. Quita el aria-disabled y "Disponible pronto".
- Las flechas, Enter y Escape del showroom no deben dispararse si el foco está dentro de .fm-agent o .fm-site-panel.
- El saludo nombra la unidad solo si la sección es showroom o units.

## 5. Regenerar el Artifact
1. npm install && npm run build
2. node scripts/build-artifact.mjs <ruta>.html
3. Antes de publicar, verifica en un navegador headless que el Artifact (a) muestra el botón flotante, (b) el panel abre y el modo demostración responde, (c) no hay errores de consola propios.
4. Restricciones de la plataforma de Artifacts a comprobar: puede bloquear iframes y conexiones externas. Si el iframe del sitio original no carga dentro del Artifact, el panel debe degradar a abrir la página en pestaña nueva (window.open) sin romperse. Lo mismo para ElevenLabs/wss: si no conecta, el panel cae al modo demostración con aviso, nunca queda en blanco. El SDK de ElevenLabs va como chunk dinámico: si el script de build-artifact solo incrusta un JS, configura Vite para que el agente quede en un solo bundle (build.rollupOptions.output.inlineDynamicImports = true) y confirma que el HTML resultante pesa menos de 16 MB.
5. Publica sobre el MISMO Artifact existente ("Fiesta Motors Showroom") como actualización, privado, con noindex. No cambies la URL.

## 6. Lo que NO se hace aquí
- No construyas backend, tablero ni WhatsApp real (otro proyecto). No agregues escaneo de licencia.
- No inventes datos de autos ni textos de marketing. Precio muestra "+ HST y licencia" como el sitio.
- No afirmes aprobación de crédito ni garantías: los términos del sitio dicen que los autos se venden "as is".

## 7. Configuración pendiente (yo la entrego)
- VITE_ELEVENLABS_AGENT_ID (agente público con lista de dominios, variables dinámicas idioma/canal/seccion/panel_sitio/unidad y las dos herramientas de cliente).
- VITE_WHATSAPP_NUMBER (número de prueba).
- VITE_AGENT_API_URL y VITE_AGENT_TEXT_PROVIDER cuando exista el backend.
Todo VITE_* queda visible en el navegador: nunca claves secretas ahí.

## 8. Entrega
Dime qué hiciste, cómo verlo y qué falta de mi parte. Detente ahí.
```

## Reglas del agente (resumen para pegar si hace falta)

El prompt completo del agente de ElevenLabs está en `docs/agente-fiesta-motors-prompt.md` y la spec del backend en `docs/spec-agente-atencion.md`. Ambos ya viajan con la rama.
