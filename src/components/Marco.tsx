'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Empresa } from '@/lib/useEmpresa';

export type Seccion = 'diario' | 'practica' | 'mayor' | 'estados' | 'catalogo' | 'fiscal' | 'respaldo';

const PESTANAS: { clave: Seccion; texto: string; icono: ReactNode }[] = [
  {
    clave: 'diario',
    texto: 'Diario',
    icono: (<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /><path d="M9 8h6" /></>),
  },
  {
    clave: 'practica',
    texto: 'Práctica',
    icono: (<><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>),
  },
  {
    clave: 'mayor',
    texto: 'Mayor',
    icono: (<><path d="M4 6h16" /><path d="M12 6v14" /><path d="M6 10h4M14 10h4M6 14h3M14 14h4" /></>),
  },
  {
    clave: 'estados',
    texto: 'Estados',
    icono: (<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  },
  {
    clave: 'catalogo',
    texto: 'Catálogo',
    icono: (<path d="M4 5h16M4 10h16M4 15h10M4 20h7" />),
  },
];

const SECUNDARIAS: { clave: Seccion; texto: string }[] = [
  { clave: 'fiscal', texto: 'Fiscal 606/607' },
  { clave: 'respaldo', texto: 'Respaldo' },
];

interface Props {
  id: string;
  empresa: Empresa | null;
  actual: Seccion;
  titulo: string;
  error: string | null;
  children: ReactNode;
}

// Marco común de las páginas de una empresa: encabezado, navegación y título.
export default function Marco({ id, empresa, actual, titulo, error, children }: Props) {
  const q = `?id=${id}`;
  return (
    <>
      <header className="top">
        <div className="top-in">
          <h1 className="brand">
            LovelyAccount
            <small>{empresa?.nombre ?? 'Contabilidad'}</small>
          </h1>
          <Link className="top-chip" href="/empresas">Mis empresas</Link>
        </div>
      </header>

      <main>
        <div className="wrap">
          {!empresa ? (
            <p className="lede">{error ?? 'Cargando…'}</p>
          ) : (
            <>
              <nav className="subnav" aria-label="Más secciones">
                {SECUNDARIAS.map(s => (
                  <Link key={s.clave} href={`/${s.clave}${q}`} aria-current={actual === s.clave ? 'page' : undefined}>
                    {s.texto}
                  </Link>
                ))}
              </nav>
              {error && <div className="msg bad">{error}</div>}
              <h2 className="view-title">{titulo}</h2>
              {children}
            </>
          )}
        </div>
      </main>

      <nav className="tabs" aria-label="Secciones">
        <div className="tabs-in">
          {PESTANAS.map(p => (
            <Link
              key={p.clave}
              href={`/${p.clave}${q}`}
              className="tab"
              aria-current={actual === p.clave ? 'page' : undefined}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">{p.icono}</svg>
              {p.texto}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
