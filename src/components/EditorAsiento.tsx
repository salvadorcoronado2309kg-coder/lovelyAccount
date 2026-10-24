'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { GRUPOS } from '@/lib/utesa';
import {
  TIPOS_BIEN, fm, hoy, nombreCuenta, pnum, r2, zero,
  type Borrador, type Cuenta, type Linea,
} from '@/lib/contabilidad';

interface LineaForm {
  c: string;
  d: string;
  h: string;
  rnc: string;
  ncf: string;
  tipo: string;
}

interface Props {
  cuentas: Cuenta[];
  fecha?: string;
  concepto?: string;
  lineas?: Linea[];
  conMeta?: boolean;
  fiscal?: boolean;
  textoBoton?: string;
  extra?: ReactNode;
  // Debe lanzar un Error si no se pudo guardar; el mensaje se muestra en el editor.
  onEnviar: (borrador: Borrador) => Promise<void>;
  onCancelar?: () => void;
}

const vacia = (): LineaForm => ({ c: '', d: '', h: '', rnc: '', ncf: '', tipo: '' });

export default function EditorAsiento({
  cuentas, fecha, concepto, lineas, conMeta = true, fiscal = false,
  textoBoton = 'Registrar asiento', extra, onEnviar, onCancelar,
}: Props) {
  const [fechaV, setFecha] = useState(fecha ?? hoy());
  const [conceptoV, setConcepto] = useState(concepto ?? '');
  const [filas, setFilas] = useState<LineaForm[]>(() =>
    lineas && lineas.length
      ? lineas.map(l => ({
          c: l.c,
          d: l.d ? String(l.d) : '',
          h: l.h ? String(l.h) : '',
          rnc: l.rnc ?? '',
          ncf: l.ncf ?? '',
          tipo: l.tipo ?? '',
        }))
      : [vacia(), vacia()],
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const opciones = useMemo(
    () => Object.entries(GRUPOS)
      .map(([g, info]) => ({ g, nombre: info.nombre, cuentas: cuentas.filter(c => c.grupo === g) }))
      .filter(o => o.cuentas.length > 0),
    [cuentas],
  );

  const td = r2(filas.reduce((s, l) => s + pnum(l.d), 0));
  const th = r2(filas.reduce((s, l) => s + pnum(l.h), 0));
  const df = r2(td - th);

  function editar(i: number, campo: keyof LineaForm, valor: string) {
    setFilas(fs => fs.map((l, j) => {
      if (j !== i) return l;
      const n = { ...l, [campo]: valor };
      // Una línea va en un solo lado: escribir en Debe limpia Haber, y al revés.
      if (campo === 'd' && valor.trim()) n.h = '';
      if (campo === 'h' && valor.trim()) n.d = '';
      return n;
    }));
  }

  function recoger(): { error: string } | { borrador: Borrador } {
    const out: Linea[] = [];
    for (const [i, l] of filas.entries()) {
      const d = pnum(l.d);
      const h = pnum(l.h);
      const rnc = l.rnc.trim();
      const ncf = l.ncf.trim().toUpperCase();
      if (!l.c && !d && !h && !rnc && !ncf) continue;
      if (!l.c) return { error: `La línea ${i + 1} tiene monto pero no tiene cuenta.` };
      if (!d && !h) return { error: `La línea ${i + 1} (${nombreCuenta(cuentas, l.c)}) no tiene monto en Debe ni en Haber.` };
      if (d < 0 || h < 0) return { error: 'Los montos no pueden ser negativos.' };
      if (rnc && !/^(\d{9}|\d{11})$/.test(rnc)) {
        return { error: `El RNC de la línea ${i + 1} debe tener 9 dígitos (empresa) u 11 (persona).` };
      }
      if (ncf && !/^[BE]\d{10,12}$/.test(ncf)) {
        return { error: `El NCF de la línea ${i + 1} no es válido. Ejemplo: B0100000001.` };
      }
      out.push({ c: l.c, d, h, rnc, ncf, tipo: l.tipo });
    }
    if (out.length < 2) return { error: 'Un asiento necesita al menos dos cuentas: una al Debe y otra al Haber (partida doble).' };
    if (!out.some(l => l.d) || !out.some(l => l.h)) return { error: 'Debe haber al menos una cuenta al Debe y una al Haber.' };
    const sd = r2(out.reduce((s, l) => s + l.d, 0));
    const sh = r2(out.reduce((s, l) => s + l.h, 0));
    if (!zero(sd - sh)) {
      return { error: `El asiento no cuadra: Debe ${fm(sd)} ≠ Haber ${fm(sh)}. Diferencia de RD$${fm(Math.abs(sd - sh))}.` };
    }
    if (conMeta && !conceptoV.trim()) return { error: 'Escribe el concepto o explicación del asiento.' };
    return { borrador: { fecha: fechaV, concepto: conceptoV.trim(), lineas: out } };
  }

  async function enviar() {
    setMsg(null);
    const r = recoger();
    if ('error' in r) {
      setMsg(r.error);
      return;
    }
    setEnviando(true);
    try {
      await onEnviar(r.borrador);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ed">
      {conMeta && (
        <div className="ed-meta">
          <label className="f">Fecha
            <input type="date" value={fechaV} onChange={e => setFecha(e.target.value)} />
          </label>
          <label className="f">Concepto
            <input type="text" placeholder="Ej.: Para registrar la compra de…" value={conceptoV} onChange={e => setConcepto(e.target.value)} />
          </label>
        </div>
      )}

      <div className="ed-lista">
        {filas.map((l, i) => (
          <div key={i} className="ed-line">
            <select aria-label={`Cuenta de la línea ${i + 1}`} value={l.c} onChange={e => editar(i, 'c', e.target.value)}>
              <option value="">Elige una cuenta…</option>
              {opciones.map(o => (
                <optgroup key={o.g} label={o.nombre}>
                  {o.cuentas.map(c => (
                    <option key={c.codigo} value={c.codigo}>{c.codigo} · {c.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <label className="f lab-d">Debe
              <input type="text" inputMode="decimal" placeholder="0.00" value={l.d} onChange={e => editar(i, 'd', e.target.value)} />
            </label>
            <label className="f lab-h">Haber
              <input type="text" inputMode="decimal" placeholder="0.00" value={l.h} onChange={e => editar(i, 'h', e.target.value)} />
            </label>
            <button
              type="button"
              className="x"
              aria-label={`Quitar línea ${i + 1}`}
              disabled={filas.length <= 2}
              onClick={() => setFilas(fs => fs.filter((_, j) => j !== i))}
            >×</button>
            {fiscal && (
              <div className="ed-fis">
                <label className="f">RNC o cédula del tercero
                  <input type="text" inputMode="numeric" placeholder="Opcional" value={l.rnc} onChange={e => editar(i, 'rnc', e.target.value)} />
                </label>
                <label className="f">NCF de la factura
                  <input type="text" placeholder="B0100000001" value={l.ncf} onChange={e => editar(i, 'ncf', e.target.value)} />
                </label>
                <label className="f">Tipo de bien o servicio
                  <select value={l.tipo} onChange={e => editar(i, 'tipo', e.target.value)}>
                    <option value="">Sin especificar</option>
                    {TIPOS_BIEN.map(([v, t]) => <option key={v} value={v}>{v} · {t}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="row">
        <button type="button" className="btn sm ghost" onClick={() => setFilas(fs => [...fs, vacia()])}>+ Agregar línea</button>
        {extra}
      </div>

      <div className="totals">
        <div>
          <span className="eyebrow" style={{ color: 'var(--debe)' }}>Total debe</span>
          <b>{fm(td)}</b>
        </div>
        <div>
          <span className="eyebrow" style={{ color: 'var(--haber)' }}>Total haber</span>
          <b>{fm(th)}</b>
        </div>
        <div>
          <span className="eyebrow">Diferencia</span>
          {zero(df) && td > 0
            ? <span className="pill ok">Cuadra ✓</span>
            : <b style={{ color: zero(df) ? 'var(--muted)' : 'var(--bad)' }}>{fm(Math.abs(df))}</b>}
        </div>
      </div>

      {msg && <div className="msg bad">{msg}</div>}

      <div className="row">
        <span className="spacer" />
        {onCancelar && <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>}
        <button type="button" className="btn primary" disabled={enviando} onClick={enviar}>
          {enviando ? 'Guardando…' : textoBoton}
        </button>
      </div>
    </div>
  );
}
