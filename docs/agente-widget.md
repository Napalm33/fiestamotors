# Widget del agente — cómo funciona y qué configurar

Código en `src/agent/`. Solo el widget; el backend, el tablero y WhatsApp son otro proyecto.

## Modos de conexión (`src/agent/connection.js`)

| Configuración | Texto | Voz |
|---|---|---|
| Sin claves | **Modo demostración** (solo datos de `data/inventory.json`, rotulado en el panel) | Botón "Llamar" desactivado |
| `VITE_ELEVENLABS_AGENT_ID` | ElevenLabs en modo texto (`textOnly`) | ElevenLabs, en el mismo panel, con transcripción |
| `VITE_AGENT_TEXT_PROVIDER=api` + `VITE_AGENT_API_URL` | Backend propio | ElevenLabs si hay ID |

La interfaz solo conoce el contrato de `connection.js`; cambiar de proveedor no toca la UI.

Contrato del backend de texto: `POST VITE_AGENT_API_URL` con `{ session_id, message, context }`, responde `{ reply, actions? }`, donde `actions` es una lista de `{type:'open_panel', page}` o `{type:'whatsapp'}`.

## Contexto que recibe el agente

`{ idioma, canal: web_texto|web_voz, seccion, panel_sitio, unidad: {todos los campos del JSON} }`.
- Al iniciar la sesión, como **variables dinámicas** de ElevenLabs: `{{idioma}}`, `{{canal}}`, `{{seccion}}`, `{{panel_sitio}}`, `{{unidad}}` (JSON). Deben declararse en el agente.
- Cada cambio (idioma, unidad, sección, panel abierto) se envía con `sendContextualUpdate`, con 400 ms de espera para no saturar.

## Herramientas de cliente (a registrar en el agente de ElevenLabs)

- `abrir_pagina_sitio(pagina)`: `test_drive`, `trade_in`, `servicio`, `contacto`, `calculadora`, `solicitud_credito`. Abre el panel a pantalla completa.
- `abrir_whatsapp()`: abre `wa.me` con la unidad que ve el cliente.

## Pendientes de configuración (Alan)

1. Agente de ElevenLabs: marcarlo como público con lista de dominios, declarar las variables dinámicas y las dos herramientas de cliente. El saludo escrito lo pone el widget; en modo texto se descarta el primer mensaje del agente para no duplicarlo.
2. `VITE_WHATSAPP_NUMBER` (número de prueba). Sin él, "Continuar por WhatsApp" avisa que falta configurarlo.
3. `VITE_AGENT_API_URL` cuando exista el backend.
4. `VITE_*` queda visible en el navegador: el ID del agente es público por diseño; nunca poner claves secretas ahí.

## Páginas del sitio original

Verificadas el 2026-10-17 con `curl -I`: las cinco responden 200 **sin** `X-Frame-Options` ni `frame-ancestors`; se probó incrustada la de test drive. Si alguna cambia, se pone `embeddable: false` en `src/agent/sitePages.js` y se abre en pestaña nueva. El panel siempre ofrece "Abrir en pestaña nueva".
- Calculadora: `https://woodbridge.fiestamotors.ca/payment-calculator/` (URL de la spec).
- Solicitud de crédito: `https://fiestamotors.zopsoftware.com/api/templates/render/5`. Es un sitio de terceros (ZopDealer): confirmar con Alan que lo quiere incrustado.

## Integración con el sitio

El agente se monta sobre el sitio de la rama `claude/upbeat-brown-hcegt3` (inventario real de 5 unidades, hero y showroom 3D). Puntos de contacto en `src/main.js`:
- `initAgent()` al final; devuelve `{ open, close }`.
- Idioma, unidad enfocada y sección visible se pasan al agente con `setAgentState` (`src/agent/core/state.js`).
- En la ficha, "Agendar test drive" y "Calcular pago" abren la página del sitio original dentro del sitio (sin JS siguen siendo enlaces), y "Preguntar al asistente" abre el panel.
- El agente tiene sus propios textos en `src/agent/i18n/` y no toca los del sitio.

## Embudo de ventas (v0.4)

El agente conduce la conversación: necesidad del cliente, tipo de auto y presupuesto, recomendación y comparativa, contado o financiamiento. Contado va directo a la compra; solo con financiamiento se pide permiso para la recolección de información (ID canadiense, historial, credit score en rango, ingreso, empleo, enganche, trade-in). Las reglas completas están en la sección 5b de `docs/agente-fiesta-motors-prompt.md`.
- Modo demostración: `src/agent/demoEngine.js` implementa el embudo con botones de respuesta rápida y solo con datos de `data/inventory.json`. Detecta un posible SIN o tarjeta y lo rechaza sin guardarlo.
- Los mínimos de las financieras no están definidos: el agente no decide si el cliente "califica", solo reúne y pasa a un asesor.
- Con ElevenLabs, el embudo lo conduce el prompt del agente; el widget solo muestra las cuatro preguntas de necesidad al abrir.

## Cargar el agente en un Artifact cuyo código no está en este repo

Para "Fiesta Motors Showroom video" (el código del showroom vive en otra conversación):
1. `npm run build:embed` genera `dist-embed/` (un solo JS y su CSS, sin claves: modo demostración).
2. `node scripts/inject-agent.mjs <html-publicado> <salida.html>` lo inserta al final del HTML, retira la instancia anterior del agente y se engancha a la página (idioma, unidad en `#inv-card`, secciones, botones `data-open-page` y `data-agent-open`). Es idempotente.
3. Publicar `<salida.html>` sobre el mismo Artifact.

Si esa conversación republica desde su propio código, el agente insertado se pierde. Para que no pase, o bien se fusiona esta rama y se usa `initAgent()` (ver `docs/prompt-montar-agente.md`), o se repite el paso 2 después de cada publicación.
