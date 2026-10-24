import { zero, r2, type Linea } from './contabilidad';

export interface Ejercicio {
  fecha: string;
  texto: string;
  solucion: [codigo: string, debe: number, haber: number][];
}

export const EJERCICIOS: Ejercicio[] = [
  {
    fecha: '2026-10-01',
    texto: 'Se constituye la empresa. Los socios aportan RD$500,000 en efectivo, depositados en el Banco Popular, y mercancías valoradas en RD$150,000.',
    solucion: [['1000-03', 500000, 0], ['1004', 150000, 0], ['3000', 0, 650000]],
  },
  {
    fecha: '2026-10-02',
    texto: 'Se compran muebles y equipos de oficina por RD$60,000, pagados con cheque del Banco Popular.',
    solucion: [['1203', 60000, 0], ['1000-03', 0, 60000]],
  },
  {
    fecha: '2026-10-03',
    texto: 'Se compran mercancías a crédito por RD$80,000 más 18% de ITBIS.',
    solucion: [['5000', 80000, 0], ['1008', 14400, 0], ['2001', 0, 94400]],
  },
  {
    fecha: '2026-10-05',
    texto: 'Se venden mercancías al contado por RD$45,000 más 18% de ITBIS. El dinero entra a Caja General.',
    solucion: [['1000-01', 53100, 0], ['4000', 0, 45000], ['2004', 0, 8100]],
  },
  {
    fecha: '2026-10-06',
    texto: 'Se venden mercancías a crédito a un cliente por RD$70,000 más 18% de ITBIS.',
    solucion: [['1002-01', 82600, 0], ['4001', 0, 70000], ['2004', 0, 12600]],
  },
  {
    fecha: '2026-10-07',
    texto: 'Se paga con cheque del Banco Popular una póliza de seguro por un año: RD$24,000.',
    solucion: [['1007-01', 24000, 0], ['1000-03', 0, 24000]],
  },
  {
    fecha: '2026-10-08',
    texto: 'Se crea un fondo de Caja Chica por RD$10,000 con cheque del Banco Popular.',
    solucion: [['1001', 10000, 0], ['1000-03', 0, 10000]],
  },
  {
    fecha: '2026-10-12',
    texto: 'Un cliente abona RD$40,000 a su cuenta. Se deposita en el Banco Popular.',
    solucion: [['1000-03', 40000, 0], ['1002-01', 0, 40000]],
  },
  {
    fecha: '2026-10-14',
    texto: 'Se pagan RD$50,000 a proveedores con cheque del Banco Popular.',
    solucion: [['2001', 50000, 0], ['1000-03', 0, 50000]],
  },
  {
    fecha: '2026-10-15',
    texto: 'El Banco Popular concede un préstamo a 3 años por RD$200,000, acreditado a la cuenta corriente.',
    solucion: [['1000-03', 200000, 0], ['2100', 0, 200000]],
  },
  {
    fecha: '2026-10-20',
    texto: 'Se pagan con cheque del Banco Popular: energía eléctrica RD$4,500 y teléfono RD$3,200.',
    solucion: [['6100-14', 4500, 0], ['6100-13', 3200, 0], ['1000-03', 0, 7700]],
  },
  {
    fecha: '2026-10-30',
    texto: 'Se paga la nómina del mes: sueldos RD$60,000. Se retiene a los empleados 5.91% de TSS (AFP 2.87% + SFS 3.04%). El neto se paga con cheque del Banco Popular.',
    solucion: [['6100-01', 60000, 0], ['2007-01', 0, 3546], ['1000-03', 0, 56454]],
  },
  {
    fecha: '2026-10-31',
    texto: 'Ajuste: se reconoce como gasto un mes del seguro pagado por adelantado (RD$24,000 ÷ 12).',
    solucion: [['6100-09', 2000, 0], ['1007-01', 0, 2000]],
  },
  {
    fecha: '2026-10-31',
    texto: 'Ajuste: depreciación mensual de los muebles (RD$60,000, vida útil 5 años, línea recta, sin valor residual).',
    solucion: [['6100-07', 1000, 0], ['1204', 0, 1000]],
  },
  {
    fecha: '2026-10-31',
    texto: 'Se pagan RD$2,500 de intereses del préstamo con cheque del Banco Popular.',
    solucion: [['6200-01', 2500, 0], ['1000-03', 0, 2500]],
  },
];

// Compara el asiento del usuario con la solución por cuenta (Debe menos Haber).
export function compararAsiento(
  solucion: Ejercicio['solucion'],
  lineas: Linea[],
  nombre: (codigo: string) => string,
): { ok: boolean; mensaje: string } {
  const quiere: Record<string, number> = {};
  const tiene: Record<string, number> = {};
  solucion.forEach(([c, d, h]) => {
    quiere[c] = r2((quiere[c] ?? 0) + d - h);
  });
  lineas.forEach(l => {
    tiene[l.c] = r2((tiene[l.c] ?? 0) + l.d - l.h);
  });

  const extra = Object.keys(tiene).filter(c => !(c in quiere));
  const faltan = Object.keys(quiere).filter(c => !(c in tiene));
  const mal = Object.keys(quiere).filter(c => c in tiene && !zero(tiene[c] - quiere[c]));
  if (!extra.length && !faltan.length && !mal.length) return { ok: true, mensaje: '' };

  const partes: string[] = [];
  if (extra.length) partes.push(`Estas cuentas no van en este asiento: ${extra.map(c => nombre(c)).join(', ')}.`);
  if (faltan.length) partes.push(`Te falta${faltan.length > 1 ? 'n' : ''} ${faltan.length} cuenta${faltan.length > 1 ? 's' : ''}.`);
  if (mal.length) partes.push(`Revisa el monto o el lado (Debe/Haber) de: ${mal.map(c => nombre(c)).join(', ')}.`);
  return { ok: false, mensaje: `Todavía no. ${partes.join(' ')}` };
}
