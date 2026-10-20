# Análisis completo de woodbridge.fiestamotors.ca

Hecho el 2026-10-20 con Playwright (el sitio es de ZopDealer; inventario y formularios se cargan con JavaScript). Complementa `docs/conocimiento-sitio.md`. Todo lo citado es texto o dato publicado por el sitio; lo que es inferencia está marcado como tal.

## 1. Mapa del sitio, menús y botones

**Menú:** Home · Inventory (All Inventory, Book A Test Drive, Trade-In Appraisal) · Financing (Finance Department, Payment Calculator, Apply For Financing) · Service (Book A Service Appointment) · Dealership (About Us, Reviews, Contact us).
**Cabecera:** teléfono 416-855-6663 (Woodbridge), dirección, Facebook, Instagram.
**Pie:** View Inventory, Get Approved (/finance/), Book A Test Drive, Privacy Policy, Terms & Conditions, Site Map, "Powered by ZopDealer".
**Inicio:** buscador (año, marca, modelo; Search / Clear Search), cuatro accesos "Search By Bodystyle" (Sedan, SUV, Pickup, Mini-van), "Appraise My Trade", "Apply Now", "View Inventory", "Contact Us", "View All Inventory", texto "Welcome to Fiesta Motors", 8 reseñas, contacto con mapa de Google.
**No hay chat ni asistente** en el sitio. Carga scripts de CarGurus, Google Tag Manager y reCAPTCHA.

## 2. Inventario

- **111 unidades** en el selector de los formularios (años 2004 a 2025; 43 son 2020 o más nuevas). Marcas con más unidades: Volkswagen 13, Ford 13, Subaru 10, Honda 9, Jeep 8, Toyota 6, Audi 6, Hyundai 6.
- **Listado:** orden (reciente, precio, kilometraje, marca) y filtros por año, marca, modelo y tipo de carrocería. Carga por scroll.
- **Ficha de unidad** (URL `/inventory/{año-marca-modelo-versión}/{id interno}/`): VIN, stock, odómetro, carrocería, motor, color exterior e interior, transmisión, tracción, puertas, combustible, consumo ciudad y carretera, descripción, precio con "+ HST and Licensing". Botones: Request Information, Book A Test Drive, Apply For Financing, Window Sticker (se imprime).
- **Dos identificadores:** el stock (ej. 389D3B) y un id interno del sitio (ej. 2915). Los formularios usan el id interno.
- **El inventario cambia:** la Nissan Rogue del showroom (stock 1101824463) **ya no aparece** en las 111 unidades. HR-V, Crosstrek, Golf GTI y Silverado sí.

## 3. Calculadora de pagos

Campos (texto y deslizador): precio del vehículo (0 a 200,000; ejemplo 25,000), valor del trade-in, saldo del préstamo actual, enganche (todos 0 a 200,000, ejemplo 0), duración en meses (hasta 96; ejemplo 96), impuesto provincial (0 a 15 %; ejemplo 13), tasa esperada (0 a 15 %; ejemplo 3.99). Resultado: monto a financiar y pago mensual, quincenal y semanal.
- **Fórmula verificada:** financiado = precio × (1 + impuesto) − trade-in − enganche + saldo actual. Con los valores de ejemplo da $28,250.00. Pago = amortización estándar: mensual 12 pagos por año ($344.22), quincenal 26 ($158.75), semanal 52 ($79.37). Coincide al centavo.
- La tasa de 3.99 % es un valor de ejemplo del sitio, no una tasa confirmada.
- Aviso de la ficha: el estimado "no incluye impuestos, título, licencia ni registro"; los pagos son ilustrativos y el dealer confirma tasas reales.

## 4. Formularios (todos de ZopDealer, con reCAPTCHA y consentimiento para contacto por llamada, SMS, WhatsApp o correo)

| Formulario | Qué pide |
|---|---|
| **Test drive** (/render/6) | Unidad (lista de las 111), nombre, correo, teléfono, fecha, franja (Morning, Afternoon, Evening), mensaje |
| **Trade-in** (/render/4) | Año, marca, modelo, VIN, condición (Fair, Good, Very Good, Excellent), odómetro, datos de contacto, fecha y franja, mensaje |
| **Servicio** (/render/3) | Año, marca, modelo, odómetro, 14 servicios (Oil Change, Tire Rotation, Coolant Flush, Transmission Flush, Tire Balance, Air Conditioner Service, Filter Replacement, Front End Alignment, Replace / Adjust Brakes, Muffler / Exhaust Repair, Vehicle Checkup / Inspection, Electrical Service, Maintenance, Other), contacto, fecha y franja |
| **Contacto** (/render/2) | Nombre, correo, teléfono, mensaje |
| **Request Information** (ficha, /render/7) | Contacto y mensaje, ligado a la unidad |
| **Solicitud de crédito** (/render/5) | Ver abajo |

**Solicitud de crédito, lo que realmente piden:** datos personales (nombre, correo, tres teléfonos, **SIN**, **fecha de nacimiento**, estado civil, **número y vencimiento de licencia**); domicilio y situación de vivienda (Rent, Own, Own Free Clear, With Family, Other), renta o hipoteca, saldo y valor de la propiedad, tiempo en el domicilio y domicilio anterior; empleo (empleador, empleado o independiente, puesto, teléfono, ingreso bruto y frecuencia semanal, mensual o anual, antigüedad) y empleo anterior; otros ingresos; **co-solicitante** con los mismos datos y si tuvo bancarrota previa; trade-in (año, marca, modelo, VIN, km, color, gravamen y saldo, título limpio o "Branded / Salvage"); unidad de interés y mensaje. Incluye un consentimiento amplio para consultar buró de crédito.
- **Los formularios de test drive y crédito aceptan `?inventory_id=<id interno>`** y abren con la unidad ya elegida (verificado con 2915). El agente puede abrirlos así.

## 5. Datos del negocio

7515 Martin Grove Rd, Woodbridge ON L4L 9E4 · Ventas 416-855-6663 · Lunes a viernes 9:00 a 20:00, sábado 9:00 a 18:00, domingo solo con cita · Instagram @fiestamotorsgta · Facebook (perfil id 61566199373638) · mapa de Google.
**Brampton:** la descripción del sitio dice "Fiesta Motors in Woodbridge & Brampton, ON", pero no hay dirección ni horario de Brampton en ninguna página.

## 6. Reseñas (8, texto sin editar en /reviews/)

Temas que repiten: aprobación rápida incluso con mal crédito, primer auto, ayuda del vendedor, sin presión, transparencia en los cargos, mejor trato. Mencionan por nombre a **Alan, Emiliano y Andrés**. Una dice "guarantee approval" (promesa publicitaria, ver avisos).

## 7. Legal

Términos: anuncios informativos y no vinculantes, precios cambian sin aviso, financiamiento sujeto a financieras externas, autos "as is" salvo que se indique otra cosa. Privacidad: recopilan nombre, correo, teléfono y dirección; pueden borrar los datos si se piden, "sujeto a requisitos legales u operativos". No define plazo de retención.

## 8. Qué aporta al agente (por prioridad)

1. **Alinear la recolección con la solicitud real.** El agente pregunta ID canadiense, historial, score en rango, ingreso, empleo, enganche y trade-in. La solicitud real además pide: antigüedad en el empleo, situación y tiempo en la vivienda, otros ingresos, co-solicitante, y si el trade-in tiene gravamen. Conviene sumarlos como preguntas opcionales (agrandan el resumen que recibe el asesor y evitan repetir). SIN, fecha de nacimiento y licencia siguen solo en el formulario seguro.
2. **`calcular_pago` ya está definida.** La fórmula del sitio se puede replicar exacta (incluye HST y trade-in). Falta lo que el sitio no da: tasas reales por perfil y qué cargos suma el dealer [CONFIRMAR]. Hasta entonces, rango con "tasas de ejemplo".
3. **Inventario en vivo.** Hay 111 unidades y cambia: la Rogue del showroom ya no está. Hace falta sincronización nocturna o feed de ZopDealer, y `confirmar_disponibilidad` antes de agendar. Guardar los dos ids (stock e id interno) por unidad.
4. **Abrir formularios con la unidad elegida** con `?inventory_id=`: test drive y crédito sin que el cliente la vuelva a buscar.
5. **Chips de necesidad que reflejen el sitio:** Sedan, SUV, Pickup, Mini-van (hoy el showroom solo tiene SUV, hatchback y pickup).
6. **Servicio:** el sitio ya ofrece cita de servicio con 14 servicios. El agente puede orientar y abrir ese formulario; falta saber si el taller es del dealer o un tercero [CONFIRMAR].
7. **Franjas de cita:** el sitio solo maneja Morning, Afternoon, Evening, no horas exactas. El agente puede ofrecer esas franjas hasta tener calendario real.
8. **Reseñas como prueba social** (nombre y texto sin editar, con visto bueno de Alan), usando solo lo que dicen y nunca como promesa del agente.
9. **Consentimiento de contacto:** reutilizar el texto del sitio (llamada, SMS, WhatsApp, correo, con baja en cualquier momento) antes de capturar teléfono.
10. **Brampton:** confirmar si existe segunda sucursal; el prompt la tiene como [CONFIRMAR].

## 9. Avisos para el dealer

- **Publicidad (OMVIC):** "All types of credit… can qualify. No credit, no problem!" y la reseña con "guarantee approval". El agente no las repite.
- **Garantías:** "as is"; el agente no habla de garantías hasta que el dealer confirme.
- **Calculadora:** carga con cifras de ejemplo; un cliente podría tomarlas como reales.
- **Consentimiento de buró:** el párrafo de la solicitud autoriza consulta de crédito. El agente nunca lo recoge por chat; solo el formulario.
- **Datos sensibles:** el sitio pide SIN, fecha de nacimiento y licencia en un formulario de terceros (ZopDealer). Ya es el canal previsto para esos datos.

## 10. Faltantes que el sitio no resuelve (pedir al dealer)

Tasas por perfil y plazos permitidos, cargos adicionales (licencia, registro, administración), mínimos de las financieras, garantías, requisitos de documentos para comprar, financiar y registrar, política de trade-in, asesor del tercer puesto (¿Emiliano?, es una inferencia por las reseñas), reparto de temas por asesor, dirección y horario de Brampton, texto del aviso de grabación y retención de datos.
