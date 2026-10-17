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

## Estado del repo

Las fases 1 a 4 aún no existen. Para poder probar el agente se agregó:
- `data/inventory.json` provisional con **solo** las dos unidades confirmadas (2025 Honda HR-V Sport, stock 389D3B; 2024 Volkswagen Golf GTI 380 Performance) y el resto en `null`/`""`. La extracción de las 5 unidades con Playwright es la fase 1.
- `src/dev-host.js`: anfitrión provisional (selector de unidad, EN/ES y secciones) que reemplazará el showroom.
- Colores y tipografía provisionales en `src/styles/base.css`; se fijan con el logo y el par tipográfico que apruebe Alan.
