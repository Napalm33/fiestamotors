# Watchdog de WhatsApp — Fiesta Motors

Recibe cada lead nuevo en el instante en que Make lo publica y lo envía al grupo de WhatsApp. No consulta ninguna hoja y no usa Claude: solo escucha.

    Sofía (ElevenLabs) → Make → ntfy.sh (canal privado) → este script → WhatsApp Web → grupo

## Instalación (una vez, en la computadora que quedará encendida)
1. Instala Node.js 20 o superior.
2. En esta carpeta: `npm install` y luego `npx playwright install chromium`.
3. Revisa `config.json` (`topic` = canal secreto de ntfy, `group` = nombre exacto del grupo).
4. Prueba sin WhatsApp: `npm run prueba`. Debe decir "Conectado a ntfy".
5. Primera ejecución real: `npm start`. Se abre WhatsApp Web; escanea el código QR con el teléfono (Dispositivos vinculados). La sesión queda guardada en `wa-profile/`, no hay que repetirlo.
6. Déjalo corriendo. Para que arranque solo: Programador de tareas de Windows ("al iniciar sesión", acción `node watchdog.mjs`) o `pm2 start watchdog.mjs`.

## Qué hace
- Se reconecta solo si se cae internet. Si la PC estuvo apagada, al volver recupera los mensajes de las últimas ~12 h (ntfy los guarda ese tiempo) sin duplicar.
- Envía de uno en uno, máximo 4 por minuto, y confirma que el mensaje apareció en el chat antes de darlo por enviado.
- Bitácora en `logs/watchdog.log`. Lo ya enviado se anota en `state.json`.

## Cuidados
- **El `topic` es una contraseña.** Quien lo conozca puede leer y publicar en el canal. No lo compartas ni lo subas a un repositorio (`config.json` está en `.gitignore`). Si se filtra: cambia el `topic` aquí y en el módulo HTTP del escenario de Make.
- **Privacidad:** el mensaje lleva nombre, contacto, tipo de auto y presupuesto, y pasa por el servidor público ntfy.sh. No lleva datos de crédito. Para más control se puede alojar ntfy en un servidor propio (`ntfyServer` en config.json).
- **WhatsApp Web no tiene API oficial para esto.** Automatizarlo va contra sus condiciones de uso y puede provocar el bloqueo del número. Úsalo con un volumen bajo y de preferencia con un número de pruebas. Si WhatsApp cambia su página, los selectores de `sendToGroup` en `watchdog.mjs` pueden requerir ajuste.
