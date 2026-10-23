'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { ordenCodigo, type Asiento, type Cuenta } from './contabilidad';

export interface Empresa {
  id: string;
  nombre: string;
  rnc: string | null;
  regimen_itbis: string;
  inventario_final: number | null;
}

interface FilaAsiento {
  id: string;
  fecha: string;
  concepto: string;
  ejemplo: boolean;
  lineas_asiento: {
    cuenta_codigo: string;
    debe: number | string;
    haber: number | string;
    rnc_tercero: string | null;
    ncf: string | null;
    tipo_bien: string | null;
    orden: number;
  }[];
}

// PostgREST devuelve los numeric como texto; aquí se convierten a número.
function aAsiento(f: FilaAsiento): Asiento {
  return {
    id: f.id,
    fecha: f.fecha,
    concepto: f.concepto,
    ejemplo: f.ejemplo,
    lineas: [...f.lineas_asiento]
      .sort((x, y) => x.orden - y.orden)
      .map(l => ({
        c: l.cuenta_codigo,
        d: Number(l.debe),
        h: Number(l.haber),
        rnc: l.rnc_tercero ?? '',
        ncf: l.ncf ?? '',
        tipo: l.tipo_bien ?? '',
      })),
  };
}

// Carga una empresa con su catálogo y sus asientos. Si no hay sesión, manda a /login.
export function useEmpresa(id: string) {
  const router = useRouter();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!id) {
      setError('Falta la empresa. Vuelve a Mis empresas.');
      setCargando(false);
      return;
    }
    const [e, c, a] = await Promise.all([
      supabase.from('empresas').select('id,nombre,rnc,regimen_itbis,inventario_final').eq('id', id).maybeSingle(),
      supabase.from('cuentas').select('codigo,nombre,grupo,naturaleza,reguladora,propia').eq('empresa_id', id),
      supabase
        .from('asientos')
        .select('id,fecha,concepto,ejemplo,lineas_asiento(cuenta_codigo,debe,haber,rnc_tercero,ncf,tipo_bien,orden)')
        .eq('empresa_id', id)
        .order('fecha')
        .order('created_at'),
    ]);
    const fallo = e.error ?? c.error ?? a.error;
    if (fallo) {
      setError(fallo.message);
      setCargando(false);
      return;
    }
    if (!e.data) {
      setError('No encontramos esta empresa.');
      setCargando(false);
      return;
    }
    const emp = e.data as Omit<Empresa, 'inventario_final'> & { inventario_final: number | string | null };
    setEmpresa({ ...emp, inventario_final: emp.inventario_final == null ? null : Number(emp.inventario_final) });
    setCuentas(((c.data ?? []) as Cuenta[]).sort((x, y) => ordenCodigo(x.codigo, y.codigo)));
    setAsientos(((a.data ?? []) as unknown as FilaAsiento[]).map(aAsiento));
    setError(null);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      await recargar();
    })();
  }, [recargar, router]);

  return { empresa, cuentas, asientos, cargando, error, recargar, setError };
}
