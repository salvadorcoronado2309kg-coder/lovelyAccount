-- =====================================================================
-- LOVELYACCOUNT · práctica guiada, inventario final y permisos
-- Ejecutar después de 02_fiscal_606.sql
-- =====================================================================

-- Inventario final de mercancías (conteo físico) para el sistema periódico.
alter table public.empresas add column if not exists inventario_final numeric(15,2);

-- ---------- EJERCICIOS RESUELTOS (progreso de la práctica guiada) ----------
create table if not exists public.practica_resueltos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ejercicio int not null check (ejercicio >= 0),
  resuelto_at timestamptz not null default now(),
  primary key (empresa_id, ejercicio)
);

alter table public.practica_resueltos enable row level security;
drop policy if exists "practica_propia" on public.practica_resueltos;
create policy "practica_propia" on public.practica_resueltos
  for all using (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()));

-- Supabase da permisos por defecto a anon en tablas nuevas: se quitan.
revoke all on public.practica_resueltos from anon;
