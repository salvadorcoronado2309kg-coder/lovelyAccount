'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { cargarCatalogoBase } from '@/lib/datos';

interface Empresa { id: string; nombre: string; rnc: string | null; regimen_itbis: string }

export default function EmpresasPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [rnc, setRnc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    const { data, error } = await supabase.from('empresas').select('id,nombre,rnc,regimen_itbis').order('created_at');
    if (error) { setError(error.message); return; }
    setEmpresas((data ?? []) as Empresa[]);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace('/login'); return; }
      setUsuario(data.user.email ?? null);
      await cargar();
      setCargando(false);
    })();
  }, [router]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace('/login'); return; }
    if (!nombre.trim()) { setError('Escribe el nombre de la empresa.'); return; }
    const r = rnc.replace(/\D/g, '');
    if (r && r.length !== 9 && r.length !== 11) { setError('El RNC debe tener 9 dígitos o la cédula 11.'); return; }

    setCreando(true);
    const { data: nueva, error } = await supabase
      .from('empresas')
      .insert({ owner_id: u.user.id, nombre: nombre.trim(), rnc: r || null })
      .select('id')
      .single();
    if (error) { setCreando(false); setError(error.message); return; }

    // Cada empresa empieza con el catálogo UTESA; luego puede agregar sus propias cuentas.
    try {
      await cargarCatalogoBase(nueva.id);
      setAviso('Empresa creada con el catálogo UTESA.');
    } catch (err) {
      setError(`La empresa se creó, pero no se pudo cargar el catálogo: ${err instanceof Error ? err.message : String(err)}. Puedes cargarlo desde Catálogo.`);
    }
    setNombre('');
    setRnc('');
    setCreando(false);
    await cargar();
  }

  async function salir() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (cargando) return <main style={{ padding: 16 }}>Cargando…</main>;

  return (
    <>
      <header className="top">
        <div className="top-in">
          <h1 className="brand">LovelyAccount<small>{usuario}</small></h1>
          <button type="button" className="top-chip" onClick={salir}>Salir</button>
        </div>
      </header>
      <main>
        <div className="wrap">
          <h2 className="view-title">Mis empresas</h2>

          {empresas.length === 0 && <p className="lede">Todavía no tienes empresas. Crea la primera abajo.</p>}
          {empresas.map(e => (
            <Link key={e.id} href={`/diario?id=${e.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{e.nombre}</strong>
              <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                {e.rnc ? `RNC ${e.rnc} · ` : 'Sin RNC · '}{e.regimen_itbis}
              </span>
            </Link>
          ))}

          <form onSubmit={crear} className="card">
            <h3>Nueva empresa</h3>
            <label className="f">Nombre
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} />
            </label>
            <label className="f">RNC o cédula (opcional)
              <input type="text" inputMode="numeric" value={rnc} onChange={e => setRnc(e.target.value)} />
            </label>
            {error && <div className="msg bad">{error}</div>}
            {aviso && <div className="msg ok">{aviso}</div>}
            <div className="row">
              <span className="spacer" />
              <button type="submit" className="btn primary" disabled={creando}>
                {creando ? 'Creando…' : 'Crear empresa'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
