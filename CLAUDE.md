# Fiesta Motors — Showroom inmersivo (demo)

Instrucciones para Claude Code. Léelas completas antes de escribir código.

## Contexto

- **Cliente prospecto:** Fiesta Motors, dealer de autos seminuevos en Woodbridge, Ontario (GTA). Unas 120 unidades en inventario. Sitio actual: https://woodbridge.fiestamotors.ca/
- **Quién construye:** Shellcore CO. (Alan Garcia). Esta demo sirve para ganar el proyecto: tiene que verse como un sitio de agencia de primer nivel y funcionar perfecto en celular, que es por donde llega su clientela.
- **Documentos de apoyo** (en `docs/`):
  - `concepto-v2-showroom.md`: el concepto aprobado. Si algo aquí choca con ese documento, pregunta.
  - `video-intro-shotlist.md`: el trailer de entrada (lo produce Alan aparte en Higgsfield).
  - `agente-fiesta-motors-prompt.md`: prompt y reglas del agente de voz.

## Reglas que no se rompen

1. **Nada se publica sin aprobación explícita de Alan.** Los despliegues son de vista previa, en enlace privado, con `<meta name="robots" content="noindex, nofollow">` y `X-Robots-Tag: noindex`.
2. **No inventes datos de autos.** Precio, kilometraje, dueños o condición que no estén en `data/inventory.json` no aparecen, ni en pantalla ni en el agente. Un campo vacío se muestra como "Consultar" y el agente ofrece pasar con un ejecutivo.
3. **Nada de afirmaciones publicitarias inventadas** ("stock exclusivo", "aprobación garantizada", etc.). Es un dealer registrado en Ontario y su publicidad está regulada (OMVIC). Los textos de marketing los aprueba Alan.
4. **Claves fuera del código:** ElevenLabs, WhatsApp y cualquier otra van en `.env` (con `.env.example` sin valores) y en las variables de entorno de Netlify.
5. **Solo assets con licencia:** modelos 3D, sonidos, música y tipografías con licencia comercial o libre, con la atribución anotada en `CREDITS.md`.
6. **Trabaja por fases y detente al final de cada una** para que Alan revise. No avances de fase sin su visto bueno.
7. **Cuida los tokens:** no leas archivos binarios grandes, no repitas trabajo y no regeneres archivos completos para cambios pequeños.

## Qué se construye

Un sitio de una sola página con tres partes:

1. **Trailer de entrada.** Video a pantalla completa con sonido de motor. Arranca sin sonido, con botones "Activar sonido" y "Saltar". Al terminar o al saltar, se funde con el showroom. Si el visitante ya lo vio (se guarda en `localStorage`), entra directo al showroom.
2. **Showroom 3D.** El auto en una plataforma de estudio oscuro. Se gira 360° arrastrando y se acerca con pellizco o rueda. Abajo, una franja horizontal para elegir entre 5 unidades, como la pantalla de selección de autos de un videojuego. Ficha de la unidad con botones de acción.
3. **Franja final.** Reseñas de Google, carrusel de entregas reales a clientes y contacto (mapa, dirección, horario, teléfono).

Más el **botón flotante del agente**, abajo a la derecha, visible siempre.

Referencia de calidad visual: https://www.lamborghini.com/en-en. Fondo oscuro, tipografía grande, mucho aire, pocas cosas en pantalla y el auto como protagonista. No copiar su marca ni sus textos; adaptar la sensación a un dealer de seminuevos, donde precio, kilometraje y financiamiento importan más que la potencia.

## Stack

- Vite con JavaScript sin framework (sin React ni Tailwind).
- Three.js para el showroom: `GLTFLoader` con `DRACOLoader` y `KTX2Loader`, `OrbitControls`, iluminación con mapa de entorno HDR (`RGBELoader` + `PMREMGenerator`), sombra de contacto en el piso.
- GSAP 3 para transiciones de interfaz y Lenis para el scroll suave (las mismas versiones que el sitio de Shellcore: GSAP 3.12.5, Lenis 1.0.42).
- Despliegue en Netlify, solo como vista previa privada.

Estructura sugerida:

```
/
├── index.html
├── src/
│   ├── main.js
│   ├── trailer.js
│   ├── showroom/        (escena, carga de modelos, controles, selector)
│   ├── agent/           (widget y contexto del agente)
│   ├── i18n/            (es.json, en.json)
│   └── styles/
├── public/
│   ├── models/          (.glb por unidad)
│   ├── video/           (trailer 16:9 y 9:16, póster)
│   ├── photos/          (fotos reales por unidad)
│   ├── social/          (8–10 entregas: fotos y videos)
│   └── hdr/
├── data/
│   ├── inventory.json
│   └── reviews.json
├── docs/
├── CREDITS.md
├── .env.example
└── netlify.toml
```

## Datos

`data/inventory.json` alimenta showroom, ficha y agente. Un objeto por unidad:

```json
{
  "id": "389D3B",
  "stock": "389D3B",
  "vin": "",
  "year": 2025,
  "make": "Honda",
  "model": "HR-V",
  "trim": "Sport",
  "body": "SUV",
  "color": "",
  "price": null,
  "odometer_km": null,
  "owners": null,
  "condition_notes": "",
  "engine": "",
  "transmission": "",
  "drivetrain": "",
  "detail_url": "",
  "model3d": "models/honda-hrv-2025.glb",
  "model3d_illustrative": true,
  "photos": [],
  "hotspots": []
}
```

- **Las 5 unidades:** las primeras 5 de https://woodbridge.fiestamotors.ca/inventory/. El listado se arma con JavaScript: una descarga simple trae la plantilla vacía. Léelo con Playwright (Chromium ya está instalado; no ejecutes `playwright install`). Dos unidades confirmadas: 2025 Honda HR-V Sport (stock 389D3B) y 2024 Volkswagen Golf GTI 380 Performance.
- Su sitio no publica dueños ni condición, y muchas fichas traen campos vacíos. Deja `null` o `""` y anota en un `docs/datos-faltantes.md` qué falta de cada unidad, para que Alan se lo pida al dealer.
- Las fotos de su inventario son de estudio de la marca. No las uses como si fueran de la unidad: las fotos reales las entrega Alan.
- `data/reviews.json`: reseñas reales de https://woodbridge.fiestamotors.ca/reviews/, sin editar el texto, con nombre, estrellas e idioma.

## Showroom 3D

- **Escena:** estudio oscuro, plataforma circular con un aro de luz sutil, reflejos de estudio en la carrocería y sombra de contacto. Cámara a la altura de los ojos, ligeramente baja.
- **Controles:** giro 360° libre en horizontal; vertical limitado (sin ver debajo del piso); zoom entre 0.7× y 1.6×; sin desplazamiento lateral. Inercia suave. Giro automático lento cuando no hay interacción por 4 segundos.
- **Puntos de interés:** 3 o 4 por auto (rines, interior, faros, cajuela), definidos en `hotspots` del JSON. Al tocarlos se abre una foto real de esa parte.
- **Selector:** franja horizontal con las 5 unidades (miniatura, modelo, año, precio). Flechas, teclado y deslizamiento con el dedo. Al cambiar, el auto sale de la plataforma deslizándose y entra el siguiente (unos 0.8 s), con un sonido corto.
- **Ficha:** año, marca, modelo, versión, kilometraje, precio, dueños, notas de condición. Botones: "Agendar test drive", "Calcular pago", "Preguntar al asistente". En escritorio va al costado; en celular, como hoja deslizable desde abajo.
- **Etiqueta visible:** "Modelo 3D ilustrativo · ver fotos reales" cuando `model3d_illustrative` es `true`, con acceso a la galería real.
- **Modelos 3D:** Alan compra los definitivos (mismo modelo, generación y color). Mientras tanto usa un modelo de prueba con licencia libre y anótalo en `CREDITS.md`. Comprime cada `.glb` con `gltf-transform` (Draco y KTX2). Meta: 8 MB o menos por auto.
- **Carga:** solo el auto seleccionado; el siguiente y el anterior se precargan después. Indicador de carga elegante, no un spinner genérico.
- **Plan B:** si el equipo no soporta WebGL o va lento (menos de 30 fps sostenidos), muestra un giro con fotos de la unidad en lugar del 3D.

## Trailer

- Archivos: `public/video/trailer-16x9.mp4` y `trailer-9x16.mp4` (H.264, más versión WebM si pesa menos), más un póster JPG. Hasta que Alan entregue el video final, usa un video de prueba oscuro o el póster solo.
- Se elige la versión según la orientación de la pantalla.
- `autoplay muted playsinline`. Botón "Activar sonido" visible; botón "Saltar" desde el primer segundo.
- Al terminar: el último cuadro se funde en 1 segundo con el showroom.
- Con "reducir movimiento" activo en el sistema: no se reproduce solo; se muestra el póster con un botón de reproducir.

## Agente

- Botón flotante abajo a la derecha, por encima de todo (también sobre los marcos).
- Al tocarlo se abre el panel y el agente se presenta con voz en una o dos frases. En celular, el panel ocupa la parte inferior de la pantalla.
- Voz con el SDK de agentes conversacionales de ElevenLabs. El ID del agente va en `.env`; si no está configurado, el panel muestra un modo de texto de prueba que no inventa datos.
- **Contexto que recibe al abrir y al cambiar algo:** idioma, unidad seleccionada (todos sus campos del JSON) y sección visible.
- Atiende: precios, existencias, agendar test drive, kilometraje, dueños, detalles de condición y financiamiento. Prompt y reglas en `docs/agente-fiesta-motors-prompt.md`.
- **Financiamiento:** ofrece pasar con un ejecutivo (WhatsApp con mensaje inicial que incluye la unidad) o abre la calculadora del sitio original.
- **Páginas del sitio original** (test drive, calculadora, trade-in, contacto): se abren en un panel a pantalla completa dentro del sitio, con botón de cerrar y el agente visible encima. Verifica que cada página se pueda incrustar; si una no se puede, ábrela en pestaña nueva y avisa a Alan.
  - Test drive: https://woodbridge.fiestamotors.ca/book-a-test-drive/
  - Trade-in: https://woodbridge.fiestamotors.ca/trade-in-appraisal/
  - Contacto: https://woodbridge.fiestamotors.ca/contact-us/
  - Calculadora: localiza la URL en su sitio y confírmala con Alan.

## Franja final

- Encabezado de reseñas con la calificación promedio y el total de reseñas del perfil de Google (Alan confirma las cifras), y enlace a "Ver todas en Google".
- Tarjetas de reseñas en inglés y español.
- Carrusel vertical de entregas ("Ya son parte de la familia" / "Part of the family"): fotos y videos de `public/social/`. Los videos se reproducen sin sonido al entrar en pantalla y con sonido al tocarlos. No usar los incrustados de Facebook o Instagram.
- Contacto: mapa, dirección, horario y teléfono (416-855-6663, Woodbridge).

## Dirección visual

- **Fondo:** casi negro, cálido.
- **Colores:** extraerlos del logo real (rojo de las letras y azul del óvalo a cuadros). El rojo es el acento; el azul se usa poco. No inventes una paleta nueva.
- **Tipografía:** una de titulares ancha y con carácter, y una de texto muy legible. Propón dos pares a Alan antes de fijarlas.
- **Movimiento:** pocos efectos, bien hechos. Transiciones de 0.4 a 0.8 s con curvas suaves. Nada parpadea ni rebota.
- Cursor personalizado solo en escritorio.

## Idiomas, accesibilidad y rendimiento

- Español e inglés desde `src/i18n/`. Idioma inicial según el navegador; botón EN/ES siempre visible.
- Respeta "reducir movimiento": sin giro automático, sin transiciones largas.
- Navegable con teclado; contraste AA en textos.
- Celular primero. El primer contenido visible (póster del trailer) carga en menos de 2.5 s con 4G.
- Instalable desde el navegador (manifiesto e icono), sin promoverlo.

## Fases (detente al final de cada una)

1. **Base y datos.** Proyecto Vite, estructura de carpetas, `netlify.toml` con `noindex`, extracción de las 5 unidades a `inventory.json` y `docs/datos-faltantes.md`. Muestra a Alan el JSON.
2. **Showroom 3D** con un modelo de prueba: escena, luz, controles y plan B. Muestra una vista previa local.
3. **Selector y ficha** con las 5 unidades.
4. **Trailer** con video de prueba y la transición al showroom.
5. **Agente:** botón, panel, voz, contexto y paneles del sitio original.
6. **Franja final:** reseñas, entregas y contacto.
7. **Idiomas, accesibilidad y rendimiento:** pasada final y prueba en un celular real (Alan).
8. **Vista previa en Netlify** en enlace privado, solo con aprobación de Alan.

Al cerrar cada fase, entrega: qué se hizo, cómo verlo y qué necesitas de Alan (assets, datos o decisiones).

## Lo que entrega Alan (no lo esperes para avanzar; usa marcadores)

- Logo vectorial.
- Fotos reales de las 5 unidades y de la entrega a clientes (8 a 10 publicaciones).
- Datos faltantes de las unidades (kilometraje, dueños, condición).
- Modelos 3D comprados.
- Trailer final (16:9 y 9:16).
- ID del agente de ElevenLabs y número de WhatsApp de prueba.
