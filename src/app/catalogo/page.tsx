'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import { useEmpresa } from '@/lib/useEmpresa';
import { agregarCuenta, cargarCatalogoBase } from '@/lib/datos';
import { CLASES, GRUPOS } from '@/lib/utesa';
import type { Cuenta } from '@/lib/contabilidad';

function Catalogo() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, cuentas, error, recargar, setError } = useEmpresa(id);
  const [q, setQ] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombreNueva, setNombreNueva] = useState('');
  const [grupo, setGrupo] = useState('AC');
  const [reguladora, setReguladora] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const tieneBase = cuentas.some(c => !c.propia);
  const filtro = q.trim().toLowerCase();
  const visibles = cuentas.filter(c => !filtro || c.codigo.toLowerCase().includes(filtro) || c.nombre.toLowerCase().includes(filtro));

  // Agrupa por clase y grupo, en el mismo orden que el catálogo base.
  const bloques: ReactNode[] = [];
  let claseActual = '';
  for (const [g, info] of Object.entries(GRUPOS)) {
    const lista = visibles.filter(c => c.grupo === g);
    if (!lista.length) continue;
    if (info.clase !== claseActual) {
      claseActual = info.clase;
      bloques.push(<div key={`cls-${g}`} className="cat-cls">{CLASES[info.clase]}</div>);
    }
    bloques.push(
      <div key={`grp-${g}`} className="cat-grp">{info.nombre}</div>,
      ...lista.map(c => <FilaCuenta key={c.codigo} cuenta={c} />),
    );
  }

  async function cargarBase() {
    try {
      await cargarCatalogoBase(id);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function agregar() {
    const cod = codigo.trim();
    if (!/^[0-9][0-9-]{2,}$/.test(cod)) return setMsg('Escribe un código numérico, por ejemplo 1000-06.');
    const existente = cuentas.find(c => c.codigo === cod);
    if (existente) return setMsg(`El código ${cod} ya existe: ${existente.nombre}.`);
    if (!nombreNueva.trim()) return setMsg('Escribe el nombre de la cuenta.');
    try {
      await agregarCuenta(id, cod, nombreNueva.trim(), grupo, reguladora);
      setCodigo('');
      setNombreNueva('');
      setReguladora(false);
      setMsg(null);
      await recargar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Marco id={id} empresa={empresa} actual="catalogo" titulo="Catálogo de cuentas" error={error}>
      <p className="lede">
        Basado en el catálogo de UTESA y ampliado. D = naturaleza deudora, C = acreedora.
        Las cuentas “Menos:” son reguladoras (contra-cuentas).
      </p>

      {!tieneBase && (
        <div className="banner">
          <span>Esta empresa no tiene el catálogo base UTESA.</span>
          <span className="spacer" />
          <button type="button" className="btn sm primary" onClick={cargarBase}>Cargar catálogo UTESA</button>
        </div>
      )}

      <input type="search" placeholder="Buscar por código o nombre" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar cuenta" />

      <div className="card">
        {bloques.length ? bloques : <div className="empty">Ninguna cuenta coincide.</div>}
      </div>

      <div className="card">
        <h3>Agregar cuenta propia</h3>
        <div className="ed-meta">
          <label className="f">Código
            <input type="text" placeholder="1000-06" value={codigo} onChange={e => setCodigo(e.target.value)} />
          </label>
          <label className="f">Nombre
            <input type="text" placeholder="Banco Santa Cruz" value={nombreNueva} onChange={e => setNombreNueva(e.target.value)} />
          </label>
        </div>
        <label className="f">Grupo
          <select value={grupo} onChange={e => setGrupo(e.target.value)}>
            {Object.entries(GRUPOS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}
          </select>
        </label>
        <label className="row" style={{ fontSize: '.88rem' }}>
          <input type="checkbox" checked={reguladora} onChange={e => setReguladora(e.target.checked)} />
          Es cuenta reguladora (naturaleza contraria a su grupo)
        </label>
        {msg && <div className="msg bad">{msg}</div>}
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn primary" onClick={agregar}>Agregar al catálogo</button>
        </div>
      </div>
    </Marco>
  );
}

function FilaCuenta({ cuenta }: { cuenta: Cuenta }) {
  return (
    <div className="cat-item">
      <span className="num">{cuenta.codigo}</span>
      <span>
        {cuenta.reguladora && <em style={{ color: 'var(--muted)' }}>Menos: </em>}
        {cuenta.nombre}
        {cuenta.propia && <span className="pill mute"> propia</span>}
      </span>
      <span className={`nat ${cuenta.naturaleza}`}>{cuenta.naturaleza}</span>
    </div>
  );
}

export default function CatalogoPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Catalogo /></Suspense>;
}
