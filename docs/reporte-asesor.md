# Reporte para el asesor (post-llamada)

Flujo: conversación con el agente (ElevenLabs) → webhook post-llamada → Make → documento en Google Drive → mensaje al grupo de WhatsApp "Fiesta Motors Testing".

## Estado
- Agente de ElevenLabs: 19 campos de extracción (`data_collection`), resumen en español, sin grabación de voz y conversación borrada a 1 día (`privacy`). Aviso al cliente de que se arma un reporte, dentro del paso de financiamiento del prompt.
- Make (equipo "My Team"): webhook "Fiesta Motors · Reporte post-llamada (ElevenLabs)". Su URL es un secreto: no va al repositorio, se consulta en Make. Aún sin escenario.
- Drive de exe.shellcore@gmail.com: carpeta "Reportes Fiesta Motors".

## Pendiente
1. Webhook de ElevenLabs hacia el webhook de Make (la clave API actual no tiene el permiso `webhooks_write`) y asignarlo como post-call webhook del agente (evento: transcripción).
2. Conexión de Google en Make (Drive, Docs, Sheets) con exe.shellcore@gmail.com.
3. Escenario Make: webhook → documento en la carpeta (resumen + campos) → fila en la hoja "Cola WhatsApp" (id, fecha, mensaje, enlace, estado=pendiente).
4. Cowork: lee las filas pendientes, escribe al grupo por WhatsApp Web y marca "enviado".
5. Consulta posterior del agente: herramienta de servidor que busca el reporte por identificador o contacto.
6. Dealer: confirmar retención y aviso al cliente (OMVIC/privacidad).
