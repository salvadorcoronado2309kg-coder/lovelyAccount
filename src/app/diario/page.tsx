'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import EditorAsiento from '@/components/EditorAsiento';
import Jornal from '@/components/Jornal';
import { borrarAsiento, guardarAsiento } from '@/lib/datos';
import { fdate, type Asiento } from '@/lib/contabilidad';
import { useEmpresa } from '@/lib/useEmpresa';

function Diario() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, cuentas, asientos, error, recargar, setError } = useEmpresa(id);
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  async function eliminar(a: Asiento) {
    if (!window.confirm('¿Eliminar este asiento?')) return;
    try {
      await borrarAsiento(a.id);
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Marco id={id} empresa={empresa} actual="diario" titulo="Libro Diario" error={error}>
      <p className="lede">Registra cada transacción con partida doble. El asiento solo se guarda cuando el Debe y el Haber cuadran.</p>

      {nuevo ? (
        <div className="card ex-active">
          <h3>Nuevo asiento #{asientos.length + 1}</h3>
          <EditorAsiento
            cuentas={cuentas}
            fiscal
            onCancelar={() => setNuevo(false)}
            onEnviar={async b => {
              await guardarAsiento(id, null, b);
              setNuevo(false);
              await recargar();
            }}
          />
        </div>
      ) : (
        <button type="button" className="btn primary" style={{ minHeight: 48 }} onClick={() => { setNuevo(true); setEditando(null); }}>
          + Nuevo asiento
        </button>
      )}

      {asientos.length === 0 && !nuevo && (
        <div className="card empty">
          <strong>Todavía no hay asientos.</strong>
          <span>Toca “Nuevo asiento” o ve a Práctica para resolver transacciones guiadas.</span>
        </div>
      )}

      {asientos.map((a, i) =>
        editando === a.id ? (
          <div key={a.id} className="card ex-active">
            <h3>Editar asiento #{i + 1}</h3>
            <EditorAsiento
              cuentas={cuentas}
              fiscal
              fecha={a.fecha}
              concepto={a.concepto}
              lineas={a.lineas}
              textoBoton="Guardar cambios"
              onCancelar={() => setEditando(null)}
              onEnviar={async b => {
                await guardarAsiento(id, a.id, b);
                setEditando(null);
                await recargar();
              }}
            />
          </div>
        ) : (
          <article key={a.id} className="card">
            <div className="jrn-head">
              <span className="jrn-n">
                Asiento #{i + 1} {a.ejemplo && <span className="tag-ej">Ejemplo</span>}
              </span>
              <span className="jrn-date">{fdate(a.fecha)}</span>
            </div>
            <Jornal lineas={a.lineas} cuentas={cuentas} />
            <p className="concepto">{a.concepto}</p>
            <div className="row">
              <span className="spacer" />
              <button type="button" className="btn sm ghost" onClick={() => { setEditando(a.id); setNuevo(false); }}>Editar</button>
              <button type="button" className="btn sm ghost danger" onClick={() => eliminar(a)}>Eliminar</button>
            </div>
          </article>
        ),
      )}
    </Marco>
  );
}

export default function DiarioPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Diario /></Suspense>;
}
