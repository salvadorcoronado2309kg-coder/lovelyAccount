-- =====================================================================
-- LOVELYACCOUNT · registros fiscales (606 compras y 607 ventas)
-- Ejecutar después de 01_base.sql
-- Los montos y la clasificación de bienes y servicios son borrador:
-- deben validarse con un contador antes de presentarse.
-- =====================================================================

create table if not exists public.registros_606 (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  asiento_id uuid references public.asientos(id) on delete set null,
  rnc_cedula text not null check (rnc_cedula ~ '^[0-9]{9}$' or rnc_cedula ~ '^[0-9]{11}$'),
  tipo_id smallint not null check (tipo_id in (1, 2)),
  tipo_bien text not null check (tipo_bien ~ '^(0[1-9]|1[01])$'),
  ncf text not null check (ncf ~ '^[BE][0-9]{10,12}$'),
  ncf_modificado text,
  fecha_comprobante date not null,
  fecha_pago date,
  monto_servicios numeric(15,2) not null default 0 check (monto_servicios >= 0),
  monto_bienes numeric(15,2) not null default 0 check (monto_bienes >= 0),
  itbis_facturado numeric(15,2) not null default 0 check (itbis_facturado >= 0),
  itbis_retenido numeric(15,2) not null default 0 check (itbis_retenido >= 0),
  itbis_costo numeric(15,2) not null default 0 check (itbis_costo >= 0),
  itbis_adelantar numeric(15,2) not null default 0 check (itbis_adelantar >= 0),
  tipo_retencion_isr text,
  monto_retencion_isr numeric(15,2) not null default 0 check (monto_retencion_isr >= 0),
  isc numeric(15,2) not null default 0,
  otros_impuestos numeric(15,2) not null default 0,
  propina_legal numeric(15,2) not null default 0,
  forma_pago text not null default '02' check (forma_pago ~ '^(0[1-7])$'),
  concepto text,
  estado text not null default 'pendiente' check (estado in ('pendiente','validado','rechazado','reportado')),
  creado_at timestamptz not null default now()
);
create index if not exists registros_606_empresa_idx on public.registros_606(empresa_id, fecha_comprobante);
create unique index if not exists registros_606_ncf_unico on public.registros_606(empresa_id, rnc_cedula, ncf);

alter table public.registros_606 enable row level security;
drop policy if exists "606_propios" on public.registros_606;
create policy "606_propios" on public.registros_606
  for all using (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = auth.uid()));

-- Importa las compras de un período desde el diario. Todo o nada.
-- Solo toma líneas con NCF y RNC; el ITBIS se toma de la cuenta 1008 del mismo asiento.
create or replace function public.generar_606(p_empresa uuid, p_desde date, p_hasta date)
returns int language plpgsql security invoker set search_path = public as $$
declare
  n int := 0;
begin
  if not exists (select 1 from empresas where id = p_empresa and owner_id = auth.uid()) then
    raise exception 'No autorizado para esta empresa';
  end if;

  insert into registros_606 (empresa_id, asiento_id, rnc_cedula, tipo_id, tipo_bien, ncf,
    fecha_comprobante, monto_servicios, monto_bienes, itbis_facturado, concepto)
  select
    p_empresa, a.id, l.rnc_tercero,
    case when length(l.rnc_tercero) = 9 then 1 else 2 end,
    coalesce(l.tipo_bien, '02'),
    l.ncf, a.fecha,
    case when l.tipo_bien in ('04','09','10') then 0 else l.debe end,
    case when l.tipo_bien in ('04','09','10') then l.debe else 0 end,
    coalesce((select sum(x.debe) from lineas_asiento x where x.asiento_id = a.id and x.cuenta_codigo = '1008'), 0),
    a.concepto
  from asientos a
  join lineas_asiento l on l.asiento_id = a.id
  where a.empresa_id = p_empresa
    and a.fecha between p_desde and p_hasta
    and l.debe > 0
    and l.ncf is not null
    and l.rnc_tercero is not null
    and (l.cuenta_codigo ~ '^(5|6)' or l.cuenta_codigo ~ '^12')
  on conflict (empresa_id, rnc_cedula, ncf) do nothing;

  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.generar_606(uuid, date, date) from anon;
