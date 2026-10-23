# LovelyAccount

Herramienta contable para aprender y para trabajar: partida doble, mayor, estados financieros, y formatos fiscales de la DGII (606 y 607).

## Estructura

- `docs/VISION.md`: para quién es la app y sus principios.
- `docs/ROADMAP.md`: fases de desarrollo.
- `docs/ESTADO.md`: qué está hecho y qué falta.
- `supabase/01_base.sql`: empresas, catálogo, asientos y seguridad por usuario.
- `supabase/02_fiscal_606.sql`: registros 606 y función `generar_606`.

## Puesta en marcha de la base de datos

1. Crear un proyecto en Supabase.
2. En **SQL Editor**, ejecutar `supabase/01_base.sql` y luego `supabase/02_fiscal_606.sql`.

Los formatos fiscales son borrador: deben validarse con un contador antes de presentarse.

## Ejecutar la app

1. `npm install`
2. Copia `.env.example` a `.env.local` y llena las dos variables de Supabase.
3. `npm run dev` y abre `http://localhost:3000`.
