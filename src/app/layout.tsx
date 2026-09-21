import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Gestión de Documentos - Azurian',
  description: 'Portal de evaluación práctica para QA Automation - Azurian',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
