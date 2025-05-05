import './globals.css';
import type { Metadata } from 'next';
// Remover import direto do react-hot-toast
import { ToasterProvider } from '@/components/toaster-provider'; // Importar o provider

export const metadata: Metadata = {
  title: 'DataGem',
  description: 'Inteligência estratégica para performance de marketing digital',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="min-h-screen bg-background">
          {children}
          <ToasterProvider /> {/* Usar o provider */}
        </main>
      </body>
    </html>
  );
}
