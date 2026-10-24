import { fm, nombreCuenta, type Cuenta, type Linea } from '@/lib/contabilidad';

// Tabla de un asiento: primero las líneas al Debe, luego las del Haber.
export default function Jornal({ lineas, cuentas }: { lineas: Linea[]; cuentas: Cuenta[] }) {
  const ordenadas = [...lineas].sort((x, y) => (y.d > 0 ? 1 : 0) - (x.d > 0 ? 1 : 0));
  return (
    <table className="jrn-t">
      <thead>
        <tr><th>Cuenta</th><th>Debe</th><th>Haber</th></tr>
      </thead>
      <tbody>
        {ordenadas.map((l, i) => (
          <tr key={i} className={l.h > 0 ? 'cr' : ''}>
            <td><span className="code">{l.c}</span>{nombreCuenta(cuentas, l.c)}</td>
            <td className="amt d">{l.d ? fm(l.d) : ''}</td>
            <td className="amt h">{l.h ? fm(l.h) : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
