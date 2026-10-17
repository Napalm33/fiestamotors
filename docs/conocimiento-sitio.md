# Lo que dice el sitio de Fiesta Motors (para la base de conocimiento del agente)

Examinado el 2026-10-17 con Playwright en https://woodbridge.fiestamotors.ca/. Texto crudo sin editar; los avisos van al final. El backend/base de conocimiento es otro proyecto: esto es su insumo.

## Páginas (mapa del sitio)
Inicio, Inventario (`/inventory/`), Financiamiento (`/finance-department/` y solicitud en `/finance/`), Valuación de trade-in (`/trade-in-appraisal/`), Nosotros (`/about-us/`), Reseñas (`/reviews/`), Test drive (`/book-a-test-drive/`), **Cita de servicio** (`/book-an-appointment/`), Contacto (`/contact-us/`), Privacidad, Términos, Mapa del sitio. El sitio lo mantiene ZopDealer.

## Datos del negocio (coinciden con el prompt del agente)
- 7515 Martin Grove Rd, Woodbridge, ON L4L 9E4. Ventas: 416-855-6663.
- Lunes a viernes 9:00 a 20:00; sábado 9:00 a 18:00; domingo solo con cita.
- Instagram: fiestamotorsgta.

## Financiamiento (texto del sitio)
- "All types of credit, from good to bad, can qualify for an auto loan. No credit, no problem!"
- Ayudan a refinanciar o ajustar el plazo de un préstamo existente.
- Flujo: calculadora en línea, luego solicitud de crédito; un representante contacta al cliente.
- Calculadora (`/payment-calculator/`): precio, valor del trade-in, saldo de préstamo actual, enganche, duración, impuesto provincial y tasa esperada; da pago mensual, quincenal y semanal. Llega precargada con cifras de ejemplo.

## Trade-in y citas
- Trade-in: herramienta de estimación con datos de "socios líderes de la industria".
- Test drive y cita de servicio: formularios; un representante confirma fecha y hora.

## Términos y condiciones (relevante para el agente)
- Los anuncios son informativos, no una oferta vinculante; los precios cambian sin aviso; no garantizan que los listados sean exactos.
- El financiamiento depende de la aprobación de financieras externas.
- Los autos se venden "as is" salvo que se indique otra cosa; sin garantías expresas ni implícitas sobre condición o durabilidad.
- Privacidad: pueden pedir que se borren sus datos personales ("subject to legal or operational requirements").

## Reseñas
8 reseñas en el sitio, mencionan a Alan, Emiliano y Andrés. Texto completo en `/reviews/`; irán a `data/reviews.json` sin editar (fase 6).

## Avisos para Alan (decisiones del dealer, no mías)
1. **Publicidad (OMVIC):** el sitio dice "All types of credit… can qualify" y una reseña dice "fiesta motors is a guarantee approval". El agente no repite promesas de aprobación (regla del prompt); conviene que el dealer revise esos textos y que Alan decida si la reseña se muestra tal cual.
2. **Garantías:** los términos dicen "as is" y el prompt tiene garantías como [CONFIRMAR]. Hasta que el dealer responda, el agente no debe hablar de garantías: ofrece pasar con un asesor.
3. **Precios:** el sitio dice que cambian sin aviso; el agente debe decir que el precio publicado lo confirma un asesor antes de agendar.
4. **Falta en el sitio:** segunda sucursal, cargos adicionales, tasas, tipos y duración de citas, requisitos de documentos. No aparecen, así que siguen pendientes con el dealer.
5. **Inventario:** el sitio lista unos 120 autos por JavaScript (Volkswagen 13, Ford 12, Honda 10, Subaru 10, etc.). La extracción de las 5 unidades sigue en la fase 1.
