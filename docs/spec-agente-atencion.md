# Spec — Agente de atención de Fiesta Motors (voz y WhatsApp)

Versión 0.1 · 17 de octubre de 2026 · Shellcore CO.
Complementa `contexto-y-decisiones.md` y `agente-fiesta-motors-prompt.md`. Lo marcado [CONFIRMAR] depende de datos de Fiesta Motors.

---

## 1. Objetivo

Un solo agente atiende las llamadas y el WhatsApp de Fiesta Motors. Resuelve lo que puede, clasifica a cada cliente y pasa al asesor correcto solo lo que necesita a una persona. Todo lo que ocurre queda en un tablero que funciona como embudo de ventas.

**Meta medible del piloto:** que el agente resuelva solo al menos el 60 % de las conversaciones [meta a validar con datos reales], con respuesta inmediata las 24 horas, y que los asesores reciban únicamente prospectos calificados o casos que de verdad requieren su intervención.

## 2. Canales

**Canal principal: el widget del sitio** (decidido 17 oct 2026). Un solo botón flotante abre un panel donde el cliente escribe o toca "Llamar" para hablar por voz con el agente. La conversación sigue en el mismo panel si cambia de texto a voz o al revés.

| Canal | Cómo entra | Tecnología | Cuándo |
|---|---|---|---|
| Texto en el sitio | Panel del botón flotante, abre en modo texto | ElevenLabs en modo texto, o Claude API con el mismo backend si el modo texto no encaja | Demo |
| Voz en el sitio | Botón "Llamar" dentro del mismo panel | Widget de ElevenLabs | Demo |
| WhatsApp simulado | Número de prueba de la API oficial de WhatsApp, que solo puede escribir a números autorizados de antemano | WhatsApp Cloud API (número de prueba de Meta) | Demo y piloto |
| WhatsApp real | Número único del negocio, publicado en sitio, Google, redes y anuncios | WhatsApp Business API oficial | Producción |
| Llamada telefónica | Desvío de la línea 416-855-6663 cuando nadie contesta o fuera de horario; después, la línea completa | ElevenLabs con número telefónico vía Twilio o SIP | Producción |

- **Texto primero:** el panel abre en texto y la voz es opcional. El texto cuesta mucho menos que la voz y resuelve la mayoría de las preguntas; quien prefiere hablar toca "Llamar".
- **WhatsApp simulado:** es WhatsApp de verdad en el celular, con el mismo agente detrás, pero con un número de prueba y sin tocar la línea del dealer. Para la demo se autoriza antes el celular del dueño, que escribe desde su propio teléfono. Respaldo si algo falla: una pantalla dentro del tablero que imita el chat de WhatsApp.
- **Al pasar a producción:** verificar si su número actual puede usarse en la app de WhatsApp Business y en la API al mismo tiempo, o si hay que migrarlo; de eso depende cómo se conserva su historial de conversaciones.

Los tres canales comparten el mismo cerebro: mismas reglas, misma base de conocimiento y mismas herramientas. Un cliente que llama y luego escribe es el mismo prospecto en el tablero (se une por número de teléfono).

## 3. Qué resuelve el agente solo

- Inventario: disponibilidad, año, marca, modelo, versión, kilometraje, precio, equipamiento y condición publicada.
- Precios y cargos: precio publicado, HST y cargos adicionales [CONFIRMAR lista y montos].
- Cálculo de pagos de financiamiento: siempre en rango y como estimado sujeto a aprobación (sección 7).
- Estimado de seguro: rango orientativo basado en la experiencia de la compañía (sección 8).
- Requisitos y procedimientos: documentos para comprar, financiar, registrar y asegurar; cómo funciona el trade-in; garantías [CONFIRMAR].
- Horarios, ubicación y cómo llegar.
- Agenda de citas directo en el calendario de cada asesor (sección 9).
- Solicitud de crédito: con autorización del cliente, envía o abre el formulario seguro (flujo ya decidido).

## 4. Clasificación y pase a asesor

Al final de cada conversación (y en cuanto se dispare una regla), el agente clasifica:

| Clasificación | Cuándo | Acción |
|---|---|---|
| **Resuelto** | Respondió todo y el cliente no pide más | Registra en el tablero |
| **Cita agendada** | Se reservó test drive, visita o servicio | Evento en el calendario del asesor y aviso a él |
| **Pase inmediato** | Cliente listo para comprar o apartar, pide a una persona, queja, negociación de precio | Aviso al asesor en el momento, con resumen |
| **Pase programado** | Fuera de horario o caso que no es urgente | Tarea para el siguiente día hábil, y se le dice al cliente cuándo lo contactan |
| **Sin oportunidad** | Spam, equivocado, proveedor | Se registra y no se avisa a nadie |

**Temperatura del prospecto** (para priorizar):

- **Caliente:** tiene auto elegido, enganche o forma de pago, y quiere verlo o comprar en los próximos 7 días.
- **Tibio:** sabe qué tipo de auto busca y su presupuesto, pero sin fecha.
- **Frío:** está explorando.

**A quién va cada caso** [CONFIRMAR con el equipo]:

| Tema | Asesor |
|---|---|
| Venta, test drive, garantías, servicio, entregas | Alan (vendedor de Fiesta Motors) |
| Trámites, placas, insurance, seguimiento de solicitud de crédito | Andrés Segovia |
| Tercer asesor | [CONFIRMAR nombre y temas] |
| Sin asignar o asesor no disponible | Rotación entre los disponibles |

**Resumen que recibe el asesor** (por WhatsApp interno o notificación del tablero): cliente, teléfono, idioma, auto de interés, qué preguntó, por qué se pasa, datos captados (enganche, pago deseado, trade-in, urgencia) y siguiente paso sugerido. El asesor nunca debe tener que preguntar de nuevo lo que el cliente ya dijo.

## 5. Base de conocimiento ("red neuronal")

Lo que describes —estudiar el sitio una vez a fondo, guardar todo y consultarlo cuando haga falta— se construye como una **base de conocimiento**, no entrenando una red neuronal. La diferencia importa:

- Entrenar un modelo es caro, tarda días, no se puede corregir un dato puntual y aun así puede inventar.
- Una base de conocimiento se arma en minutos, cada dato se puede corregir o borrar, el agente cita lo que encontró y, si algo no está, lo dice.

El resultado para el cliente es el mismo que buscas: el agente "conoce" todo el mundo de información de la compañía. Y es más barato, porque en cada respuesta solo carga los fragmentos que necesita, no todo el sitio.

**Cómo se construye:**

1. **Escaneo inicial completo** del sitio: todas las páginas, todas las fichas de inventario, formularios, políticas, reseñas y datos de contacto. Se usa un navegador automatizado, porque el inventario se carga con JavaScript.
2. **Se separa en dos tipos de información:**
   - **Datos estructurados** (tabla en Supabase): cada unidad con stock, VIN, año, marca, modelo, versión, km, precio, transmisión, tracción, color, estado y URL. El agente los consulta con filtros exactos ("SUV de menos de 30,000 con AWD"), sin margen para inventar.
   - **Conocimiento en texto** (índice semántico): políticas, procesos, requisitos, garantías, preguntas frecuentes y documentos internos que entregue el dealer.
3. **Documentos internos** que el sitio no tiene: lista de garantías, cargos, tabla de seguros, procesos de trámites, respuestas oficiales a las 30 preguntas más frecuentes [CONFIRMAR, los entrega el equipo].

**Actualización:**

| Qué | Cuándo | Cómo |
|---|---|---|
| Inventario | Automático cada noche, y también al presionar "Actualizar inventario" en el tablero | Solo procesa lo que cambió: unidades nuevas, vendidas o con precio distinto |
| Contenido del sitio y documentos | Cuando se indique desde el tablero | Re-escaneo completo y reemplazo de lo anterior |

Recomiendo que el inventario se actualice solo cada noche además de por indicación: es lo que más cambia, y ofrecer un auto ya vendido es el error que más daña la confianza. Antes de agendar una cita por una unidad específica, el agente confirma su disponibilidad en el sitio en vivo.

## 6. Acceso en tiempo real y efecto de "consultando"

- El agente responde desde la base de conocimiento, que contesta en milisegundos. Consultar el sitio en vivo en cada pregunta haría la llamada lenta y cara.
- Consulta en vivo solo para confirmar disponibilidad de una unidad antes de agendar o cuando el cliente pregunta por algo que no está en la base.
- **Efecto "En seguida te consigo la información…":** mientras corre una herramienta (búsqueda, cálculo, calendario), el agente dice una frase de espera y suena un audio corto de teclado. Verificar al configurar si ElevenLabs lo permite de forma nativa; si no, en el sitio se reproduce desde el widget, y en la línea telefónica hay que resolverlo en la configuración de voz.
- El efecto es una señal de "estoy trabajando"; el agente sigue diciendo que es un asistente de IA si el cliente lo pregunta.

## 7. Cálculo de pagos

- Entradas: precio de la unidad, HST 13 %, cargos [CONFIRMAR], enganche, valor de trade-in y plazo.
- Tasas: tres rangos según perfil de crédito (bueno, regular, en reconstrucción) [CONFIRMAR con su histórico].
- Salida: rango de pago mensual y quincenal (en Canadá es común pagar cada dos semanas), con los supuestos usados.
- Siempre: "es un estimado, el pago final depende de la aprobación de crédito".
- El cálculo lo hace una función, no el modelo de lenguaje, para que los números sean exactos.

## 8. Estimado de seguro

- Fuente: tabla con lo que han pagado sus clientes, por perfil (edad, años de licencia, historial, código postal y tipo de auto) [CONFIRMAR, la arma el equipo con su experiencia].
- Salida: rango mensual orientativo y la aclaración de que el precio real lo da la aseguradora o el broker.
- Siempre ofrece pasar con Andrés para una cotización formal.
- **A verificar:** en Ontario, cotizar seguros probablemente requiere licencia. Confirmar con su broker hasta dónde puede llegar el agente; la opción segura es "lo que suelen pagar clientes con un perfil parecido", nunca una cotización.

## 9. Agenda de citas

Las citas se crean en **Google Calendar** (no en Google Drive) de cada asesor [CONFIRMAR que usan Google Calendar].

- Tipos de cita y duración [CONFIRMAR]: test drive (45 min), visita para ver autos (30 min), firma y entrega (60 min), servicio (30 min).
- El agente consulta la disponibilidad real del asesor que corresponde y ofrece dos horarios.
- Respeta horario del dealer, tiempo entre citas y domingos solo con cita.
- El evento incluye cliente, teléfono, unidad de interés y resumen de la conversación.
- **Confirmación y recordatorios por WhatsApp:** al agendar, 24 horas antes y 2 horas antes, con opción de reagendar. Esto baja mucho las citas a las que el cliente no llega y no cuesta casi nada.
- Si el cliente cancela o reagenda por WhatsApp, el agente actualiza el calendario.

## 10. Tablero (embudo de ventas)

**Vista del dueño:**

- Conversaciones por día y por canal, y cuántas fueron fuera de horario.
- Porcentaje resuelto por el agente sin intervención humana.
- Horas de asesor ahorradas (estimado: conversaciones resueltas × tiempo promedio por atención [CONFIRMAR tiempo promedio con el registro de una semana]).
- Embudo: nuevo → calificado → cita agendada → asistió → solicitud de crédito → venta.
- Prospectos por temperatura y por asesor.
- Preguntas más frecuentes y temas sin respuesta (lo que hay que agregar a la base).
- **Unidades más preguntadas:** qué autos generan más interés y cuáles nadie pregunta. Es información de inventario que hoy no tienen.

**Vista del asesor:**

- Sus prospectos y citas del día, ordenados por temperatura.
- Ficha de cada prospecto con el historial completo de conversaciones (texto y transcripción de llamadas).
- Botón para marcar resultado (asistió, compró, perdido y por qué).

**Operación:**

- Botón "Actualizar inventario" y "Re-escanear sitio".
- Edición de la base de conocimiento: corregir una respuesta o agregar una nueva sin tocar código.

## 11. Arquitectura

```
Cliente ─┬─ Llamada ──► ElevenLabs (voz) ─┐
         ├─ Sitio ────► Widget ElevenLabs ─┤
         └─ WhatsApp ─► Backend (Claude API)┤
                                            ▼
                              Herramientas (funciones HTTP)
                                            │
        ┌───────────────┬───────────────┬───┴───────────┬────────────────┐
   Inventario      Conocimiento     Cálculos       Google Calendar    Supabase
   (Supabase)      (índice)         (pago/seguro)  (por asesor)       (prospectos,
                                                                       conversaciones)
                                            │
                                         Tablero
```

**Herramientas del agente** (las mismas para los tres canales):

| Herramienta | Qué hace |
|---|---|
| `buscar_inventario` | Filtra unidades por tipo, precio, año, marca, km, tracción |
| `ficha_unidad` | Datos completos de una unidad por stock o VIN |
| `confirmar_disponibilidad` | Consulta el sitio en vivo para una unidad |
| `buscar_conocimiento` | Políticas, requisitos, procesos, garantías |
| `calcular_pago` | Rango de pago mensual y quincenal |
| `estimar_seguro` | Rango orientativo de seguro |
| `ver_disponibilidad` | Horarios libres del asesor que corresponde |
| `agendar_cita` / `reagendar_cita` / `cancelar_cita` | Gestión en Google Calendar |
| `registrar_prospecto` | Crea o actualiza el prospecto en el embudo |
| `pasar_a_asesor` | Aviso con resumen, inmediato o programado |
| `enviar_solicitud_credito` | Envía o abre el formulario seguro |

**Recomendación técnica:** las herramientas que usa la voz deben ser funciones rápidas (por ejemplo, funciones de Supabase), no escenarios de Make. Cada paso por Make agrega segundos de silencio en la llamada, y el plan gratuito de 1,000 operaciones al mes no alcanza para un dealer con este volumen. Make queda para tareas sin prisa: notificaciones, reportes, sincronización nocturna.

## 12. Costos y consumo

- **La voz es lo más caro** (se cobra por minuto). Reglas: respuestas cortas, nada de leer listas largas, la solicitud de crédito va en formulario y no dictada.
- **Base de conocimiento en lugar de cargar todo el sitio** en cada respuesta: el contexto es pequeño.
- **Caché de instrucciones** para el prompt y las reglas, que se repiten en cada mensaje.
- **Modelo por tarea:** uno ligero para clasificar, resumir y registrar; el principal solo para la conversación.
- **Cálculos en funciones,** no en el modelo.
- **WhatsApp:** Meta cobra por conversación; las respuestas dentro de las 24 horas desde que el cliente escribe son las más baratas. Los recordatorios usan plantillas aprobadas.
- Tablero con el costo del mes por canal, para saber cuánto cuesta cada prospecto.

## 13. Privacidad y cumplimiento

- Al inicio de cada llamada: aviso de que habla con un asistente de IA y de que la llamada se graba [CONFIRMAR texto con ellos].
- El SIN y los datos sensibles nunca pasan por la conversación; van en el formulario (decidido).
- Transcripciones y datos de prospectos con acceso solo para el equipo de Fiesta Motors y tiempo de retención definido [CONFIRMAR].
- El agente no promete aprobaciones, no negocia precio, no cotiza seguros y no da asesoría legal ni financiera.
- Revisión del dealer sobre lo que dice el agente y su publicidad (OMVIC). No soy abogado; esto debe validarlo alguien de su lado.

## 14. Fases

| Fase | Entregable | Para |
|---|---|---|
| **Demo** | Escaneo de las 5 unidades y del sitio, widget del sitio con texto y voz, WhatsApp simulado con número de prueba, cálculo de pagos con valores de ejemplo, agenda en un calendario de prueba, tablero con datos de la demo | Presentación al dueño |
| **Piloto (4 semanas)** | Inventario completo con actualización nocturna, widget en el sitio real, WhatsApp simulado con los asesores como testers, calendarios reales de los 3 asesores, tablero en uso | Medir resultados reales |
| **Producción** | WhatsApp del negocio conectado, desvío de llamadas y luego línea completa atendida por el agente, base de conocimiento con documentos internos, estimado de seguro, recordatorios, reportes semanales | Operación diaria |
| **Después** | Pre-evaluación crediticia orientativa con su histórico, app de asesores | Ampliación |

## 15. Lo que hay que pedirle a Fiesta Motors

1. Confirmar que usan Google Calendar y acceso a los calendarios de los 3 asesores.
2. Nombre y temas del tercer asesor; quién recibe cada tipo de caso.
3. Tipos de cita y duración de cada una.
4. Garantías: tipos, cobertura, proveedor y costo.
5. Cargos adicionales al precio y plazos de financiamiento.
6. Rangos de tasa por perfil de crédito según su experiencia.
7. Tabla de lo que han pagado sus clientes de seguro, por perfil; y con su broker, qué puede decir el agente.
8. Las 30 preguntas más frecuentes con su respuesta oficial.
9. Tiempo promedio que les toma cada atención (para calcular horas ahorradas).
10. Si el WhatsApp actual es del negocio o personal, y quién controla la línea telefónica.
11. Si ZopDealer ofrece un feed o API de inventario (evitaría escanear el sitio cada noche).
12. Texto de aviso de grabación y política de retención de datos.
