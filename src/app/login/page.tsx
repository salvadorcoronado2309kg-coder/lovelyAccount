'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (!email.trim() || password.length < 8) {
      setMensaje({ texto: 'Escribe el correo y una contraseña de al menos 8 caracteres.', ok: false });
      return;
    }
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setMensaje({ texto: 'Correo o contraseña incorrectos.', ok: false }); return; }
        router.push('/empresas');
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) { setMensaje({ texto: error.message, ok: false }); return; }
        if (!data.session) {
          setMensaje({ texto: 'Te enviamos un correo para confirmar tu cuenta. Confírmala y luego entra aquí.', ok: true });
          return;
        }
        router.push('/empresas');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: '1.5rem' }}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</h1>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label>Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
            style={{ width: '100%', padding: 10, marginTop: 4, color: '#111827', background: '#fff' }} />
        </label>
        <label>Contraseña (mínimo 8 caracteres)
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            style={{ width: '100%', padding: 10, marginTop: 4, color: '#111827', background: '#fff' }} />
        </label>
        {mensaje && <p style={{ color: mensaje.ok ? '#166534' : '#b91c1c' }}>{mensaje.texto}</p>}
        <button type="submit" disabled={enviando} style={{ padding: 12 }}>
          {enviando ? 'Procesando…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={() => setModo(modo === 'entrar' ? 'crear' : 'entrar')} style={{ padding: 10, background: 'none', border: 'none', textDecoration: 'underline' }}>
          {modo === 'entrar' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta'}
        </button>
      </form>
    </main>
  );
}
