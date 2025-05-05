import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const AIRBYTE_API_URL = process.env.AIRBYTE_API_URL || 'http://localhost:8000/api/v1';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD; // Necessário para a destination

// --- Funções Auxiliares da API Airbyte ---

async function apiCall(endpoint: string, method: string = 'POST', body: any = null) {
  // Detect Docker environment based on Supabase URL for simplicity
  const isDockerEnvironment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');
  let effectiveAirbyteApiUrl = AIRBYTE_API_URL;

  if (isDockerEnvironment && effectiveAirbyteApiUrl.includes('localhost')) {
    effectiveAirbyteApiUrl = effectiveAirbyteApiUrl.replace('localhost', 'host.docker.internal');
    console.log(`Docker environment detected, using Airbyte URL: ${effectiveAirbyteApiUrl}`);
  }

  const url = `${effectiveAirbyteApiUrl}/${endpoint}`; // Use the potentially modified URL
  console.log(`Airbyte API Call: ${method} ${url}`, body ? JSON.stringify(body) : '');
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Adicionar autenticação se necessário (ex: Basic Auth)
        // 'Authorization': `Basic ${Buffer.from('airbyte:password').toString('base64')}`
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Airbyte API Error (${response.status} ${response.statusText}) for ${method} ${url}: ${errorText}`);
      throw new Error(`Airbyte API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Alguns endpoints retornam 204 No Content
    if (response.status === 204) {
      console.log(`Airbyte API Success (204 No Content) for ${method} ${url}`);
      return null;
    }

    const data = await response.json();
    console.log(`Airbyte API Success for ${method} ${url}`);
    return data;
  } catch (error) {
    console.error(`Failed to call Airbyte API ${method} ${url}:`, error);
    throw error; // Re-throw para ser pego pela função principal
  }
}

async function findWorkspaceId(): Promise<string> {
  // Geralmente há apenas um workspace padrão
  const data = await apiCall('workspaces/list');
  if (!data?.workspaces || data.workspaces.length === 0) {
    throw new Error('Nenhum workspace encontrado no Airbyte.');
  }
  // Assumir o primeiro workspace
  const workspaceId = data.workspaces[0].workspaceId;
  console.log(`Found workspaceId: ${workspaceId}`);
  return workspaceId;
}

async function findSourceDefinitionId(workspaceId: string, sourceName: string = 'WooCommerce'): Promise<string> {
  const data = await apiCall('source_definitions/list_for_workspace', 'POST', { workspaceId });
  const definition = data?.sourceDefinitions?.find((d: any) => d.name === sourceName);
  if (!definition) {
    throw new Error(`Definição de source '${sourceName}' não encontrada no Airbyte.`);
  }
  console.log(`Found sourceDefinitionId for ${sourceName}: ${definition.sourceDefinitionId}`);
  return definition.sourceDefinitionId;
}

async function findDestinationDefinitionId(workspaceId: string, destinationName: string = 'Postgres'): Promise<string> {
  const data = await apiCall('destination_definitions/list_for_workspace', 'POST', { workspaceId });
  // O destino Supabase usa o conector Postgres
  const definition = data?.destinationDefinitions?.find((d: any) => d.name === destinationName);
  if (!definition) {
    throw new Error(`Definição de destination '${destinationName}' não encontrada no Airbyte.`);
  }
  console.log(`Found destinationDefinitionId for ${destinationName}: ${definition.destinationDefinitionId}`);
  return definition.destinationDefinitionId;
}

async function findOrCreateSource(workspaceId: string, sourceDefinitionId: string, projectId: string, config: any): Promise<string> {
  const sourceName = `WooCommerce - Projeto ${projectId}`;
  const list = await apiCall('sources/list', 'POST', { workspaceId });
  let source = list?.sources?.find((s: any) => s.name === sourceName);

  if (source) {
    console.log(`Found existing source: ${source.sourceId} (${sourceName})`);
    // Opcional: Atualizar a configuração se necessário
    // await apiCall('sources/update', 'POST', { sourceId: source.sourceId, connectionConfiguration: config, name: sourceName });
    return source.sourceId;
  } else {
    console.log(`Creating new source: ${sourceName}`);
    const creationData = await apiCall('sources/create', 'POST', {
      workspaceId,
      sourceDefinitionId,
      connectionConfiguration: config,
      name: sourceName,
    });
    if (!creationData?.sourceId) {
      throw new Error('Falha ao criar source no Airbyte.');
    }
    console.log(`Created source: ${creationData.sourceId}`);
    return creationData.sourceId;
  }
}

async function findOrCreateDestination(workspaceId: string, destinationDefinitionId: string, projectId: string, config: any): Promise<string> {
  // Usar um nome único para a destination, pode ser global ou por projeto
  const destinationName = `Supabase Destination - Projeto ${projectId}`; // Ou um nome global
  const list = await apiCall('destinations/list', 'POST', { workspaceId });
  let destination = list?.destinations?.find((d: any) => d.name === destinationName);

  if (destination) {
    console.log(`Found existing destination: ${destination.destinationId} (${destinationName})`);
    return destination.destinationId;
  } else {
    console.log(`Creating new destination: ${destinationName}`);
    const creationData = await apiCall('destinations/create', 'POST', {
      workspaceId,
      destinationDefinitionId,
      connectionConfiguration: config,
      name: destinationName,
    });
    if (!creationData?.destinationId) {
      throw new Error('Falha ao criar destination no Airbyte.');
    }
    console.log(`Created destination: ${creationData.destinationId}`);
    return creationData.destinationId;
  }
}

async function findOrCreateConnection(workspaceId: string, sourceId: string, destinationId: string, projectId: string): Promise<string> {
  const connectionName = `WooCommerce to Supabase - Projeto ${projectId}`;
  const list = await apiCall('connections/list', 'POST', { workspaceId });
  let connection = list?.connections?.find((c: any) => c.name === connectionName && c.sourceId === sourceId && c.destinationId === destinationId);

  if (connection) {
     console.log(`Found existing connection: ${connection.connectionId} (${connectionName})`);
     return connection.connectionId;
  } else {
    console.log(`Creating new connection: ${connectionName}`);
    // Configuração básica da conexão (ajustar namespace, prefixo, streams conforme necessário)
    const connectionConfig = {
      name: connectionName,
      namespaceDefinition: "source", // ou 'destination' ou 'customformat'
      namespaceFormat: "${SOURCE_NAMESPACE}", // Padrão
      prefix: `woo_${projectId}_`, // Prefixo para tabelas no Supabase
      sourceId: sourceId,
      destinationId: destinationId,
      status: "active",
      scheduleType: "manual", // Sincronização manual via API
      // Configurar streams (opcional, por padrão sincroniza tudo)
      // syncCatalog: { streams: [ ... ] }
    };
    const creationData = await apiCall('connections/create', 'POST', connectionConfig);
     if (!creationData?.connectionId) {
      throw new Error('Falha ao criar connection no Airbyte.');
    }
    console.log(`Created connection: ${creationData.connectionId}`);
    return creationData.connectionId;
  }
}

async function triggerSync(connectionId: string): Promise<any> {
  console.log(`Triggering sync for connectionId: ${connectionId}`);
  const syncResult = await apiCall('connections/sync', 'POST', { connectionId });
  if (!syncResult?.job?.id) {
     throw new Error('Falha ao iniciar job de sincronização no Airbyte.');
  }
  console.log(`Sync job started: ${syncResult.job.id}`);
  return syncResult; // Retorna detalhes do job
}

// --- Função Principal ---

async function triggerAirbyteSync(projectId: string, wooCommerceToken: any): Promise<{ success: boolean; message: string; jobId?: number }> {
  console.log(`Iniciando sincronização Airbyte para o projeto: ${projectId}`);

  if (!SUPABASE_DB_PASSWORD) {
    console.error('Variável de ambiente SUPABASE_DB_PASSWORD não definida.');
    return { success: false, message: 'Configuração interna do servidor incompleta (DB Password).' };
  }
  if (!wooCommerceToken?.metadata?.store_url || !wooCommerceToken?.metadata?.consumer_key || !wooCommerceToken?.metadata?.consumer_secret) {
     console.error('Metadata do token WooCommerce incompleto:', wooCommerceToken?.metadata);
     return { success: false, message: 'Credenciais WooCommerce incompletas no token.' };
  }

  try {
    const workspaceId = await findWorkspaceId();
    const sourceDefinitionId = await findSourceDefinitionId(workspaceId);
    const destinationDefinitionId = await findDestinationDefinitionId(workspaceId);

    // Configuração da Source WooCommerce
    const sourceConfig = {
      shop: wooCommerceToken.metadata.store_url, // URL da loja
      api_key: wooCommerceToken.metadata.consumer_key, // Consumer Key
      api_secret: wooCommerceToken.metadata.consumer_secret, // Consumer Secret
      start_date: "2023-01-01T00:00:00Z", // Data inicial para buscar dados (ajustar)
      is_sandbox: false // Ajustar se for ambiente de teste
    };

    // Configuração da Destination Supabase (Postgres)
    // Assumindo que o Supabase está rodando localmente via Docker
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') ? 'host.docker.internal' : new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname; // Ou o nome do container se não for host.docker.internal
    const supabasePort = 5432; // Porta padrão do Postgres dentro do container Supabase
    const destinationConfig = {
      host: supabaseHost,
      port: supabasePort,
      database: 'postgres', // Database padrão do Supabase
      schema: 'public', // Schema onde as tabelas serão criadas (ex: public ou airbyte_raw)
      username: 'postgres', // Usuário padrão do Supabase
      password: SUPABASE_DB_PASSWORD,
      ssl_mode: { mode: 'disable' }, // Desabilitar SSL para conexão local
      tunnel_method: { tunnel_method: 'NO_TUNNEL' }
    };

    const sourceId = await findOrCreateSource(workspaceId, sourceDefinitionId, projectId, sourceConfig);
    const destinationId = await findOrCreateDestination(workspaceId, destinationDefinitionId, projectId, destinationConfig);
    const connectionId = await findOrCreateConnection(workspaceId, sourceId, destinationId, projectId);
    const syncJob = await triggerSync(connectionId);

    return { success: true, message: `Sincronização iniciada com sucesso. Job ID: ${syncJob.job.id}`, jobId: syncJob.job.id };

  } catch (error) {
    console.error(`Erro detalhado no triggerAirbyteSync para projeto ${projectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido durante a sincronização Airbyte.';
    return { success: false, message: `Falha na sincronização Airbyte: ${errorMessage}` };
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    const { project_id } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
    }

    try {
      // 1. Buscar token ativo do WooCommerce para o projeto
      const { data: token, error: tokenError } = await supabase
        .from('external_tokens')
        .select('*') // Selecionar tudo para ter as credenciais
        .eq('project_id', project_id)
        .eq('provider', 'woocommerce')
        .eq('status', 'active')
        .maybeSingle()

      if (tokenError) {
        // Verificar se é um erro de tabela inexistente
        if (tokenError.code === '42P01') {
          console.log('A tabela external_tokens não existe. Em ambiente de desenvolvimento, usamos dados de teste.');
          // Em ambiente de dev, podemos simular uma resposta
          return NextResponse.json({
            message: "Simulação de sincronização iniciada com sucesso.",
            jobId: "dev-" + Date.now()
          });
        } else {
          console.error('Erro ao buscar token WooCommerce:', tokenError)
          return NextResponse.json({ error: 'Erro interno ao buscar token.', code: tokenError.code }, { status: 500 })
        }
      }

      if (!token) {
        return NextResponse.json({ error: 'Conexão WooCommerce ativa não encontrada para este projeto.' }, { status: 404 })
      }

      // 2. Chamar a lógica de sincronização do Airbyte (placeholder)
      const syncResult = await triggerAirbyteSync(project_id, token)

      if (!syncResult.success) {
        return NextResponse.json({ error: syncResult.message }, { status: 500 })
      }

      // Retornar o jobId também para o frontend
      return NextResponse.json({ message: syncResult.message, jobId: syncResult.jobId })
    } catch (error) {
      console.error('Erro na API woocommerce-sync:', error)
      return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
  }
}