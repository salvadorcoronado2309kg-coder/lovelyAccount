'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import EditorAsiento from '@/components/EditorAsiento';
import Jornal from '@/components/Jornal';
import { guardarAsiento, marcarResuelto, cargarResueltos } from '@/lib/datos';
import { EJERCICIOS, compararAsiento } from '@/lib/practica';
import { fdate, nombreCuenta, type Borrador, type Linea } from '@/lib/contabilidad';
import { useEmpresa } from '@/lib/useEmpresa';

function Practica() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { empresa, cuentas, error, setError } = useEmpresa(id);
  const [resueltos, setResueltos] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<number | null>(null);
  const [verSolucion, setVerSolucion] = useState(false);
  const [correcto, setCorrecto] = useState(false);

  useEffect(() => {
    if (!id) return;
    cargarResueltos(id).then(setResueltos).catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [id, setError]);

  const ej = sel === null ? null : EJERCICIOS[sel];
  const solucionLineas: Linea[] = ej ? ej.solucion.map(([c, d, h]) => ({ c, d, h })) : [];

  function elegir(i: number) {
    setSel(i);
    setVerSolucion(false);
    setCorrecto(false);
  }

  async function comprobar(b: Borrador) {
    if (sel === null || !ej) return;
    const r = compararAsiento(ej.solucion, b.lineas, c => nombreCuenta(cuentas, c));
    if (!r.ok) throw new Error(r.mensaje);
    await marcarResuelto(id, sel);
    setResueltos(s => new Set(s).add(sel));
    setCorrecto(true);
  }

  async function pasarAlDiario() {
    if (!ej) return;
    try {
      await guardarAsiento(id, null, { fecha: ej.fecha, concepto: ej.texto, lineas: solucionLineas });
      router.push(`/diario?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Marco id={id} empresa={empresa} actual="practica" titulo="Práctica guiada" error={error}>
      <p className="lede">
        Un mes de operaciones de una empresa comercial. Lee la transacción, haz el asiento y la app te dice si está bien.
        Si aciertas, lo puedes pasar al Diario.
      </p>
      <div className="row">
        <span className={`pill ${resueltos.size === EJERCICIOS.length ? 'ok' : 'mute'}`}>
          {resueltos.size} de {EJERCICIOS.length} resueltos
        </span>
        <span className="pill mute">ITBIS 18% · TSS empleado 5.91%</span>
      </div>

      {ej && sel !== null && (
        <div className="card ex-active">
          <div className="row">
            <span className="eyebrow">Transacción {sel + 1} · {fdate(ej.fecha)}</span>
            <span className="spacer" />
            <button type="button" className="btn sm ghost" onClick={() => setSel(null)}>Cerrar</button>
          </div>
          <p className="task">{ej.texto}</p>

          {!correcto && (
            <EditorAsiento
              key={sel}
              cuentas={cuentas}
              conMeta={false}
              textoBoton="Comprobar"
              extra={
                <button type="button" className="btn ghost sm" onClick={() => setVerSolucion(v => !v)}>
                  {verSolucion ? 'Ocultar solución' : 'Ver solución'}
                </button>
              }
              onEnviar={comprobar}
            />
          )}

          {correcto && (
            <div className="msg ok">
              <strong>¡Correcto!</strong> El asiento está bien hecho.{' '}
              <button type="button" className="btn sm primary" onClick={pasarAlDiario}>Pasar al Diario</button>
            </div>
          )}

          {verSolucion && (
            <div className="card" style={{ background: 'var(--sunk)', border: 'none' }}>
              <span className="eyebrow">Solución</span>
              <Jornal lineas={solucionLineas} cuentas={cuentas} />
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>Transacciones</h3>
        <div>
          {EJERCICIOS.map((e, i) => (
            <button key={i} type="button" className={`ex ${resueltos.has(i) ? 'done' : ''}`} onClick={() => elegir(i)}>
              <span className="ex-n">{resueltos.has(i) ? '✓' : i + 1}</span>
              <p>{e.texto}</p>
            </button>
          ))}
        </div>
      </div>
    </Marco>
  );
}

export default function PracticaPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Practica /></Suspense>;
}
