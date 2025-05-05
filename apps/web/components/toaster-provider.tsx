'use client';

import { Toaster as SonnerToaster } from 'sonner'; // Renomear para evitar conflito se necessário

export function ToasterProvider() {
  // Usar o Toaster do Sonner, que já funciona no client component
  // Verificar a documentação do Sonner para opções de posicionamento se necessário
  return <SonnerToaster position="bottom-right" richColors />;
}