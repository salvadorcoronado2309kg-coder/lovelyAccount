import { supabase } from './supabase';
import { CATALOGO_BASE, naturalezaDe } from './utesa';
import type { Borrador, Cuenta, Linea } from './contabilidad';

// Todas las funciones lanzan Error con un mensaje legible si Supabase falla.
function alFallar<T>(resultado: { data: T; error: { message: string } | null }): T {
  if (resultado.error) throw new Error(resultado.error.message);
  return resultado.data;
}

/* ---------- Asientos ---------- */

export async function guardarAsiento(empresaId: string, id: string | null, borrador: Borrador): Promise<string> {
  const resp = await supabase.rpc('guardar_asiento', {
    p_empresa: empresaId,
    p_id: id,
    p_fecha: borrador.fecha,
    p_concepto: borrador.concepto,
    p_lineas: borrador.lineas.map((l: Linea) => ({
      cuenta: l.c,
      debe: l.d,
      haber: l.h,
      rnc: l.rnc ?? '',
      ncf: l.ncf ?? '',
      tipo_bien: l.tipo ?? '',
    })),
  });
  return alFallar(resp) as string;
}

export async function borrarAsiento(id: string) {
  alFallar(await supabase.from('asientos').delete().eq('id', id));
}

/* ---------- Catálogo ---------- */

export async function cargarCatalogoBase(empresaId: string) {
  const filas = CATALOGO_BASE.map(c => ({
    empresa_id: empresaId,
    codigo: c.codigo,
    nombre: c.nombre,
    grupo: c.grupo,
    naturaleza: c.naturaleza,
    reguladora: c.reguladora,
    propia: false,
  }));
  // Si una cuenta ya existe, se respeta la versión de la empresa.
  alFallar(await supabase.from('cuentas').upsert(filas, { onConflict: 'empresa_id,codigo', ignoreDuplicates: true }));
}

export async function agregarCuenta(empresaId: string, codigo: string, nombre: string, grupo: string, reguladora: boolean) {
  alFallar(await supabase.from('cuentas').insert({
    empresa_id: empresaId,
    codigo,
    nombre,
    grupo,
    naturaleza: naturalezaDe(grupo, reguladora),
    reguladora,
    propia: true,
  }));
}

/* ---------- Empresa ---------- */

export async function guardarInventarioFinal(empresaId: string, valor: number | null) {
  alFallar(await supabase.from('empresas').update({ inventario_final: valor }).eq('id', empresaId));
}

/* ---------- Práctica guiada ---------- */

export async function cargarResueltos(empresaId: string): Promise<Set<number>> {
  const filas = alFallar(await supabase.from('practica_resueltos').select('ejercicio').eq('empresa_id', empresaId));
  return new Set((filas ?? []).map(f => Number(f.ejercicio)));
}

export async function marcarResuelto(empresaId: string, ejercicio: number) {
  alFallar(await supabase.from('practica_resueltos').upsert({ empresa_id: empresaId, ejercicio }));
}

/* ---------- 606 ---------- */

export interface Registro606 {
  fecha_comprobante: string;
  ncf: string;
  rnc_cedula: string;
  tipo_bien: string;
  monto_servicios: number;
  monto_bienes: number;
  itbis_facturado: number;
  estado: string;
}

// Importa las compras con NCF y RNC del período a registros_606. Devuelve cuántas se agregaron.
export async function generar606(empresaId: string, desde: string, hasta: string): Promise<number> {
  const n = await supabase.rpc('generar_606', { p_empresa: empresaId, p_desde: desde, p_hasta: hasta });
  return alFallar(n) as number;
}

export async function cargarRegistros606(empresaId: string, desde: string, hasta: string): Promise<Registro606[]> {
  const filas = alFallar(await supabase
    .from('registros_606')
    .select('fecha_comprobante,ncf,rnc_cedula,tipo_bien,monto_servicios,monto_bienes,itbis_facturado,estado')
    .eq('empresa_id', empresaId)
    .gte('fecha_comprobante', desde)
    .lte('fecha_comprobante', hasta)
    .order('fecha_comprobante'));
  return (filas ?? []).map(f => ({
    ...f,
    monto_servicios: Number(f.monto_servicios),
    monto_bienes: Number(f.monto_bienes),
    itbis_facturado: Number(f.itbis_facturado),
  }));
}

/* ---------- Respaldo ---------- */

interface RespaldoV2 {
  version: 2;
  empresa: string;
  cuentas: { codigo: string; nombre: string; grupo: string; reguladora: boolean }[];
  asientos: { fecha: string; concepto: string; lineas: { cuenta: string; debe: number; haber: number; rnc?: string; ncf?: string; tipo_bien?: string }[] }[];
}

// Formato de la app de práctica anterior (practica-contable-).
interface RespaldoV1 {
  empresa?: string;
  custom?: [string, string, string, number?][];
  entries?: { fecha: string; concepto: string; lineas: { c: string; d?: number; h?: number; rnc?: string; ncf?: string; tipo?: string }[] }[];
}

export function construirRespaldo(empresa: string, cuentas: Cuenta[], asientos: { fecha: string; concepto: string; lineas: Linea[] }[]): RespaldoV2 {
  return {
    version: 2,
    empresa,
    cuentas: cuentas.filter(c => c.propia).map(c => ({ codigo: c.codigo, nombre: c.nombre, grupo: c.grupo, reguladora: c.reguladora })),
    asientos: asientos.map(a => ({
      fecha: a.fecha,
      concepto: a.concepto,
      lineas: a.lineas.map(l => ({ cuenta: l.c, debe: l.d, haber: l.h, rnc: l.rnc, ncf: l.ncf, tipo_bien: l.tipo })),
    })),
  };
}

export interface RespaldoLeido {
  cuentas: { codigo: string; nombre: string; grupo: string; reguladora: boolean }[];
  asientos: Borrador[];
}

export function leerRespaldo(texto: string): RespaldoLeido {
  let o: RespaldoV1 & Partial<RespaldoV2>;
  try {
    o = JSON.parse(texto);
  } catch {
    throw new Error('Ese texto no es un respaldo válido. Pega o elige el archivo completo.');
  }

  if (Array.isArray(o.asientos)) {
    const cuentas = (o.cuentas ?? []).map(c => ({ codigo: c.codigo, nombre: c.nombre, grupo: c.grupo, reguladora: !!c.reguladora }));
    const asientos = o.asientos.map(a => ({
      fecha: a.fecha,
      concepto: a.concepto,
      lineas: a.lineas.map(l => ({ c: l.cuenta, d: Number(l.debe) || 0, h: Number(l.haber) || 0, rnc: l.rnc, ncf: l.ncf, tipo: l.tipo_bien })),
    }));
    return { cuentas, asientos: validar(asientos) };
  }

  if (Array.isArray(o.entries)) {
    const cuentas = (o.custom ?? []).map(([codigo, nombre, grupo, reg]) => ({ codigo, nombre, grupo, reguladora: reg === 1 }));
    const asientos = o.entries.map(a => ({
      fecha: a.fecha,
      concepto: a.concepto,
      lineas: a.lineas.map(l => ({ c: l.c, d: Number(l.d) || 0, h: Number(l.h) || 0, rnc: l.rnc, ncf: l.ncf, tipo: l.tipo })),
    }));
    return { cuentas, asientos: validar(asientos) };
  }

  throw new Error('Ese texto no es un respaldo válido. Pega o elige el archivo completo.');
}

function validar(asientos: Borrador[]): Borrador[] {
  asientos.forEach((a, i) => {
    if (!a.fecha || !a.concepto || a.lineas.length < 2) {
      throw new Error(`El asiento ${i + 1} del respaldo está incompleto.`);
    }
  });
  return asientos;
}

export async function restaurarRespaldo(
  empresaId: string,
  datos: RespaldoLeido,
  onProgreso: (hechos: number, total: number) => void,
) {
  if (datos.cuentas.length) {
    const filas = datos.cuentas.map(c => ({
      empresa_id: empresaId,
      codigo: c.codigo,
      nombre: c.nombre,
      grupo: c.grupo,
      naturaleza: naturalezaDe(c.grupo, c.reguladora),
      reguladora: c.reguladora,
      propia: true,
    }));
    alFallar(await supabase.from('cuentas').upsert(filas, { onConflict: 'empresa_id,codigo', ignoreDuplicates: true }));
  }
  for (const [i, a] of datos.asientos.entries()) {
    await guardarAsiento(empresaId, null, a);
    onProgreso(i + 1, datos.asientos.length);
  }
}
