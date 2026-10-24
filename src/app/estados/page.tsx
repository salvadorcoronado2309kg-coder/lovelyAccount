'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Marco from '@/components/Marco';
import { useEmpresa } from '@/lib/useEmpresa';
import { guardarAsiento, guardarInventarioFinal } from '@/lib/datos';
import {
  asientosDeCierre, balanceGeneral, balanza, calcular, claseDe, estadoResultados,
  fdate, fm, fp, hoy, hojaBalanza, hojaDiario, hojaFilas, hojaFiscal, hojaMayor,
  libroFiscal, pnum, saldo, zero, type Fila,
} from '@/lib/contabilidad';
import { descargarExcel, descargarPDF, nombreSeguro, type FilaPDF } from '@/lib/exportar';

type Reporte = 'bal' | 'res' | 'bg';

const TITULOS: Record<Reporte, string> = {
  bal: 'Balanza de comprobación de sumas y saldos',
  res: 'Estado de Resultados',
  bg: 'Balance General',
};

function Filas({ filas }: { filas: Fila[] }) {
  return (
    <>
      {filas.map((f, i) => (
        <div key={i} className={`sl ${f.estilo ?? ''}`}>
          <span>{f.t}</span>
          <span className="a1">{f.a1 == null ? '' : fp(f.a1)}</span>
          <span className="a2">{f.a2 == null ? '' : fp(f.a2)}</span>
        </div>
      ))}
    </>
  );
}

function Estados() {
  const id = useSearchParams().get('id') ?? '';
  const { empresa, cuentas, asientos, error, recargar, setError } = useEmpresa(id);
  const [rep, setRep] = useState<Reporte>('res');
  const [invTexto, setInvTexto] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [pidiendoCierre, setPidiendoCierre] = useState(false);

  const invGuardado = empresa?.inventario_final ?? null;
  useEffect(() => {
    setInvTexto(invGuardado == null ? '' : String(invGuardado));
  }, [invGuardado]);

  const nombre = empresa?.nombre ?? 'Empresa';
  const fechas = asientos.map(a => a.fecha);
  const ultima = fechas.length ? fechas[fechas.length - 1] : hoy();
  const periodo = fechas.length ? `Del ${fdate(fechas[0])} al ${fdate(ultima)}` : 'Sin período';

  const C = useMemo(() => calcular(cuentas, asientos, invGuardado), [cuentas, asientos, invGuardado]);
  const B = useMemo(() => balanza(C), [C]);
  const res = useMemo(() => estadoResultados(C), [C]);
  const bg = useMemo(() => balanceGeneral(C), [C]);
  const libro = useMemo(() => libroFiscal(asientos), [asientos]);

  const hayCierre = cuentas.some(a => ['I', 'CO', 'G'].includes(claseDe(a)) && C.has(a.codigo) && !zero(saldo(C.L, a.codigo)));

  const todoCuadra = B.cuadra && zero(bg.descuadre);

  function mostrarError(e: unknown) {
    setError(e instanceof Error ? e.message : String(e));
  }

  async function guardarInventario() {
    try {
      await guardarInventarioFinal(id, invTexto.trim() === '' ? null : pnum(invTexto));
      await recargar();
    } catch (e) {
      mostrarError(e);
    }
  }

  async function cerrarPeriodo() {
    const borradores = asientosDeCierre(C, cuentas, ultima);
    try {
      for (const b of borradores) await guardarAsiento(id, null, b);
      // El inventario final ya quedó contabilizado: se limpia para el siguiente período.
      await guardarInventarioFinal(id, null);
      setPidiendoCierre(false);
      await recargar();
      setAviso({ texto: `Se registraron ${borradores.length} asientos de cierre.`, ok: true });
    } catch (e) {
      mostrarError(e);
    }
  }

  async function excelTodo() {
    try {
      await descargarExcel(nombreSeguro(`Contabilidad - ${nombre}.xlsx`), [
        { nombre: 'Diario', filas: hojaDiario(asientos, cuentas) },
        { nombre: 'Mayor', filas: hojaMayor(C.L, cuentas) },
        { nombre: 'Compras 606', filas: hojaFiscal(libro.compras) },
        { nombre: 'Ventas 607', filas: hojaFiscal(libro.ventas) },
        { nombre: 'Balanza', filas: hojaBalanza(B) },
        { nombre: 'Resultados', filas: hojaFilas(res) },
        { nombre: 'Balance', filas: hojaFilas(bg.filas) },
      ]);
      setAviso({ texto: 'Excel descargado con 7 hojas: Diario, Mayor, Compras 606, Ventas 607, Balanza, Resultados y Balance.', ok: true });
    } catch (e) {
      mostrarError(e);
    }
  }

  async function pdfActual() {
    const archivo = nombreSeguro(`${TITULOS[rep]} - ${nombre}.pdf`);
    const sub = `${nombre} · ${rep === 'bal' ? `Al ${fdate(ultima)}` : periodo} · Valores en RD$`;
    try {
      if (rep === 'bal') {
        const filas: FilaPDF[] = B.filas.map(f => ({ celdas: [f.codigo, f.nombre, f.debe, f.haber, f.sd, f.sc] }));
        filas.push({
          celdas: ['', 'Totales', B.totales.debe, B.totales.haber, B.totales.sd, B.totales.sc],
          estilo: 'big',
        });
        await descargarPDF(archivo, TITULOS.bal, sub,
          ['Código', 'Cuenta', 'Débitos', 'Créditos', 'Saldo deudor', 'Saldo acreedor'],
          filas, { apaisado: true, anchos: [22, 0, 30, 30, 30, 30] });
      } else {
        const lista = rep === 'res' ? res : bg.filas;
        await descargarPDF(archivo, TITULOS[rep], sub, null,
          lista.map(f => ({ celdas: [f.t, f.a1 ?? null, f.a2 ?? null], estilo: f.estilo })),
          { apaisado: false, anchos: [0, 35, 35] });
      }
      setAviso({ texto: 'PDF descargado.', ok: true });
    } catch (e) {
      mostrarError(e);
    }
  }

  const encabezado = (
    <div className="stmt-h">
      <strong>{nombre}</strong>
      <span>{rep === 'bal' ? TITULOS.bal : rep === 'res' ? 'Estado de Resultados' : 'Balance General (Estado de Situación Financiera)'}</span>
      <span>{rep === 'bal' ? `Al ${fdate(ultima)}` : periodo} · Valores en RD$</span>
    </div>
  );

  return (
    <Marco id={id} empresa={empresa} actual="estados" titulo="Balanza y estados" error={error}>
      <p className="lede">Se calculan solos con los asientos del Diario.</p>

      <div className="seg" role="group" aria-label="Reporte">
        <button type="button" aria-pressed={rep === 'bal'} onClick={() => setRep('bal')}>Balanza</button>
        <button type="button" aria-pressed={rep === 'res'} onClick={() => setRep('res')}>Resultados</button>
        <button type="button" aria-pressed={rep === 'bg'} onClick={() => setRep('bg')}>Balance general</button>
      </div>

      {asientos.length === 0 ? (
        <div className="card empty">
          <strong>No hay asientos todavía.</strong>
          <span>Los reportes aparecen cuando registres transacciones.</span>
        </div>
      ) : (
        <>
          {rep !== 'bal' && C.periodic && (C.invIni || C.compras) ? (
            <div className="card">
              <label className="f">Inventario final de mercancías (conteo físico, RD$)
                <input
                  type="text"
                  inputMode="decimal"
                  value={invTexto}
                  placeholder={fm(C.invIni)}
                  onChange={e => setInvTexto(e.target.value)}
                  onBlur={guardarInventario}
                />
              </label>
              <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
                Sistema periódico: Costo de ventas = Inventario inicial + Compras netas − Inventario final. Si lo dejas vacío se usa {fm(C.invIni)}.
              </span>
            </div>
          ) : null}

          <div className="row">
            <button type="button" className="btn sm" onClick={excelTodo}>Descargar Excel (todo)</button>
            <button type="button" className="btn sm" onClick={pdfActual}>Descargar PDF de este reporte</button>
          </div>

          {aviso && <div className={`msg ${aviso.ok ? 'ok' : 'bad'}`}>{aviso.texto}</div>}

          <div className="card">
            {rep === 'bal' ? (
              <>
                {encabezado}
                <div className="scroll">
                  <table className="grid">
                    <thead>
                      <tr><th>Código</th><th>Cuenta</th><th>Débitos</th><th>Créditos</th><th>Saldo deudor</th><th>Saldo acreedor</th></tr>
                    </thead>
                    <tbody>
                      {B.filas.map(f => (
                        <tr key={f.codigo}>
                          <td>{f.codigo}</td>
                          <td>{f.nombre}</td>
                          <td>{fm(f.debe)}</td>
                          <td>{fm(f.haber)}</td>
                          <td>{f.sd == null ? '' : fm(f.sd)}</td>
                          <td>{f.sc == null ? '' : fm(f.sc)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td />
                        <td>Totales</td>
                        <td>{fm(B.totales.debe)}</td>
                        <td>{fm(B.totales.haber)}</td>
                        <td>{fm(B.totales.sd)}</td>
                        <td>{fm(B.totales.sc)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="row" style={{ justifyContent: 'center' }}>
                  {B.cuadra ? <span className="pill ok">La balanza cuadra ✓</span> : <span className="pill bad">La balanza no cuadra</span>}
                </div>
              </>
            ) : (
              <div className="stmt">
                {encabezado}
                <Filas filas={rep === 'res' ? res : bg.filas} />
                {rep === 'bg' && (
                  <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
                    {todoCuadra
                      ? <span className="pill ok">Activo = Pasivo + Capital ✓</span>
                      : <span className="pill bad">Descuadre de RD$ {fm(Math.abs(bg.descuadre))}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {rep !== 'bal' && hayCierre && (
            <div className="card">
              <h3>Asientos de cierre</h3>
              <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--muted)' }}>
                Al final del período se cierran ingresos, costos y gastos contra 7100 Resumen de Ganancias o Pérdidas,
                y el resultado pasa a 3202 Ganancias del Período.
              </p>
              <div className="row">
                {pidiendoCierre ? (
                  <>
                    <span style={{ fontSize: '.88rem' }}>Se agregarán los asientos de cierre al Diario. ¿Continuar?</span>
                    <button type="button" className="btn sm primary" onClick={cerrarPeriodo}>Sí, cerrar período</button>
                    <button type="button" className="btn sm ghost" onClick={() => setPidiendoCierre(false)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="btn" onClick={() => setPidiendoCierre(true)}>Generar asientos de cierre</button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Marco>
  );
}

export default function EstadosPage() {
  return <Suspense fallback={<p style={{ padding: 16 }}>Cargando…</p>}><Estados /></Suspense>;
}
