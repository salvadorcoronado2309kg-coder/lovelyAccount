'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import { useEmpresa } from '@/lib/useEmpresa';
import { construirRespaldo, leerRespaldo, restaurarRespaldo, type RespaldoLeido } from '@/lib/datos';
import { descargarBlob, nombreSeguro } from '@/lib/exportar';
import { hoy } from '@/lib/contabilidad';

function Respaldo() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, cuentas, asientos, error, recargar, setError } = useEmpresa(id);
  const [texto, setTexto] = useState('');
  const [pendiente, setPendiente] = useState<RespaldoLeido | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [restaurando, setRestaurando] = useState(false);

  const nombre = empresa?.nombre ?? 'Empresa';

  function descargar() {
    const datos = construirRespaldo(nombre, cuentas, asientos);
    descargarBlob(
      JSON.stringify(datos, null, 2),
      'application/json;charset=utf-8',
      nombreSeguro(`respaldo ${nombre} ${hoy()}.json`),
    );
    setAviso({ texto: `Respaldo descargado con ${asientos.length} asientos y ${datos.cuentas.length} cuentas propias.`, ok: true });
  }

  function revisar(contenido: string) {
    setAviso(null);
    setPendiente(null);
    setProgreso(null);
    try {
      const datos = leerRespaldo(contenido);
      setPendiente(datos);
      setTexto(contenido);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : String(e), ok: false });
    }
  }

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return;
    revisar(await archivo.text());
  }

  async function restaurar() {
    if (!pendiente) return;
    setRestaurando(true);
    setAviso(null);
    try {
      await restaurarRespaldo(id, pendiente, (hechos, total) => setProgreso(`Restaurando asiento ${hechos} de ${total}…`));
      await recargar();
      setAviso({ texto: `Se restauraron ${pendiente.asientos.length} asientos y ${pendiente.cuentas.length} cuentas.`, ok: true });
      setPendiente(null);
      setTexto('');
    } catch (e) {
      setAviso({ texto: `No se restauró todo: ${e instanceof Error ? e.message : String(e)}. Revisa el diario antes de volver a intentar.`, ok: false });
    } finally {
      setRestaurando(false);
      setProgreso(null);
    }
  }

  return (
    <Marco id={id} empresa={empresa} actual="respaldo" titulo="Respaldo y restauración" error={error}>
      <p className="lede">
        Tus datos están guardados en tu cuenta de Supabase. Descarga un respaldo cuando quieras tener una copia fuera de la app,
        o para pasarlo a otra cuenta.
      </p>

      <div className="card">
        <h3>Descargar respaldo</h3>
        <p className="lede" style={{ fontSize: '.88rem' }}>
          Incluye los asientos del diario y las cuentas propias de la empresa. El catálogo UTESA se vuelve a cargar solo.
        </p>
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn primary" onClick={descargar} disabled={!empresa}>Descargar respaldo (.json)</button>
        </div>
      </div>

      <div className="card">
        <h3>Restaurar respaldo</h3>
        <p className="lede" style={{ fontSize: '.88rem' }}>
          Elige el archivo o pega el texto. Los asientos se <strong>agregan</strong> a los que ya existen; no se borra nada.
          Acepta respaldos de esta app y de la práctica contable anterior.
        </p>
        <label className="f">Archivo de respaldo
          <input type="file" accept="application/json,.json" onChange={e => elegirArchivo(e.target.files?.[0])} />
        </label>
        <label className="f">o pega el texto del respaldo
          <textarea rows={3} aria-label="Respaldo" value={texto} onChange={e => revisar(e.target.value)} placeholder="{ … }" />
        </label>

        {pendiente && (
          <div className="msg ok">
            Listo para restaurar: {pendiente.asientos.length} asientos y {pendiente.cuentas.length} cuentas propias.
          </div>
        )}
        {progreso && <div className="msg ok">{progreso}</div>}
        {aviso && <div className={`msg ${aviso.ok ? 'ok' : 'bad'}`}>{aviso.texto}</div>}

        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn primary" disabled={!pendiente || restaurando} onClick={restaurar}>
            {restaurando ? 'Restaurando…' : 'Restaurar asientos'}
          </button>
        </div>
      </div>
    </Marco>
  );
}

export default function RespaldoPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Respaldo /></Suspense>;
}
