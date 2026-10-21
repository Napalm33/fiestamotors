# Rutina de revisión del inventario

Objetivo: que el agente nunca hable de un auto que ya no está publicado.

## Qué hace
`node scripts/sync-inventory.mjs` hace una sola petición al feed público de ZopDealer (el mismo que usa el sitio del dealer; sin navegador) y:
- Compara contra la revisión anterior (`data/inventory-snapshot.json`): unidades nuevas, vendidas o retiradas y cambios de precio.
- Marca cuáles unidades del showroom siguen publicadas en `data/availability.json`, con su precio y kilometraje vigentes. El agente lee ese archivo: no ofrece lo retirado y usa los datos vigentes.
- Reescribe solo la sección de unidades de `docs/elevenlabs/base-conocimiento.md` (entre `<!--unidades:start-->` y `<!--unidades:end-->`): las retiradas quedan como NO DISPONIBLE.
- Deja el reporte en `docs/inventario-cambios.md`.
No toca `data/inventory.json`: ese archivo es del sitio. El reporte dice qué debería actualizar allí.

## Protecciones
- Si el feed falla, viene vacío o trae menos de la mitad de las unidades de la vez anterior, no cambia nada y termina con error (así un fallo del feed no marca todo como vendido).
- Kilometraje: el feed trae `odometer_numeric` en 0 para algunas unidades; se usa `odometer` y un 0 se toma como "sin dato".
- Precio: si el feed trae dos precios distintos para una unidad (pasa con el Golf GTI: 39,999 y 40,999), el reporte lo marca para que el dealer lo revise; el agente usa el publicado en el sitio.

## Qué falta para que sea automática
1. **Programarla** (por ejemplo cada noche): una tarea programada que ejecute el script, y si hay cambios los confirme y los suba a la rama.
2. **Subir la base de conocimiento actualizada a ElevenLabs.** Hoy es manual (reemplazar el archivo). Se automatiza con la API de ElevenLabs, que requiere una clave guardada como variable de entorno, nunca en el código.
3. **Republicar** el Artifact o el sitio para que el agente de demostración use el nuevo `availability.json` (va dentro de la compilación).
4. **Consulta en vivo.** Entre dos revisiones hay una ventana en la que un auto puede venderse. Para cerrarla, el agente debe confirmar la disponibilidad en el momento de recomendar o agendar (herramienta de servidor que consulte el mismo feed). Mientras tanto, el prompt le prohíbe afirmar disponibilidad como un hecho.

## Estado de la primera revisión (2026-10-21)
111 unidades publicadas, todas de Fiesta Motors Woodbridge (el feed no trae ninguna de Brampton). La Nissan Rogue 2026 Dark Armor del showroom ya no está publicada. La Crosstrek y la Silverado se ven bien una vez corregido el kilometraje.
