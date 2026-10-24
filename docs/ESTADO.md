# Estado del proyecto

## Hecho

- Inicio de sesión (`/login`) y empresas por usuario (`/empresas`). Al crear una empresa se carga el catálogo UTESA.
- Diario con partida doble, edición y eliminación de asientos (`/diario?id=`). Campos RNC, NCF y tipo de bien para 606/607.
- Práctica guiada con 15 transacciones, comprobación, solución y paso al diario. El progreso se guarda por empresa (`/practica?id=`).
- Mayor en cuentas T (`/mayor?id=`).
- Balanza de comprobación, estado de resultados y balance general (`/estados?id=`). Inventario final para el sistema periódico. Asientos de cierre.
- Catálogo de cuentas por empresa, con cuentas propias y carga del catálogo UTESA si falta (`/catalogo?id=`).
- Formato 606 y 607 (`/fiscal?id=`): exportación CSV y Excel desde el diario; guardado del 606 en la base con `generar_606`.
- Respaldo en JSON y restauración. Acepta respaldos de esta app y de la práctica contable anterior (`/respaldo?id=`).
- Exportación a Excel (SheetJS) y PDF (jsPDF) desde Estados.
- Lógica contable verificada con los datos de la práctica: los ejercicios cuadran, la balanza y el balance cuadran, y los cierres dejan en cero las cuentas de resultado.

## Pendiente para el usuario

- Ejecutar en Supabase, en orden: `supabase/01_base.sql`, `supabase/02_fiscal_606.sql` y `supabase/03_practica_estados.sql` (nuevo).
- Secretos de GitHub `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y Pages con fuente "GitHub Actions".
- En Supabase, poner la URL de Pages como *Site URL*.
- Rotar las claves que aparecieron en capturas de pantalla.
- Revisión de un contador sobre las tasas de retención, la clasificación fiscal y los montos del 606/607 antes de un lanzamiento público.
- Revisión legal sobre protección de datos (Ley 172-13) antes de abrirla a más usuarios.

## Pendiente de desarrollo

- Integrar el Formato 606 de `Hello` (decidir con el usuario).
- Fases 2 a 4 del roadmap: kárdex, nómina, activos fijos, conciliación bancaria, flujos de efectivo, cierre de período.
- Tutor con IA, roles y compartir.
- Actualizar Next.js: `next@15.3.3` tiene una vulnerabilidad publicada (CVE-2025-66478); hay que subir a una versión parcheada de la rama 15.

## Notas técnicas

- Los montos llegan de Supabase como texto (numeric); `src/lib/useEmpresa.ts` los convierte a número.
- La lógica contable está en `src/lib/contabilidad.ts` y no depende de React, para poder probarla sin navegador.
- Verificación local: `npx tsc --noEmit` y `npm run build` (con las variables `NEXT_PUBLIC_SUPABASE_*` definidas) compilan sin errores.
