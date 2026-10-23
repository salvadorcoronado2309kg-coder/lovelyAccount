'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import { useEmpresa } from '@/lib/useEmpresa';
import { cargarRegistros606, generar606, type Registro606 } from '@/lib/datos';
import {
  csvFiscal, fm, hoy, hojaFiscal, libroFiscal, primerDiaMes, r2, ultimoDiaMes,
  type FilaFiscal,
} from '@/lib/contabilidad';
import { descargarCSV, descargarExcel, nombreSeguro } from '@/lib/exportar';

const sumar = (l: FilaFiscal[], k: 'monto' | 'itbis') => r2(l.reduce((s, f) => s + f[k], 0));

function Fiscal() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, asientos, error, setError } = useEmpresa(id);
  const [desde, setDesde] = useState(() => primerDiaMes(hoy()));
  const [hasta, setHasta] = useState(() => ultimoDiaMes(hoy()));
  const [registros, setRegistros] = useState<Registro606[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);

  const nombre = empresa?.nombre ?? 'Empresa';
  const enRango = useMemo(() => asientos.filter(a => a.fecha >= desde && a.fecha <= hasta), [asientos, desde, hasta]);
  const libro = useMemo(() => libroFiscal(enRango), [enRango]);
  const periodo = `${nombre} ${desde} a ${hasta}`;

  useEffect(() => {
    if (!id) return;
    cargarRegistros606(id, desde, hasta)
      .then(setRegistros)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [id, desde, hasta, setError]);

  async function guardar606() {
    setGuardando(true);
    setAviso(null);
    try {
      const n = await generar606(id, desde, hasta);
      setAviso({
        texto: n ? `Se guardaron ${n} registros nuevos en el 606.` : 'No hay compras nuevas con NCF y RNC en el período.',
        ok: true,
      });
      setRegistros(await cargarRegistros606(id, desde, hasta));
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setGuardando(false);
    }
  }

  function csv(tipo: '606' | '607') {
    const lista = tipo === '606' ? libro.compras : libro.ventas;
    descargarCSV(nombreSeguro(`${tipo} ${tipo === '606' ? 'compras' : 'ventas'} - ${periodo}.csv`), csvFiscal(lista));
  }

  async function excel() {
    try {
      await descargarExcel(nombreSeguro(`606 y 607 - ${periodo}.xlsx`), [
        { nombre: 'Compras 606', filas: hojaFiscal(libro.compras) },
        { nombre: 'Ventas 607', filas: hojaFiscal(libro.ventas) },
      ]);
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : String(e), ok: false });
    }
  }

  return (
    <Marco id={id} empresa={empresa} actual="fiscal" titulo="Formato 606 y 607" error={error}>
      <div className="banner">
        Borrador: los montos, los NCF y la clasificación de bienes y servicios deben validarse con un contador antes de presentarlos a la DGII.
      </div>

      <div className="card">
        <div className="ed-meta">
          <label className="f">Desde
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </label>
          <label className="f">Hasta
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="totals">
        <div>
          <span className="eyebrow" style={{ color: 'var(--debe)' }}>606 compras · {libro.compras.length}</span>
          <b>{fm(sumar(libro.compras, 'monto'))}</b>
          <span className="eyebrow">ITBIS {fm(sumar(libro.compras, 'itbis'))}</span>
        </div>
        <div>
          <span className="eyebrow" style={{ color: 'var(--haber)' }}>607 ventas · {libro.ventas.length}</span>
          <b>{fm(sumar(libro.ventas, 'monto'))}</b>
          <span className="eyebrow">ITBIS {fm(sumar(libro.ventas, 'itbis'))}</span>
        </div>
      </div>

      <div className="row">
        <button type="button" className="btn sm" onClick={() => csv('606')}>CSV 606 (compras)</button>
        <button type="button" className="btn sm" onClick={() => csv('607')}>CSV 607 (ventas)</button>
        <button type="button" className="btn sm" onClick={excel}>Excel 606 y 607</button>
      </div>

      <div className="card">
        <h3>Compras del período (del diario)</h3>
        {libro.compras.length === 0 ? (
          <p className="lede">No hay compras con NCF y RNC en este período.</p>
        ) : (
          <div className="scroll">
            <table className="grid tabla-fiscal">
              <thead>
                <tr><th>Fecha</th><th>NCF</th><th>RNC/Cédula</th><th>Monto</th><th>ITBIS</th></tr>
              </thead>
              <tbody>
                {libro.compras.map((f, i) => (
                  <tr key={i}>
                    <td>{f.fecha}</td>
                    <td>{f.ncf}</td>
                    <td>{f.rnc}</td>
                    <td>{fm(f.monto)}</td>
                    <td>{fm(f.itbis)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Guardar el 606 en la base de datos</h3>
        <p className="lede" style={{ fontSize: '.88rem' }}>
          Toma las compras del período con NCF y RNC y las guarda en el registro del 606. Las que ya estén guardadas no se duplican.
        </p>
        {aviso && <div className={`msg ${aviso.ok ? 'ok' : 'bad'}`}>{aviso.texto}</div>}
        <div className="row">
          <span className="spacer" />
          <button type="button" className="btn primary" disabled={guardando} onClick={guardar606}>
            {guardando ? 'Guardando…' : 'Guardar compras en el 606'}
          </button>
        </div>
        {registros.length > 0 && (
          <div className="scroll">
            <table className="grid tabla-fiscal">
              <thead>
                <tr><th>Fecha</th><th>NCF</th><th>RNC/Cédula</th><th>Bien</th><th>Bienes</th><th>Servicios</th><th>ITBIS</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={i}>
                    <td>{r.fecha_comprobante}</td>
                    <td>{r.ncf}</td>
                    <td>{r.rnc_cedula}</td>
                    <td>{r.tipo_bien}</td>
                    <td>{fm(r.monto_bienes)}</td>
                    <td>{fm(r.monto_servicios)}</td>
                    <td>{fm(r.itbis_facturado)}</td>
                    <td>{r.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Marco>
  );
}

export default function FiscalPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Fiscal /></Suspense>;
}
