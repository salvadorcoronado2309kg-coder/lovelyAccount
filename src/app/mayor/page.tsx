'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import { useEmpresa } from '@/lib/useEmpresa';
import {
  fm, mayorDe, nombreCuenta, ordenCodigo, r2, zero,
  type CuentaMayor, type Cuenta,
} from '@/lib/contabilidad';

// Una cuenta en forma de T: Debe a la izquierda, Haber a la derecha.
function TCuenta({ codigo, cuentas, x }: { codigo: string; cuentas: Cuenta[]; x: CuentaMayor }) {
  const cuenta = cuentas.find(c => c.codigo === codigo);
  const nat = cuenta?.naturaleza ?? 'D';
  const s = r2(x.d - x.h);

  const lado = (movs: CuentaMayor['movs'], k: 'd' | 'h') =>
    movs.length
      ? movs.map((m, i) => (
          <div className="tmov" key={i}><span>#{m.n}</span><span>{fm(m[k])}</span></div>
        ))
      : <div className="tmov"><span>—</span><span /></div>;

  return (
    <div className="tacc">
      <h4><span className="code">{codigo}</span>{nombreCuenta(cuentas, codigo)}</h4>
      <div className="tbody">
        <div className="tside d">
          <div className="lbl">Debe</div>
          {lado(x.movs.filter(m => m.d), 'd')}
          <div className="tmov ttot"><span>Σ</span><span>{fm(x.d)}</span></div>
        </div>
        <div className="tside h">
          <div className="lbl">Haber</div>
          {lado(x.movs.filter(m => m.h), 'h')}
          <div className="tmov ttot"><span>Σ</span><span>{fm(x.h)}</span></div>
        </div>
      </div>
      <div className="tsaldo">
        {zero(s) ? (
          <span className="pill mute">Saldada</span>
        ) : (
          <>
            Saldo {s > 0 ? 'deudor' : 'acreedor'}:{' '}
            <span className="num" style={{ color: s > 0 ? 'var(--debe)' : 'var(--haber)' }}>RD$ {fm(Math.abs(s))}</span>
            {(s > 0 ? 'D' : 'C') !== nat && <span className="pill bad" title="Saldo contrario a su naturaleza"> Revisar</span>}
          </>
        )}
      </div>
    </div>
  );
}

function Mayor() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, cuentas, asientos, error } = useEmpresa(id);
  const [sel, setSel] = useState('');
  const L = useMemo(() => mayorDe(asientos), [asientos]);
  const codigos = Object.keys(L).sort(ordenCodigo);
  const lista = sel && L[sel] ? [sel] : codigos;

  return (
    <Marco id={id} empresa={empresa} actual="mayor" titulo="Libro Mayor" error={error}>
      <p className="lede">Cada cuenta en forma de T. El número (#) es el asiento del Diario de donde viene el movimiento.</p>
      {codigos.length === 0 ? (
        <div className="card empty">
          <strong>Sin movimientos.</strong>
          <span>Registra asientos en el Diario para ver las cuentas T.</span>
        </div>
      ) : (
        <>
          <label className="f">Mostrar
            <select value={sel} onChange={e => setSel(e.target.value)}>
              <option value="">Todas las cuentas con movimiento ({codigos.length})</option>
              {codigos.map(c => <option key={c} value={c}>{c} · {nombreCuenta(cuentas, c)}</option>)}
            </select>
          </label>
          <div className="tgrid">
            {lista.map(c => <TCuenta key={c} codigo={c} cuentas={cuentas} x={L[c]} />)}
          </div>
        </>
      )}
    </Marco>
  );
}

export default function MayorPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Mayor /></Suspense>;
}
