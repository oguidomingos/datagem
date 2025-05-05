import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ConnectionsClient from '../../../connections/connections-client';
import { ProviderConfig } from '@/types'; // Importar ProviderConfig

// Função para buscar dados no servidor (similar à que estava em connections-server.tsx)
// Podemos manter a getConnections separada ou trazê-la para cá se preferir.
// Mantendo separada por enquanto:
import { getConnections } from '../../../connections/connections-server';

interface ConnectionsPageProps {
  params: {
    project_id: string;
  };
}

export default async function ConnectionsPage({ params }: ConnectionsPageProps) {
  const projectId = params.project_id;

  // 1. Usar createServerComponentClient e buscar dados
  // A função getConnections já faz isso.
  const { providers, tokens, error } = await getConnections(projectId);

  // 2. Log no servidor para depuração
  console.log('ConnectionsPage (Server) - Project ID:', projectId);
  console.log('ConnectionsPage (Server) - Fetched Providers:', providers);
  console.log('ConnectionsPage (Server) - Fetched Tokens:', tokens);
  if (error) {
    console.error('ConnectionsPage (Server) - Error fetching data:', error);
    // Você pode querer renderizar uma mensagem de erro aqui
  }

  // 3. Passar dados para o Client Component
  return (
    <ConnectionsClient
      providers={providers as ProviderConfig[] | undefined} // Garantir tipo
      tokens={tokens}
    />
  );
}