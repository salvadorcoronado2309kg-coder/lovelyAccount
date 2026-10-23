-- =====================================================================
-- PRÁCTICA CONTABLE · esquema multi-empresa con seguridad por usuario
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- EMPRESAS (cada usuario puede tener varias) ----------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  rnc text check (rnc is null or rnc ~ '^[0-9]{9}$' or rnc ~ '^[0-9]{11}$'),
  regimen_itbis text not null default 'GRAVADO_TOTAL'
    check (regimen_itbis in ('EXENTO','GRAVADO_TOTAL','PROPORCIONAL')),
  modo text not null default 'practica' check (modo in ('practica','real')),
  created_at timestamptz not null default now()
);
create index if not exists empresas_owner_idx on public.empresas(owner_id);

-- ---------- CATÁLOGO DE CUENTAS (propio de cada empresa) ----------
create table if not exists public.cuentas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null check (length(trim(codigo)) > 0),
  nombre text not null check (length(trim(nombre)) > 0),
  grupo text not null,
  naturaleza char(1) not null check (naturaleza in ('D','C')),
  reguladora boolean not null default false,
  propia boolean not null default false,
  unique (empresa_id, codigo)
);
create index if not exists cuentas_empresa_idx on public.cuentas(empresa_id);

-- ---------- ASIENTOS ----------
create table if not exists public.asientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  fecha date not null,
  concepto text not null check (length(trim(concepto)) > 0),
  ejemplo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists asientos_empresa_fecha_idx on public.asientos(empresa_id, fecha);

-- ---------- LÍNEAS DE ASIENTO ----------
-- rnc_tercero, ncf y tipo_bien son opcionales: sirven para generar el 606 y el 607.
create table if not exists public.lineas_asiento (
  id uuid primary key default gen_random_uuid(),
  asiento_id uuid not null references public.asientos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  orden int not null default 0,
  cuenta_codigo text not null,
  debe numeric(15,2) not null default 0 check (debe >= 0),
  haber numeric(15,2) not null default 0 check (haber >= 0),
  rnc_tercero text check (rnc_tercero is null or rnc_tercero ~ '^[0-9]{9}$' or rnc_tercero ~ '^[0-9]{11}$'),
  ncf text,
  tipo_bien text check (tipo_bien is null or tipo_bien ~ '^(0[1-9]|1[01])$'),
  -- cada línea va en un solo lado
  check ((debe > 0 and haber = 0) or (haber > 0 and debe = 0))
);
create index if not exists lineas_asiento_idx on public.lineas_asiento(asiento_id);
create index if not exists lineas_empresa_idx on public.lineas_asiento(empresa_id);

-- ---------- PARTIDA DOBLE: cada asiento debe cuadrar y tener al menos dos líneas ----------
create or replace function public.validar_partida_doble()
returns trigger language plpgsql as $$
declare
  aid uuid;
  d numeric;
  h numeric;
  n int;
begin
  aid := coalesce(new.asiento_id, old.asiento_id);
  select coalesce(sum(debe),0), coalesce(sum(haber),0), count(*)
    into d, h, n
    from public.lineas_asiento where asiento_id = aid;
  if n = 0 then return null; end if;  -- el asiento se está borrando completo
  if n < 2 or d <> h or d = 0 then
    raise exception 'El asiento no cuadra (debe %, haber %, líneas %)', d, h, n;
  end if;
  return null;
end $$;

drop trigger if exists lineas_cuadran on public.lineas_asiento;
create constraint trigger lineas_cuadran
  after insert or update or delete on public.lineas_asiento
  deferrable initially deferred
  for each row execute function public.validar_partida_doble();

-- ---------- FUNCIÓN PARA GUARDAR UN ASIENTO EN UNA SOLA TRANSACCIÓN ----------
-- p_lineas: [{"cuenta":"1000-03","debe":100,"haber":0,"rnc":"","ncf":"","tipo_bien":""}, ...]
create or replace function public.guardar_asiento(
  p_empresa uuid,
  p_id uuid,
  p_fecha date,
  p_concepto text,
  p_lineas jsonb
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  aid uuid := coalesce(p_id, gen_random_uuid());
  l jsonb;
  i int := 0;
begin
  if not exists (select 1 from empresas where id = p_empresa and owner_id = auth.uid()) then
    raise exception 'No autorizado para esta empresa';
  end if;

  if p_id is null then
    insert into asientos (id, empresa_id, fecha, concepto)
    values (aid, p_empresa, p_fecha, p_concepto);
  else
    if not exists (select 1 from asientos where id = p_id and empresa_id = p_empresa) then
      raise exception 'El asiento no pertenece a esta empresa';
    end if;
    update asientos set fecha = p_fecha, concepto = p_concepto, ejemplo = false
     where id = p_id and empresa_id = p_empresa;
    delete from lineas_asiento where asiento_id = p_id;
  end if;

  for l in select * from jsonb_array_elements(p_lineas) loop
    i := i + 1;
    insert into lineas_asiento
      (asiento_id, empresa_id, orden, cuenta_codigo, debe, haber, rnc_tercero, ncf, tipo_bien)
    values (
      aid, p_empresa, i,
      l->>'cuenta',
      coalesce((l->>'debe')::numeric, 0),
      coalesce((l->>'haber')::numeric, 0),
      nullif(l->>'rnc', ''),
      nullif(l->>'ncf', ''),
      nullif(l->>'tipo_bien', '')
    );
  end loop;
  return aid;
end $$;

-- ---------- SEGURIDAD: cada usuario solo ve y cambia sus propios datos ----------
alter table public.empresas enable row level security;
alter table public.cuentas enable row level security;
alter table public.asientos enable row level security;
alter table public.lineas_asiento enable row level security;

drop policy if exists "empresas_propias" on public.empresas;
create policy "empresas_propias" on public.empresas
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "cuentas_propias" on public.cuentas;
create policy "cuentas_propias" on public.cuentas
  for all using (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()));

drop policy if exists "asientos_propios" on public.asientos;
create policy "asientos_propios" on public.asientos
  for all using (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()));

drop policy if exists "lineas_propias" on public.lineas_asiento;
create policy "lineas_propias" on public.lineas_asiento
  for all using (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()));

-- Nadie fuera de la sesión autenticada puede leer ni escribir.
revoke all on all tables in schema public from anon;
revoke all on function public.guardar_asiento(uuid, uuid, date, text, jsonb) from anon;
