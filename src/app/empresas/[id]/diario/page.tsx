'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Cuenta { codigo: string; nombre: string; grupo: string; naturaleza: 'D' | 'C' }
interface LineaBD { cuenta_codigo: string; debe: number; haber: number; orden: number }
interface Asiento { id: string; fecha: string; concepto: string; lineas_asiento: LineaBD[] }
interface Linea { cuenta: string; debe: string; haber: string }

const hoy = () => new Date().toISOString().slice(0, 10);
const numero = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DiarioPage() {
  const { id: empresaId } = useParams<{ id: string }>();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // formulario
  const [fecha, setFecha] = useState(hoy());
  const [concepto, setConcepto] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([
    { cuenta: '', debe: '', haber: '' },
    { cuenta: '', debe: '', haber: '' },
  ]);

  // nueva cuenta
  const [nCodigo, setNCodigo] = useState('');
  const [nNombre, setNNombre] = useState('');
  const [nGrupo, setNGrupo] = useState('');
  const [nNat, setNNat] = useState<'D' | 'C'>('D');

  const cargar = useCallback(async () => {
    const [c, a] = await Promise.all([
      supabase.from('cuentas').select('codigo,nombre,grupo,naturaleza').eq('empresa_id', empresaId).order('codigo'),
      supabase.from('asientos')
        .select('id,fecha,concepto,lineas_asiento(cuenta_codigo,debe,haber,orden)')
        .eq('empresa_id', empresaId).order('fecha', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (c.error) return setError(c.error.message);
    if (a.error) return setError(a.error.message);
    setCuentas((c.data ?? []) as Cuenta[]);
    setAsientos((a.data ?? []) as unknown as Asiento[]);
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalDebe = lineas.reduce((s, l) => s + numero(l.debe), 0);
  const totalHaber = lineas.reduce((s, l) => s + numero(l.haber), 0);
  const cuadra = totalDebe > 0 && Math.abs(totalDebe - totalHaber) < 0.005;

  function setLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas(ls => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);
    if (!concepto.trim()) return setError('Escribe el concepto del asiento.');
    const validas = lineas.filter(l => l.cuenta || l.debe || l.haber);
    if (validas.length < 2) return setError('Un asiento necesita al menos dos líneas.');
    for (const l of validas) {
      if (!l.cuenta) return setError('Cada línea debe tener cuenta.');
      const d = numero(l.debe), h = numero(l.haber);
      if ((d > 0) === (h > 0)) return setError(`En la cuenta ${l.cuenta} escribe monto solo en Debe o solo en Haber.`);
    }
    if (!cuadra) return setError(`No cuadra: Debe ${fmt(totalDebe)} y Haber ${fmt(totalHaber)}.`);

    setGuardando(true);
    const { error } = await supabase.rpc('guardar_asiento', {
      p_empresa: empresaId,
      p_id: null,
      p_fecha: fecha,
      p_concepto: concepto.trim(),
      p_lineas: validas.map(l => ({ cuenta: l.cuenta, debe: numero(l.debe), haber: numero(l.haber) })),
    });
    setGuardando(false);
    if (error) return setError(error.message);
    setOk('Asiento guardado.');
    setConcepto('');
    setLineas([{ cuenta: '', debe: '', haber: '' }, { cuenta: '', debe: '', haber: '' }]);
    cargar();
  }

  async function agregarCuenta(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setError('Tu sesión venció. Entra de nuevo.');
    if (!nCodigo.trim() || !nNombre.trim() || !nGrupo.trim()) return setError('Código, nombre y grupo son obligatorios.');
    const { error } = await supabase.from('cuentas').insert({
      empresa_id: empresaId, codigo: nCodigo.trim(), nombre: nNombre.trim(),
      grupo: nGrupo.trim(), naturaleza: nNat, propia: true,
    });
    if (error) return setError(error.message);
    setNCodigo(''); setNNombre(''); setNGrupo('');
    cargar();
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <p><Link href="/empresas">← Empresas</Link></p>
      <h1 style={{ fontSize: '1.4rem' }}>Diario</h1>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {ok && <p style={{ color: '#166534' }}>{ok}</p>}

      <form onSubmit={guardar} style={{ display: 'grid', gap: 10, border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Nuevo asiento</h2>
        {cuentas.length === 0 && <p style={{ margin: 0 }}>Primero agrega cuentas en el catálogo de abajo.</p>}
        <label>Fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ width: '100%', padding: 8, color: '#111827', background: '#fff' }} />
        </label>
        <label>Concepto
          <input value={concepto} onChange={e => setConcepto(e.target.value)}
            style={{ width: '100%', padding: 8, color: '#111827', background: '#fff' }} />
        </label>

        <datalist id="cuentas-lista">
          {cuentas.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
        </datalist>

        {lineas.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 6 }}>
            <input list="cuentas-lista" placeholder="Cuenta" value={l.cuenta}
              onChange={e => setLinea(i, 'cuenta', e.target.value)}
              style={{ padding: 8, color: '#111827', background: '#fff' }} />
            <input placeholder="Debe" inputMode="decimal" value={l.debe}
              onChange={e => setLinea(i, 'debe', e.target.value)}
              style={{ padding: 8, color: '#111827', background: '#fff' }} />
            <input placeholder="Haber" inputMode="decimal" value={l.haber}
              onChange={e => setLinea(i, 'haber', e.target.value)}
              style={{ padding: 8, color: '#111827', background: '#fff' }} />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setLineas(ls => [...ls, { cuenta: '', debe: '', haber: '' }])}>+ Línea</button>
          <span style={{ color: cuadra ? '#166534' : '#b91c1c' }}>
            Debe {fmt(totalDebe)} · Haber {fmt(totalHaber)} {cuadra ? '✓ cuadra' : ''}
          </span>
        </div>
        <button type="submit" disabled={guardando || cuentas.length === 0} style={{ padding: 12 }}>
          {guardando ? 'Guardando…' : 'Guardar asiento'}
        </button>
      </form>

      <h2 style={{ fontSize: '1.05rem', marginTop: 24 }}>Asientos</h2>
      {asientos.length === 0 && <p>Aún no hay asientos.</p>}
      {asientos.map(a => (
        <div key={a.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{a.fecha}</div>
          <strong>{a.concepto}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.9rem' }}>
            {[...a.lineas_asiento].sort((x, y) => x.orden - y.orden).map((l, i) => (
              <li key={i}>
                {l.cuenta_codigo} {l.debe > 0 ? `Debe ${fmt(l.debe)}` : `Haber ${fmt(l.haber)}`}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form onSubmit={agregarCuenta} style={{ display: 'grid', gap: 8, border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginTop: 24 }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Catálogo de cuentas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 6 }}>
          <input placeholder="Código (ej. 1000-03)" value={nCodigo} onChange={e => setNCodigo(e.target.value)}
            style={{ padding: 8, color: '#111827', background: '#fff' }} />
          <input placeholder="Nombre" value={nNombre} onChange={e => setNNombre(e.target.value)}
            style={{ padding: 8, color: '#111827', background: '#fff' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <input placeholder="Grupo (ej. Activo corriente)" value={nGrupo} onChange={e => setNGrupo(e.target.value)}
            style={{ padding: 8, color: '#111827', background: '#fff' }} />
          <select value={nNat} onChange={e => setNNat(e.target.value as 'D' | 'C')}
            style={{ padding: 8, color: '#111827', background: '#fff' }}>
            <option value="D">Naturaleza deudora</option>
            <option value="C">Naturaleza acreedora</option>
          </select>
        </div>
        <button type="submit" style={{ padding: 10 }}>Agregar cuenta</button>
        <ul style={{ fontSize: '0.9rem', paddingLeft: 18, margin: 0 }}>
          {cuentas.map(c => <li key={c.codigo}>{c.codigo} · {c.nombre}</li>)}
        </ul>
      </form>
    </main>
  );
}
