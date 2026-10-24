// Catálogo base basado en el catálogo UTESA, ampliado para práctica.
// Cada empresa recibe una copia propia al crearse; puede agregar cuentas.
// El código de grupo (AC, PC, ...) determina la clase (1 a 7) y la naturaleza por defecto.

export const CLASES: Record<string, string> = {
  A: '1 · Activos',
  P: '2 · Pasivos',
  K: '3 · Capital',
  I: '4 · Ingresos',
  CO: '5 · Costos',
  G: '6 · Gastos',
  L: '7 · Liquidación y resumen',
};

export const GRUPOS: Record<string, { nombre: string; clase: string }> = {
  AC: { nombre: '10 · Activos corrientes', clase: 'A' },
  INV: { nombre: '11 · Inversiones', clase: 'A' },
  PPE: { nombre: '12 · Propiedad, planta y equipo', clase: 'A' },
  DIF: { nombre: '13 · Diferidos', clase: 'A' },
  OA: { nombre: '14 · Otros activos', clase: 'A' },
  PC: { nombre: '20 · Pasivos corrientes', clase: 'P' },
  PLP: { nombre: '21 · Pasivos a largo plazo', clase: 'P' },
  PD: { nombre: '22 · Pasivos diferidos', clase: 'P' },
  K: { nombre: '30 · Capital contable', clase: 'K' },
  ING: { nombre: '40 · Ingresos operacionales', clase: 'I' },
  OI: { nombre: '41 · Otros ingresos', clase: 'I' },
  COS: { nombre: '50 · Costos', clase: 'CO' },
  GV: { nombre: '60 · Gastos de ventas', clase: 'G' },
  GA: { nombre: '61 · Gastos generales y administrativos', clase: 'G' },
  GF: { nombre: '62 · Gastos financieros', clase: 'G' },
  OG: { nombre: '63 · Otros gastos', clase: 'G' },
  ISR: { nombre: '64 · Impuesto sobre la renta', clase: 'G' },
  L: { nombre: '71 · Cuentas de liquidación', clase: 'L' },
};

// Naturaleza por defecto de cada clase: D = deudora, C = acreedora.
export const BASE_NAT: Record<string, 'D' | 'C'> = {
  A: 'D', P: 'C', K: 'C', I: 'C', CO: 'D', G: 'D', L: 'C',
};

// [código, nombre, grupo, reguladora?]. Las reguladoras van contra su grupo ("Menos: ...").
export const CUENTAS_BASE: [string, string, string, 1?][] = [
  ['1000-01', 'Caja General', 'AC'], ['1000-02', 'Banco del Exterior Dominicano', 'AC'], ['1000-03', 'Banco Popular Dominicano', 'AC'],
  ['1000-04', 'Banco de Reservas', 'AC'], ['1000-05', 'Banco BHD', 'AC'],
  ['1001', 'Caja Chica', 'AC'],
  ['1002-01', 'Cuentas por Cobrar – Clientes', 'AC'], ['1002-02', 'Cuentas por Cobrar – Funcionarios y Empleados', 'AC'],
  ['1002-03', 'Cheques Devueltos', 'AC'], ['1002-04', 'Documentos por Cobrar', 'AC'],
  ['1003', 'Provisión para Cuentas Dudosas', 'AC', 1], ['1004', 'Inventario de Mercancías', 'AC'], ['1005', 'Mercancías en Tránsito', 'AC'],
  ['1006', 'Anticipo al Impuesto sobre la Renta', 'AC'],
  ['1007-01', 'Seguros Pagados por Adelantado', 'AC'], ['1007-02', 'Placas Pagadas por Adelantado', 'AC'],
  ['1007-03', 'Patentes Pagadas por Adelantado', 'AC'], ['1007-04', 'Sueldos Pagados por Adelantado', 'AC'],
  ['1007-05', 'Alquileres Pagados por Adelantado', 'AC'],
  ['1008', 'ITBIS Pagado (Crédito Fiscal)', 'AC'], ['1009', 'Papelería y Útiles de Oficina', 'AC'],
  ['1100', 'Acciones de Otras Compañías', 'INV'], ['1101', 'Bonos y Títulos Valores', 'INV'], ['1102', 'Certificados de Depósito a Plazo', 'INV'],
  ['1200', 'Terrenos', 'PPE'], ['1201', 'Edificios', 'PPE'], ['1202', 'Depreciación Acumulada – Edificios', 'PPE', 1],
  ['1203', 'Muebles y Equipos de Oficina', 'PPE'], ['1204', 'Depreciación Acumulada – Muebles y Equipos', 'PPE', 1],
  ['1205', 'Equipos de Transporte', 'PPE'], ['1206', 'Depreciación Acumulada – Equipos de Transporte', 'PPE', 1],
  ['1207', 'Maquinarias y Equipos', 'PPE'], ['1208', 'Depreciación Acumulada – Maquinarias', 'PPE', 1],
  ['1209', 'Equipos de Cómputo', 'PPE'], ['1210', 'Depreciación Acumulada – Equipos de Cómputo', 'PPE', 1],
  ['1300', 'Gastos de Organización', 'DIF'], ['1301', 'Amortización Acumulada – Gastos de Organización', 'DIF', 1],
  ['1302', 'Mejoras en Propiedad Arrendada', 'DIF'],
  ['1401', 'Fianzas', 'OA'], ['1402', 'Depósitos', 'OA'], ['1403', 'Marcas y Patentes', 'OA'],
  ['2000', 'Sobregiros Bancarios', 'PC'], ['2001', 'Cuentas por Pagar – Proveedores', 'PC'], ['2002', 'Documentos por Pagar', 'PC'],
  ['2003', 'Porción Corriente de Préstamos', 'PC'], ['2004', 'ITBIS por Pagar', 'PC'],
  ['2005', 'Impuesto sobre la Renta por Pagar', 'PC'], ['2006', 'Dividendos por Pagar', 'PC'],
  ['2007-01', 'Retenciones – Seguridad Social (TSS)', 'PC'], ['2007-02', 'Retenciones – ISR Asalariados', 'PC'],
  ['2007-03', 'Sueldos por Pagar', 'PC'], ['2007-04', 'Intereses Acumulados por Pagar', 'PC'],
  ['2007-05', 'Regalía Pascual Acumulada', 'PC'], ['2007-06', 'Prestaciones Laborales Acumuladas', 'PC'],
  ['2007-07', 'Aportes Patronales TSS por Pagar', 'PC'], ['2008', 'Anticipos de Clientes', 'PC'],
  ['2100', 'Préstamos Bancarios a Largo Plazo', 'PLP'], ['2101', 'Documentos por Pagar a Largo Plazo', 'PLP'],
  ['2102', 'Hipotecas por Pagar', 'PLP'],
  ['2200', 'Ingresos Cobrados por Adelantado', 'PD'], ['2201', 'Alquileres Cobrados por Adelantado', 'PD'],
  ['3000', 'Capital Autorizado (Capital Social)', 'K'], ['3001', 'Aportes para Futuras Capitalizaciones', 'K'],
  ['3002', 'Retiros del Propietario', 'K', 1], ['3100', 'Reserva Legal', 'K'],
  ['3200', 'Ganancias Acumuladas', 'K'], ['3201', 'Pérdidas Acumuladas', 'K', 1], ['3202', 'Ganancias del Período', 'K'],
  ['4000', 'Ventas de Contado', 'ING'], ['4001', 'Ventas a Crédito', 'ING'],
  ['4002', 'Devoluciones y Rebajas en Ventas', 'ING', 1], ['4003', 'Descuentos en Ventas', 'ING', 1],
  ['4100', 'Intereses Ganados', 'OI'], ['4101', 'Ingresos por Alquiler', 'OI'], ['4102', 'Comisiones Ganadas', 'OI'],
  ['4103', 'Ganancia en Venta de Activos', 'OI'], ['4104', 'Otros Ingresos', 'OI'],
  ['5000', 'Compras de Mercancías', 'COS'], ['5001', 'Fletes en Compras', 'COS'],
  ['5002', 'Devoluciones y Rebajas en Compras', 'COS', 1], ['5003', 'Descuentos en Compras', 'COS', 1],
  ['5100', 'Costo de Ventas', 'COS'],
  ['6000-01', 'Sueldos de Vendedores', 'GV'], ['6000-02', 'Comisiones sobre Ventas', 'GV'], ['6000-03', 'Publicidad y Propaganda', 'GV'],
  ['6000-04', 'Fletes en Ventas', 'GV'], ['6000-05', 'Cuentas Incobrables', 'GV'], ['6000-06', 'Combustible y Lubricantes', 'GV'],
  ['6000-07', 'Empaques y Envolturas', 'GV'],
  ['6100-01', 'Sueldos', 'GA'], ['6100-02', 'Horas Extras', 'GA'], ['6100-03', 'Regalía Pascual', 'GA'],
  ['6100-04', 'Seguro Social (TSS Patronal)', 'GA'], ['6100-05', 'INFOTEP', 'GA'], ['6100-06', 'Alquiler', 'GA'],
  ['6100-07', 'Depreciación', 'GA'], ['6100-08', 'Materiales de Oficina', 'GA'], ['6100-09', 'Seguros', 'GA'],
  ['6100-10', 'Reparaciones y Mantenimiento', 'GA'], ['6100-11', 'Agua', 'GA'], ['6100-12', 'Amortización', 'GA'],
  ['6100-13', 'Teléfono', 'GA'], ['6100-14', 'Energía Eléctrica', 'GA'], ['6100-15', 'Internet', 'GA'],
  ['6100-16', 'Limpieza', 'GA'], ['6100-17', 'Honorarios Profesionales', 'GA'], ['6100-18', 'Impuestos y Patentes', 'GA'],
  ['6100-19', 'Gastos de Viaje', 'GA'], ['6100-20', 'Gastos Varios', 'GA'],
  ['6200-01', 'Intereses sobre Préstamos', 'GF'], ['6200-02', 'Comisiones y Cargos Bancarios', 'GF'], ['6200-03', 'Pérdida Cambiaria', 'GF'],
  ['6300-01', 'Pérdida en Venta de Activos', 'OG'], ['6300-02', 'Multas y Recargos', 'OG'],
  ['6400', 'Gasto de Impuesto sobre la Renta', 'ISR'],
  ['7100', 'Resumen de Ganancias o Pérdidas', 'L'],
];

// Naturaleza de una cuenta según su grupo; las reguladoras la invierten.
export function naturalezaDe(grupo: string, reguladora: boolean): 'D' | 'C' {
  const base = BASE_NAT[GRUPOS[grupo]?.clase ?? 'A'];
  return reguladora ? (base === 'D' ? 'C' : 'D') : base;
}

export const CATALOGO_BASE = CUENTAS_BASE.map(([codigo, nombre, grupo, reg]) => ({
  codigo,
  nombre,
  grupo,
  naturaleza: naturalezaDe(grupo, reg === 1),
  reguladora: reg === 1,
  propia: false,
}));
