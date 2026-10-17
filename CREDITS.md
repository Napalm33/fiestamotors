# Créditos

Assets con licencia usados en el proyecto. Cada entrada: nombre, autor, licencia, fuente.

## Modelos 3D (marcadores, ilustrativos)
- **VW Golf GTI (unidad 42F304):** "2024 Volkswagen Golf GTI" de Ddiaz Design (Sketchfab, https://sketchfab.com/3d-models/2024-volkswagen-golf-gti-97d5cd2cde504393b7e19b69b9cadff4), licencia **CC BY-NC-SA 4.0**. **NO permite uso comercial.** Solo para evaluación interna; no está en el repo (`.gitignore`). Para publicarlo hace falta permiso o licencia comercial del autor, o reemplazarlo por un modelo con licencia CC0 / CC BY / de pago. Se optimizó (Draco, texturas a 1024) y se recoloreó la pintura y los rines por código.
- Los demás autos del garaje usan un modelo esquemático generado en código (`src/showroom/cars.js`), sin assets de terceros.
- Alan comprará los modelos definitivos (mismo modelo, generación y color).

## Código de terceros
- three.js (MIT), incluye los decodificadores Draco de `public/draco/` (Apache-2.0, Google).
- GSAP 3.12.5 (licencia estándar de GSAP), Lenis (MIT).

## Nissan Rogue 2022 (modelo de prueba)
- Origen: archivo compartido por Alan en Drive (`3D_models/2022_nissan_rogue.glb`). Licencia **pendiente de confirmar** (falta el enlace de Sketchfab). Mientras tanto el `.glb` está en `.gitignore` y no se publica. Materiales reasignados por nombre (el archivo venía sin colores) y pintura recoloreada a rojo; geometría simplificada.

## Chevrolet Silverado 1500 RST 2020 (modelo de prueba)
- Origen: `3D_models/2020_chevrolet_silverado_1500_rst.glb` compartido por Alan en Drive. Licencia **pendiente de confirmar** (falta el enlace de Sketchfab); el `.glb` optimizado está en `.gitignore`. Se oscureció la parrilla para parecerse a la versión WT; la pintura se recolorea a blanco.

## Fotos recortadas (HR-V, Crosstrek)
- `public/photos/cutouts/*.webp`: recortes de las fotos de estudio del inventario del dealer, usados como marcador ilustrativo hasta tener el modelo 3D. **Confirmar con el dealer el derecho a usar esas fotos.**
