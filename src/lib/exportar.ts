import { fp, type Celda, type Estilo } from './contabilidad';

// Quita los caracteres que no sirven en un nombre de archivo.
export const nombreSeguro = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '');

export function descargarBlob(contenido: BlobPart, tipo: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarCSV(nombre: string, filas: Celda[][]) {
  // BOM para que Excel abra bien los acentos.
  const q = (v: Celda) => {
    const t = v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = '﻿' + filas.map(f => f.map(q).join(',')).join('\n');
  descargarBlob(texto, 'text/csv;charset=utf-8', nombre);
}

export async function descargarExcel(nombre: string, hojas: { nombre: string; filas: Celda[][] }[]) {
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  hojas.forEach(h => XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(h.filas), h.nombre));
  XLSX.writeFile(libro, nombre);
}

export interface FilaPDF {
  celdas: Celda[];
  estilo?: Estilo | 'th';
}

// Ancho de cada columna en mm. Un 0 ocupa el espacio que sobra.
export async function descargarPDF(
  nombre: string,
  titulo: string,
  subtitulo: string,
  encabezado: Celda[] | null,
  filas: FilaPDF[],
  opciones: { apaisado: boolean; anchos?: number[] },
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: opciones.apaisado ? 'l' : 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const LH = 5;

  const n = Math.max(1, ...filas.map(f => f.celdas.length), encabezado?.length ?? 0);
  const base = opciones.anchos ?? [0, ...Array.from({ length: n - 1 }, () => 30)];
  const libre = W - 2 * M - base.reduce((s, w) => s + w, 0);
  const ws = base.map(w => w || libre);
  const xs: number[] = [];
  ws.reduce((x, w) => {
    xs.push(x);
    return x + w;
  }, M);

  const texto = (c: Celda) => (c == null ? '' : typeof c === 'number' ? fp(c) : c);

  let y = M;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(titulo, W / 2, y + 4, { align: 'center' });
  y += 8;
  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitulo, W / 2, y + 3, { align: 'center' });
    y += 6;
  }

  const todas: FilaPDF[] = encabezado ? [{ celdas: encabezado, estilo: 'th' }, ...filas] : filas;
  for (const f of todas) {
    if (!f.celdas.length) {
      y += 3;
      continue;
    }
    const estilo = f.estilo ?? '';
    const negrita = ['sec', 'sub', 'big', 'th'].includes(estilo);
    doc.setFont('helvetica', negrita ? 'bold' : 'normal');
    doc.setFontSize(estilo === 'th' ? 8 : 9);
    if (estilo === 'sec') doc.setTextColor(13, 107, 90);
    else doc.setTextColor(20, 20, 20);

    const sangria = estilo === 'ind' ? 5 : 0;
    const derecha = (i: number, c: Celda) => i > 0 && (typeof c !== 'string' || estilo === 'th');
    const cols: string[][] = f.celdas.map((c, i) => {
      const s = texto(c);
      const ancho = ws[i] - 2 - (i === 0 ? sangria : 0);
      return derecha(i, c) ? [s] : doc.splitTextToSize(s, ancho);
    });
    const lineas = Math.max(1, ...cols.map(c => c.length));
    if (y + lineas * LH + 2 > H - M) {
      doc.addPage();
      y = M;
    }

    const top = y;
    if (estilo === 'sub' || estilo === 'big') {
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.2);
      doc.line(xs[1] ?? M, top + 0.8, W - M, top + 0.8);
    }
    cols.forEach((ln, i) => {
      ln.forEach((linea, j) => {
        const yy = top + 4 + j * LH;
        if (derecha(i, f.celdas[i])) doc.text(linea, xs[i] + ws[i] - 1, yy, { align: 'right' });
        else doc.text(linea, xs[i] + (i === 0 ? sangria : 0), yy);
      });
    });
    y = top + lineas * LH + 1;
    if (estilo === 'th') {
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.4);
      doc.line(M, y - 0.5, W - M, y - 0.5);
      y += 1;
    }
    if (estilo === 'big') {
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.5);
      doc.line(xs[1] ?? M, y - 0.2, W - M, y - 0.2);
    }
  }
  doc.save(nombre);
}
