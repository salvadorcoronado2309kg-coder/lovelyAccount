import { GRUPOS } from './utesa';

export type Naturaleza = 'D' | 'C';
export type Celda = string | number | null;

export interface Cuenta {
  codigo: string;
  nombre: string;
  grupo: string;
  naturaleza: Naturaleza;
  reguladora: boolean;
  propia: boolean;
}

export interface Linea {
  c: string;
  d: number;
  h: number;
  rnc?: string;
  ncf?: string;
  tipo?: string;
}

export interface Asiento {
  id: string;
  fecha: string;
  concepto: string;
  ejemplo: boolean;
  lineas: Linea[];
}

export interface Borrador {
  fecha: string;
  concepto: string;
  lineas: Linea[];
}

export type Estilo = 'sec' | 'grupo' | 'ind' | 'sub' | 'big';

export interface Fila {
  t: string;
  a1?: number | null;
  a2?: number | null;
  estilo?: Estilo;
}

export const TIPOS_BIEN: [string, string][] = [
  ['01', 'Gastos de personal'],
  ['02', 'Trabajos, suministros y servicios'],
  ['03', 'Arrendamientos'],
  ['04', 'Gastos de activos fijos'],
  ['05', 'Gastos de representación'],
  ['06', 'Otras deducciones admitidas'],
  ['07', 'Gastos financieros'],
  ['08', 'Gastos extraordinarios'],
  ['09', 'Compras que forman parte del costo de venta'],
  ['10', 'Adquisiciones de activos'],
  ['11', 'Gastos de seguros'],
];

/* ---------- Formatos y utilidades ---------- */

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const zero = (n: number) => Math.abs(n) < 0.005;

const NF = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fm = (n: number) => NF.format(r2(n));
// Negativos entre paréntesis, como en los estados financieros.
export const fp = (n: number) => {
  const v = r2(n);
  return v < 0 ? `(${NF.format(-v)})` : NF.format(v);
};

export const pnum = (texto: string) => {
  const v = parseFloat(texto.replace(/[,\s]/g, '').replace(/^RD\$/i, ''));
  return Number.isFinite(v) ? r2(v) : 0;
};

export const fdate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

export const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const primerDiaMes = (iso: string) => `${iso.slice(0, 8)}01`;

export const ultimoDiaMes = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

export const ordenCodigo = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });

export const claseDe = (c: Cuenta) => GRUPOS[c.grupo]?.clase ?? '';

export const nombreCuenta = (cuentas: Cuenta[], codigo: string) =>
  cuentas.find(c => c.codigo === codigo)?.nombre ?? '(cuenta no encontrada)';

/* ---------- Mayor ---------- */

export interface Movimiento {
  n: number;
  d: number;
  h: number;
}

export interface CuentaMayor {
  d: number;
  h: number;
  movs: Movimiento[];
}

export type LibroMayor = Record<string, CuentaMayor>;

// n es la posición del asiento en el diario (1 = primero).
export function mayorDe(asientos: Asiento[]): LibroMayor {
  const L: LibroMayor = {};
  asientos.forEach((a, i) => {
    a.lineas.forEach(l => {
      const x = (L[l.c] ??= { d: 0, h: 0, movs: [] });
      x.d = r2(x.d + l.d);
      x.h = r2(x.h + l.h);
      x.movs.push({ n: i + 1, d: l.d, h: l.h });
    });
  });
  return L;
}

export const saldo = (L: LibroMayor, codigo: string) => (L[codigo] ? r2(L[codigo].d - L[codigo].h) : 0);

/* ---------- Cálculos de estados ---------- */

export function calcular(cuentas: Cuenta[], asientos: Asiento[], invFinalManual: number | null) {
  const L = mayorDe(asientos);
  const mapa = new Map(cuentas.map(c => [c.codigo, c] as const));
  const has = (codigo: string) => !!L[codigo] && (L[codigo].d !== 0 || L[codigo].h !== 0);
  const inG = (grupo: string) => cuentas.filter(a => a.grupo === grupo && has(a.codigo));

  // Sistema periódico si no hay movimiento en 5100 (costo de ventas).
  const periodic = !has('5100');
  const invIni = saldo(L, '1004');
  const compras = r2(['5000', '5001', '5002', '5003'].reduce((s, c) => s + saldo(L, c), 0));
  const invFin = periodic ? (invFinalManual ?? invIni) : invIni;
  const ventas = r2(inG('ING').reduce((s, a) => s - saldo(L, a.codigo), 0));
  const costo = periodic ? r2(invIni + compras - invFin) : saldo(L, '5100');
  const sumG = (grupo: string) => r2(inG(grupo).reduce((s, a) => s + saldo(L, a.codigo), 0));
  const gv = sumG('GV');
  const ga = sumG('GA');
  const gf = sumG('GF');
  const og = sumG('OG');
  const isr = sumG('ISR');
  const oi = -sumG('OI');
  const ub = r2(ventas - costo);
  const uo = r2(ub - gv - ga);
  const uai = r2(uo + oi - gf - og);
  const un = r2(uai - isr);

  return {
    L, periodic, invIni, invFin, compras, ventas, costo,
    gv, ga, gf, og, isr, oi, ub, uo, uai, un,
    has,
    inG,
    cuentaDe: (codigo: string) => mapa.get(codigo),
    nombreDe: (codigo: string) => mapa.get(codigo)?.nombre ?? '(cuenta no encontrada)',
    esRegulador: (codigo: string) => mapa.get(codigo)?.reguladora ?? false,
  };
}

export type Calculo = ReturnType<typeof calcular>;

export function estadoResultados(C: Calculo): Fila[] {
  const { L } = C;
  const f: Fila[] = [];
  const add = (t: string, a1: number | null = null, a2: number | null = null, estilo?: Estilo) =>
    f.push({ t, a1, a2, estilo });

  add('Ingresos', null, null, 'sec');
  C.inG('ING').forEach(a => add(a.nombre, -saldo(L, a.codigo), null, 'ind'));
  add('Ventas netas', null, C.ventas, 'sub');

  add('Costo de ventas', null, null, 'sec');
  if (C.periodic) {
    add('Inventario inicial de mercancías', C.invIni, null, 'ind');
    ['5000', '5001', '5002', '5003'].forEach(c => {
      if (C.has(c)) add(`${C.esRegulador(c) ? 'Menos: ' : 'Más: '}${C.nombreDe(c)}`, saldo(L, c), null, 'ind');
    });
    add('Mercancía disponible para la venta', r2(C.invIni + C.compras), null, 'ind');
    add('Menos: Inventario final', -C.invFin, null, 'ind');
  }
  add('Costo de ventas', null, -C.costo, 'sub');
  add(C.ub < 0 ? 'Pérdida bruta' : 'Utilidad bruta en ventas', null, C.ub, 'sub');

  add('Gastos de operación', null, null, 'sec');
  C.inG('GV').forEach(a => add(a.nombre, saldo(L, a.codigo), null, 'ind'));
  if (C.gv) add('Total gastos de ventas', null, -C.gv, 'sub');
  C.inG('GA').forEach(a => add(a.nombre, saldo(L, a.codigo), null, 'ind'));
  if (C.ga) add('Total gastos generales y administrativos', null, -C.ga, 'sub');
  add(C.uo < 0 ? 'Pérdida en operaciones' : 'Utilidad en operaciones', null, C.uo, 'sub');

  if (C.oi || C.gf || C.og) {
    add('Otros ingresos y gastos', null, null, 'sec');
    C.inG('OI').forEach(a => add(a.nombre, -saldo(L, a.codigo), null, 'ind'));
    C.inG('GF').concat(C.inG('OG')).forEach(a => add(a.nombre, -saldo(L, a.codigo), null, 'ind'));
    add('Neto otros ingresos (gastos)', null, r2(C.oi - C.gf - C.og), 'sub');
  }
  add('Utilidad antes del ISR', null, C.uai, 'sub');
  if (C.isr) add('Impuesto sobre la renta', null, -C.isr, 'ind');
  add(C.un < 0 ? 'PÉRDIDA NETA DEL PERÍODO' : 'UTILIDAD NETA DEL PERÍODO', null, C.un, 'big');
  return f;
}

export function balanceGeneral(C: Calculo) {
  const { L } = C;
  const f: Fila[] = [];
  const nombreGrupo = (g: string) => GRUPOS[g].nombre.replace(/^\d+ · /, '');
  let tA = 0;
  let tP = 0;
  let tK = 0;

  f.push({ t: 'Activos', estilo: 'sec' });
  for (const g of ['AC', 'INV', 'PPE', 'DIF', 'OA']) {
    let lista = C.inG(g);
    // El inventario final aparece en el balance aunque no tenga movimiento (sistema periódico).
    const c1004 = C.cuentaDe('1004');
    if (g === 'AC' && C.periodic && !lista.some(a => a.codigo === '1004') && C.invFin && c1004) {
      lista = [...lista, c1004].sort((a, b) => ordenCodigo(a.codigo, b.codigo));
    }
    if (!lista.length) continue;
    let t = 0;
    f.push({ t: nombreGrupo(g), estilo: 'grupo' });
    lista.forEach(a => {
      const final = a.codigo === '1004' && C.periodic;
      const v = final ? C.invFin : saldo(L, a.codigo);
      t += v;
      f.push({ t: `${a.reguladora ? 'Menos: ' : ''}${a.nombre}${final ? ' (final)' : ''}`, a1: v, estilo: 'ind' });
    });
    f.push({ t: `Total ${nombreGrupo(g).toLowerCase()}`, a2: r2(t), estilo: 'sub' });
    tA += t;
  }
  f.push({ t: 'TOTAL ACTIVOS', a2: r2(tA), estilo: 'big' });

  f.push({ t: 'Pasivos', estilo: 'sec' });
  for (const g of ['PC', 'PLP', 'PD']) {
    const lista = C.inG(g);
    if (!lista.length) continue;
    let t = 0;
    lista.forEach(a => {
      const v = -saldo(L, a.codigo);
      t += v;
      f.push({ t: a.nombre, a1: v, estilo: 'ind' });
    });
    f.push({ t: `Total ${nombreGrupo(g).toLowerCase()}`, a2: r2(t), estilo: 'sub' });
    tP += t;
  }
  f.push({ t: 'Total pasivos', a2: r2(tP), estilo: 'sub' });

  f.push({ t: 'Capital contable', estilo: 'sec' });
  C.inG('K').forEach(a => {
    const v = -saldo(L, a.codigo);
    tK += v;
    f.push({ t: `${a.reguladora ? 'Menos: ' : ''}${a.nombre}`, a1: v, estilo: 'ind' });
  });
  if (C.has('7100') && !zero(saldo(L, '7100'))) {
    const v = -saldo(L, '7100');
    tK += v;
    f.push({ t: 'Resumen de Ganancias o Pérdidas', a1: v, estilo: 'ind' });
  }
  if (!zero(C.un)) {
    tK += C.un;
    f.push({ t: C.un < 0 ? 'Pérdida neta del período (sin cerrar)' : 'Utilidad neta del período (sin cerrar)', a1: C.un, estilo: 'ind' });
  }
  f.push({ t: 'Total capital', a2: r2(tK), estilo: 'sub' });
  f.push({ t: 'TOTAL PASIVO + CAPITAL', a2: r2(tP + tK), estilo: 'big' });

  return { filas: f, descuadre: r2(tA - tP - tK) };
}

export function balanza(C: Calculo) {
  let td = 0;
  let th = 0;
  let sd = 0;
  let sc = 0;
  const filas = Object.keys(C.L).sort(ordenCodigo).map(codigo => {
    const x = C.L[codigo];
    const s = r2(x.d - x.h);
    td += x.d;
    th += x.h;
    if (s > 0) sd += s;
    else sc -= s;
    return {
      codigo,
      nombre: C.nombreDe(codigo),
      debe: x.d,
      haber: x.h,
      sd: s > 0 ? s : null,
      sc: s < 0 ? -s : null,
    };
  });
  const totales = { debe: r2(td), haber: r2(th), sd: r2(sd), sc: r2(sc) };
  return { filas, totales, cuadra: zero(td - th) && zero(sd - sc) };
}

/* ---------- Asientos de cierre ---------- */

export function asientosDeCierre(C: Calculo, cuentas: Cuenta[], fecha: string): Borrador[] {
  const out: Borrador[] = [];

  // Salda cada cuenta de la lista contra 7100 y devuelve el neto trasladado.
  const cerrar = (lista: Cuenta[], concepto: string, extra: Linea[] = []) => {
    const lineas: Linea[] = [];
    let neto = 0;
    lista.forEach(a => {
      const b = saldo(C.L, a.codigo);
      if (zero(b)) return;
      if (b > 0) lineas.push({ c: a.codigo, d: 0, h: b });
      else lineas.push({ c: a.codigo, d: -b, h: 0 });
      neto += b;
    });
    extra.forEach(l => {
      lineas.push(l);
      neto += l.h - l.d;
    });
    neto = r2(neto);
    if (!lineas.length) return;
    if (neto > 0) lineas.push({ c: '7100', d: neto, h: 0 });
    else if (neto < 0) lineas.push({ c: '7100', d: 0, h: -neto });
    out.push({ fecha, concepto, lineas });
  };

  cerrar(
    cuentas.filter(a => claseDe(a) === 'I'),
    'Cierre: para cerrar las cuentas de ingresos contra Resumen de Ganancias o Pérdidas.',
  );

  const inv: Linea[] = [];
  if (C.periodic) {
    if (C.invIni > 0) inv.push({ c: '1004', d: 0, h: C.invIni });
    if (C.invFin > 0) inv.push({ c: '1004', d: C.invFin, h: 0 });
  }
  cerrar(
    cuentas.filter(a => ['CO', 'G'].includes(claseDe(a))),
    'Cierre: para cerrar costos y gastos, cancelar el inventario inicial y registrar el inventario final.',
    inv,
  );

  const res = r2(C.un - saldo(C.L, '7100'));
  if (!zero(res)) {
    out.push({
      fecha,
      concepto: res > 0
        ? 'Cierre: para trasladar la utilidad del período a Ganancias del Período.'
        : 'Cierre: para trasladar la pérdida del período a Ganancias del Período.',
      lineas: res > 0
        ? [{ c: '7100', d: res, h: 0 }, { c: '3202', d: 0, h: res }]
        : [{ c: '3202', d: -res, h: 0 }, { c: '7100', d: 0, h: -res }],
    });
  }
  return out;
}

/* ---------- Libro fiscal 606 (compras) y 607 (ventas) ---------- */

export interface FilaFiscal {
  rnc: string;
  tipo: string;
  tipoBien: string;
  ncf: string;
  fecha: string;
  concepto: string;
  monto: number;
  itbis: number;
  cuenta: string;
}

// Compras: líneas de costo o gasto con NCF y RNC. Ventas: líneas de ingreso con NCF y RNC.
// El ITBIS del asiento (1008 en compras, 2004 en ventas) se asigna a la primera línea.
export function libroFiscal(asientos: Asiento[]) {
  const compras: FilaFiscal[] = [];
  const ventas: FilaFiscal[] = [];
  const tid = (rnc?: string) => (rnc ? (rnc.length === 9 ? '1' : '2') : '');

  asientos.forEach(e => {
    const itC = r2(e.lineas.filter(l => l.c === '1008').reduce((s, l) => s + l.d, 0));
    const itV = r2(e.lineas.filter(l => l.c === '2004').reduce((s, l) => s + l.h, 0));
    let usedC = false;
    let usedV = false;
    e.lineas.forEach(l => {
      if (!l.ncf && !l.rnc) return;
      if (l.d > 0 && /^(5|6|12)/.test(l.c)) {
        compras.push({
          rnc: l.rnc ?? '', tipo: tid(l.rnc), tipoBien: l.tipo ?? '', ncf: l.ncf ?? '',
          fecha: e.fecha, concepto: e.concepto, monto: l.d, itbis: usedC ? 0 : itC, cuenta: l.c,
        });
        usedC = true;
      } else if (l.h > 0 && /^4/.test(l.c)) {
        ventas.push({
          rnc: l.rnc ?? '', tipo: tid(l.rnc), tipoBien: l.tipo ?? '', ncf: l.ncf ?? '',
          fecha: e.fecha, concepto: e.concepto, monto: l.h, itbis: usedV ? 0 : itV, cuenta: l.c,
        });
        usedV = true;
      }
    });
  });
  return { compras, ventas };
}

/* ---------- Hojas para Excel y CSV ---------- */

export function hojaDiario(asientos: Asiento[], cuentas: Cuenta[]): Celda[][] {
  const filas: Celda[][] = [['Fecha', 'Asiento', 'Concepto', 'Código', 'Cuenta', 'Debe', 'Haber']];
  asientos.forEach((a, i) =>
    a.lineas.forEach(l => filas.push([a.fecha, i + 1, a.concepto, l.c, nombreCuenta(cuentas, l.c), l.d || null, l.h || null])),
  );
  return filas;
}

export function hojaMayor(L: LibroMayor, cuentas: Cuenta[]): Celda[][] {
  const filas: Celda[][] = [['Código', 'Cuenta', 'Asiento', 'Debe', 'Haber', 'Saldo']];
  Object.keys(L).sort(ordenCodigo).forEach(c => {
    let run = 0;
    L[c].movs.forEach(m => {
      run = r2(run + m.d - m.h);
      filas.push([c, nombreCuenta(cuentas, c), m.n, m.d || null, m.h || null, run]);
    });
    filas.push([c, 'Totales', null, L[c].d, L[c].h, r2(L[c].d - L[c].h)]);
    filas.push([]);
  });
  return filas;
}

export function hojaFiscal(lista: FilaFiscal[]): Celda[][] {
  return [
    ['RNC/Cédula', 'Tipo ID', 'Tipo bien/servicio', 'NCF', 'Fecha comprobante', 'Concepto', 'Monto sin ITBIS', 'ITBIS', 'Cuenta'],
    ...lista.map(f => [f.rnc, f.tipo, f.tipoBien, f.ncf, f.fecha.replace(/-/g, ''), f.concepto, f.monto, f.itbis, f.cuenta]),
  ];
}

// Formato del CSV que importa Hello (Formato 606).
export function csvFiscal(lista: FilaFiscal[]): Celda[][] {
  return [
    ['rnc', 'ncf', 'tipo_bien', 'fecha', 'concepto', 'monto', 'itbis'],
    ...lista.map(f => [f.rnc, f.ncf, f.tipoBien, f.fecha, f.concepto, f.monto, f.itbis]),
  ];
}

export function hojaBalanza(B: ReturnType<typeof balanza>): Celda[][] {
  return [
    ['Código', 'Cuenta', 'Débitos', 'Créditos', 'Saldo deudor', 'Saldo acreedor'],
    ...B.filas.map(f => [f.codigo, f.nombre, f.debe, f.haber, f.sd, f.sc]),
    ['', 'Totales', B.totales.debe, B.totales.haber, B.totales.sd, B.totales.sc],
  ];
}

export function hojaFilas(filas: Fila[]): Celda[][] {
  return filas.map(f => [(f.estilo === 'ind' ? '    ' : '') + f.t, f.a1 ?? null, f.a2 ?? null]);
}
