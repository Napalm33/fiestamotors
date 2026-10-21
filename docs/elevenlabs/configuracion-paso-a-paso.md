# Configurar el agente en ElevenLabs, paso a paso

Archivos de este paquete: `system-prompt.md` (se pega en el agente) y `base-conocimiento.md` (se sube como conocimiento). Los ajustes marcados con ✔ los verifiqué en la documentación de ElevenLabs (octubre de 2026); los nombres exactos de los botones pueden variar un poco en tu pantalla, así que si algo no coincide, mándame una captura.

## 0. Tipo de agente
En "Nuevo agente" elige **Agente en blanco**. No uses Architect ni una plantilla: generarían un prompt genérico y ya tenemos el nuestro.

## 1. Pestaña del agente
1. **Nombre:** Fiesta Motors, asistente.
2. **First message (primer mensaje):** escribe exactamente `{{primer_mensaje}}`. El widget manda ese texto en el idioma de la página al iniciar la llamada, así el saludo sale en español o en inglés. ✔ Si agregas idiomas adicionales, cada idioma tiene su propio primer mensaje: pon también `{{primer_mensaje}}` en el de inglés y revisa que no lo haya traducido solo.
3. **System prompt:** pega el bloque de `system-prompt.md`.
4. **Idioma:** principal español; en idiomas adicionales agrega inglés. ✔ Al agregar un idioma que no sea inglés, el agente pasa al modelo de voz multilingüe v2.5, que es el que necesitamos.
5. **Voz:** elige una voz que suene bien en los dos idiomas y pruébala con una frase en español y otra en inglés. ✔ ElevenLabs recomienda una voz propia por idioma para mejor pronunciación; si la de español te convence menos en inglés, asigna una voz distinta al inglés.
6. **Modelo de lenguaje (LLM):** uno rápido, porque en voz la latencia se nota. Prueba dos y quédate con el que responda más ágil sin perder el hilo del embudo.
7. **Variables dinámicas (valores de prueba):** ElevenLabs las detecta al ver `{{...}}` en el prompt. Dales estos valores por defecto, solo para probar dentro de su panel (el sitio los reemplaza):
   - `idioma` = es
   - `canal` = web_voz
   - `seccion` = showroom
   - `panel_sitio` = ninguno
   - `unidad` = ninguna
   - `primer_mensaje` = Hola, soy el asistente virtual de Fiesta Motors, una inteligencia artificial. ¿En qué te ayudo?
   ✔ Las variables del sistema (las que empiezan con `system__`) no se pueden mandar desde el sitio, y estas son variables nuestras, así que está bien.
8. **Base de conocimiento:** sube `base-conocimiento.md`. Es corta; si hay una opción de búsqueda (RAG), déjala apagada para que el agente tenga todo el documento en contexto.

## 2. Herramientas
**Herramientas del sistema**
- **Detección de idioma: activada.** ✔ No viene activa por defecto. Déjala sin la opción "solo al inicio de la conversación" para que pueda cambiar de idioma en cualquier momento.
- **Terminar la conversación:** opcional.

**Herramientas de cliente** (se ejecutan en la página, no en un servidor). Crea tres, con estos nombres exactos:

| Nombre | Parámetros | Descripción |
|---|---|---|
| `abrir_pagina_sitio` | `pagina` (texto, obligatorio): `test_drive`, `trade_in`, `servicio`, `contacto`, `calculadora` o `solicitud_credito` | Abre en pantalla la página del sitio de Fiesta Motors que el cliente necesita. Úsala después de avisar al cliente. |
| `abrir_whatsapp` | ninguno | Abre WhatsApp con un mensaje que incluye la unidad que ve el cliente. Úsala para pasar con una persona. |
| `ofrecer_llamada` | ninguno | Muestra al cliente una invitación a pasar de texto a voz. Úsala cuando la voz agilice el proceso. |

Activa "esperar respuesta" (el agente espera a que la herramienta termine) en las tres.

**Eventos del cliente (pestaña Avanzado).** Además de crear las herramientas, asegúrate de que estén activados los eventos de herramientas que ofrezca la lista (`client_tool_call` si aparece, y `agent_tool_request` y `agent_tool_response`). Si no, el agente dice "ya te abrí el formulario" y a la página nunca llega la orden: lo vimos probando con el agente real. La prueba para saber si ya funciona: pedir "ábreme el formulario de test drive" en el sitio y que se abra el panel de la página.

## 3. Pestaña de seguridad (Security)
- **Lista de dominios permitidos (allowlist):** agrega el dominio donde vivirá el sitio. Mientras pruebas en local agrega también `localhost`. El ID del agente queda visible en el código de la página, así que sin allowlist cualquiera podría usarlo y gastar tus minutos. Actívala antes de compartir cualquier enlace.
- **Overrides (sobrescrituras):** enciende **solo "Text only"** (solo texto). ✔ El modo de texto del widget lo manda como sobrescritura y, si está apagado, la conexión falla. Deja apagados system prompt, primer mensaje, voz y modelo: el widget no los usa y apagados son más seguros.
- **Límites:** duración máxima de llamada (por ejemplo 10 minutos) y tope de llamadas simultáneas o por día, para controlar el costo.
- **Retención de datos y grabaciones:** decide con el dealer cuánto se guarda y si se avisa de la grabación. Está como [CONFIRMAR] en la spec; no lo cierres sin ellos.

## 4. Pruebas dentro del panel de ElevenLabs (antes de conectar el sitio)
Haz cada una, en texto y luego en voz, y anota qué falla:
1. "Es mi primer auto" → pregunta tipo y presupuesto; recomienda solo autos de la base; no inventa datos.
2. Presupuesto + "de contado" → ofrece test drive o asesor; no pide datos de crédito.
3. "Quiero financiarlo" → explica sin prometer; **pide permiso** antes de las preguntas; las hace una por una; resume al final.
4. Dicta o escribe un SIN o una fecha de nacimiento → no lo repite y manda a la solicitud segura.
5. "¿Califico para un crédito?" → no decide; pasa con un asesor.
6. Escribe en inglés a mitad de la conversación → cambia a inglés.
7. Pregunta por garantías → no habla de ellas, ofrece un asesor.
8. Varios mensajes largos o dudas seguidas → en algún momento usa `ofrecer_llamada` (una sola vez).
9. "Dame un descuento" → no negocia.

## 5. Conectar con el sitio
1. Copia el **ID del agente** (Agent ID).
2. En el proyecto, `.env` (nunca se sube al repo): `VITE_ELEVENLABS_AGENT_ID=<tu ID>`. Reinicia `npm run dev`.
3. Pruébalo en `localhost` (para eso agregaste `localhost` al allowlist).
4. **En los Artifacts de Claude no funcionará:** la plataforma bloquea las conexiones externas, así que ahí el agente seguirá en modo demostración. La voz y el texto con ElevenLabs solo se ven en local o ya desplegado en Netlify, y Netlify queda para el final y con tu aprobación.
5. Cuando se despliegue, agrega el mismo valor en las variables de entorno de Netlify.

## 6. Lo que necesito de ti
- Una captura de cada pantalla cuando llegues a ella (para ajustar los nombres exactos).
- El ID del agente (por una vía privada, no en un chat público) cuando lo tengas.
- Qué voz elegiste en cada idioma.
