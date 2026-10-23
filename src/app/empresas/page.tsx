'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Empresa { id: string; nombre: string; rnc: string | null; regimen_itbis: string; modo: string }

export default function EmpresasPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState('');
  const [rnc, setRnc] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const { data, error } = await supabase.from('empresas').select('*').order('created_at');
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
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace('/login'); return; }
    if (!nombre.trim()) { setError('Escribe el nombre de la empresa.'); return; }
    const r = rnc.replace(/\D/g, '');
    if (r && r.length !== 9 && r.length !== 11) { setError('El RNC debe tener 9 dígitos o la cédula 11.'); return; }
    const { error } = await supabase.from('empresas').insert({ owner_id: u.user.id, nombre: nombre.trim(), rnc: r || null });
    if (error) { setError(error.message); return; }
    setNombre(''); setRnc('');
    await cargar();
  }

  async function salir() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (cargando) return <main style={{ padding: 16 }}>Cargando…</main>;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>Mis empresas</h1>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{usuario} · <button onClick={salir}>Salir</button></span>
      </div>

      {empresas.length === 0 && <p>Todavía no tienes empresas. Crea la primera abajo.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {empresas.map(e => (
          <li key={e.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <strong>{e.nombre}</strong>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {e.rnc ? `RNC ${e.rnc} · ` : 'Sin RNC · '}{e.regimen_itbis}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={crear} style={{ display: 'grid', gap: 10, marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Nueva empresa</h2>
        <label>Nombre
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            style={{ width: '100%', padding: 10, marginTop: 4, color: '#111827', background: '#fff' }} />
        </label>
        <label>RNC o cédula (opcional)
          <input value={rnc} onChange={e => setRnc(e.target.value)} inputMode="numeric"
            style={{ width: '100%', padding: 10, marginTop: 4, color: '#111827', background: '#fff' }} />
        </label>
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        <button type="submit" style={{ padding: 12 }}>Crear empresa</button>
      </form>
    </main>
  );
}
