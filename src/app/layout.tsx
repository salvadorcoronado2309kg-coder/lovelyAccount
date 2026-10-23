import type { ReactNode } from 'react';

export const metadata = {
  title: 'LovelyAccount',
  description: 'Contabilidad para aprender y para trabajar.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', color: '#111827', background: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
