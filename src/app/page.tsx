import Link from 'next/link';

export default function Inicio() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>LovelyAccount</h1>
      <p>Contabilidad para aprender y para trabajar. Próximamente: diario, mayor, estados y formato 606.</p>
      <p><Link href="/login">Entrar o crear cuenta</Link></p>
    </main>
  );
}
