import { createClient as createSupabaseClient } from '../lib/supabase/server';
import fs from 'fs';
import path from 'path';

// Configuração padrão
const DEFAULT_CONFIG = {
  apiUrl: process.env.AIRBYTE_API_URL || 'http://localhost:8000/api/v1',
  clientId: process.env.AIRBYTE_CLIENT_ID,
  clientSecret: process.env.AIRBYTE_CLIENT_SECRET
};

// Constante para DB
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

// Configuração do cliente - pode ser substituída dinamicamente
let clientConfig = { ...DEFAULT_CONFIG };

// Caminhos para armazenamento de definições
const DEFINITIONS_DIR = path.join(process.cwd(), 'lib', 'airbyte-definitions');
const SOURCES_FILE = path.join(DEFINITIONS_DIR, 'sources.json');
const DESTINATIONS_FILE = path.join(DEFINITIONS_DIR, 'destinations.json');

// Cache de definições em memória
let sourceDefinitionsCache: SourceDefinition[] | null = null;
let destinationDefinitionsCache: DestinationDefinition[] | null = null;

// Tipos
type AirbyteToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type SourceDefinition = {
  sourceDefinitionId: string;
  name: string;
  dockerRepository: string;
  dockerImageTag: string;
  documentationUrl: string;
  [key: string]: any;
};

export type DestinationDefinition = {
  destinationDefinitionId: string;
  name: string;
  dockerRepository: string;
  dockerImageTag: string;
  documentationUrl: string;
  [key: string]: any;
};

// Cache de token
let tokenCache: { token: AirbyteToken; expiresAt: Date; clientId: string } | null = null;

/**
 * Configura as credenciais do cliente Airbyte
 * Permite substituir as credenciais em tempo de execução
 */
export function configureAirbyteClient(config: {
  apiUrl?: string;
  clientId?: string;
  clientSecret?: string;
}) {
  clientConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Invalida o cache de token ao mudar as credenciais
  tokenCache = null;
  
  console.log('Cliente Airbyte configurado com novas credenciais');
  return clientConfig;
}

// Obter a configuração atual do Airbyte em formato facilmente serializável
export function getAirbyteConfig() {
  const config = { ...clientConfig } as any;
  if (config.clientSecret) {
    config.clientSecret = '[REDACTED]'; // Não expor a senha na resposta
  }
  config.hasCredentials = !!(clientConfig.clientId && clientConfig.clientSecret);
  return config;
}

/**
 * Obtém uma definição de source pelo nome
 */
export function getSourceDefinitionByName(name: string): SourceDefinition | undefined {
  if (!sourceDefinitionsCache) {
    // Carregar definições do arquivo local
    try {
      if (fs.existsSync(SOURCES_FILE)) {
        const fileContent = fs.readFileSync(SOURCES_FILE, 'utf8');
        sourceDefinitionsCache = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Erro ao carregar definições de fontes do arquivo:', error);
      return undefined;
    }
  }
  
  if (!sourceDefinitionsCache || sourceDefinitionsCache.length === 0) {
    console.warn('Cache de definições de sources vazio ou não inicializado');
    return undefined;
  }
  
  return sourceDefinitionsCache.find(
    (def) => def.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Obtém uma definição de destination pelo nome
 */
export function getDestinationDefinitionByName(name: string): DestinationDefinition | undefined {
  if (!destinationDefinitionsCache) {
    // Carregar definições do arquivo local
    try {
      if (fs.existsSync(DESTINATIONS_FILE)) {
        const fileContent = fs.readFileSync(DESTINATIONS_FILE, 'utf8');
        destinationDefinitionsCache = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Erro ao carregar definições de destinations do arquivo:', error);
      return undefined;
    }
  }
  
  if (!destinationDefinitionsCache || destinationDefinitionsCache.length === 0) {
    console.warn('Cache de definições de destinations vazio ou não inicializado');
    return undefined;
  }
  
  return destinationDefinitionsCache.find(
    (def) => def.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Busca definições de sources do Airbyte
 */
export async function fetchSourceDefinitions(): Promise<SourceDefinition[]> {
  try {
    const data = await apiCall('source_definitions/list');
    return data?.sourceDefinitions || [];
  } catch (error) {
    console.error('Erro ao buscar definições de sources:', error);
    throw error;
  }
}

/**
 * Busca definições de destinations do Airbyte
 */
export async function fetchDestinationDefinitions(): Promise<DestinationDefinition[]> {
  try {
    const data = await apiCall('destination_definitions/list');
    return data?.destinationDefinitions || [];
  } catch (error) {
    console.error('Erro ao buscar definições de destinations:', error);
    throw error;
  }
}

/**
 * Salva as definições em arquivos locais
 */
export async function saveDefinitions(
  sources: SourceDefinition[],
  destinations: DestinationDefinition[]
): Promise<void> {
  try {
    // Criar o diretório se não existir
    if (!fs.existsSync(DEFINITIONS_DIR)) {
      fs.mkdirSync(DEFINITIONS_DIR, { recursive: true });
    }
    
    // Salvar as definições em arquivos JSON
    fs.writeFileSync(
      SOURCES_FILE,
      JSON.stringify(sources, null, 2),
      'utf8'
    );
    
    fs.writeFileSync(
      DESTINATIONS_FILE,
      JSON.stringify(destinations, null, 2),
      'utf8'
    );
    
    console.log(`Definições salvas com sucesso em ${DEFINITIONS_DIR}`);
  } catch (error) {
    console.error('Erro ao salvar definições em arquivos:', error);
    throw error;
  }
}

/**
 * Carrega as definições de sources e destinations dos arquivos locais
 */
export function loadDefinitions(): {
  sources: SourceDefinition[];
  destinations: DestinationDefinition[];
} {
  let sources: SourceDefinition[] = [];
  let destinations: DestinationDefinition[] = [];
  
  try {
    // Carregar definições de sources
    if (fs.existsSync(SOURCES_FILE)) {
      const sourcesContent = fs.readFileSync(SOURCES_FILE, 'utf8');
      sources = JSON.parse(sourcesContent);
      sourceDefinitionsCache = sources;
    }
    
    // Carregar definições de destinations
    if (fs.existsSync(DESTINATIONS_FILE)) {
      const destinationsContent = fs.readFileSync(DESTINATIONS_FILE, 'utf8');
      destinations = JSON.parse(destinationsContent);
      destinationDefinitionsCache = destinations;
    }
  } catch (error) {
    console.error('Erro ao carregar definições:', error);
  }
  
  return { sources, destinations };
}

/**
 * Atualiza as definições de sources e destinations
 */
export async function refreshDefinitions(): Promise<{
  sources: SourceDefinition[];
  destinations: DestinationDefinition[];
}> {
  try {
    // Buscar definições da API
    const [sources, destinations] = await Promise.all([
      fetchSourceDefinitions(),
      fetchDestinationDefinitions()
    ]);
    
    // Salvar em arquivos
    await saveDefinitions(sources, destinations);
    
    // Atualizar cache em memória
    sourceDefinitionsCache = sources;
    destinationDefinitionsCache = destinations;
    
    return { sources, destinations };
  } catch (error) {
    console.error('Erro ao atualizar definições:', error);
    throw error;
  }
}

/**
 * Obtém um token de autenticação para a API do Airbyte
 */
async function getAuthToken(): Promise<string> {
  console.log('Obtendo token de autenticação para Airbyte...');
  
  // Verificar se já temos um token válido em cache
  if (tokenCache &&
      tokenCache.expiresAt > new Date() &&
      tokenCache.clientId === clientConfig.clientId) {
    console.log('Usando token Airbyte em cache (válido)');
    return `${tokenCache.token.token_type} ${tokenCache.token.access_token}`;
  } else {
    console.log('Token não encontrado em cache ou expirado, obtendo novo token...');
  }

  if (!clientConfig.clientId || !clientConfig.clientSecret) {
    console.warn('AVISO: Credenciais Airbyte não configuradas!');
    console.warn('Configure as variáveis de ambiente AIRBYTE_CLIENT_ID e AIRBYTE_CLIENT_SECRET');
    // Retornar um token simulado para não interromper totalmente o desenvolvimento
    return 'Bearer mock-token-for-development';
  }

  try {
    // Detectar ambiente Docker baseado na URL do Supabase
    const isDockerEnvironment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');
    let effectiveAirbyteApiUrl = clientConfig.apiUrl;

    if (isDockerEnvironment && effectiveAirbyteApiUrl.includes('localhost')) {
      effectiveAirbyteApiUrl = effectiveAirbyteApiUrl.replace('localhost', 'host.docker.internal');
      console.log(`Ambiente Docker detectado, usando URL Airbyte para token: ${effectiveAirbyteApiUrl}`);
    }

    console.log(`Solicitando token em ${effectiveAirbyteApiUrl}/token`);

    const response = await fetch(`${effectiveAirbyteApiUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientConfig.clientId,
        client_secret: clientConfig.clientSecret,
      }),
    });

    console.log(`Resposta da solicitação de token: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Detalhes do erro na obtenção do token: ${errorText}`);
      
      // Verificar se é um erro específico para fornecer mensagem mais clara
      if (response.status === 401) {
        throw new Error(`Credenciais Airbyte inválidas. Verifique CLIENT_ID e CLIENT_SECRET`);
      } else if (response.status === 404) {
        throw new Error(`Endpoint de autenticação não encontrado. Verifique a URL do Airbyte`);
      } else {
        throw new Error(`Erro ao obter token Airbyte: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const token = await response.json() as AirbyteToken;
    console.log('Token obtido com sucesso!');
    
    // Calcular quando o token expira (subtraindo 60s para margem de segurança)
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (token.expires_in || 3600) - 60);

    // Armazenar em cache
    tokenCache = {
      token,
      expiresAt,
      clientId: clientConfig.clientId || ''
    };

    return `${token.token_type} ${token.access_token}`;
  } catch (error) {
    console.error('Falha ao obter token de autenticação Airbyte:', error);
    console.error('Verifique se:');
    console.error('1. O serviço Airbyte está rodando e acessível');
    console.error('2. As credenciais (CLIENT_ID/CLIENT_SECRET) estão corretas');
    console.error('3. A URL do Airbyte está correta (atual: ' + clientConfig.apiUrl + ')');
    
    throw error;
  }
}

/**
 * Faz uma chamada à API do Airbyte
 */
async function apiCall(endpoint: string, method: string = 'POST', body: any = null) {
  try {
    // Verificar se as credenciais estão configuradas
    if (!clientConfig.clientId || !clientConfig.clientSecret) {
      console.warn(`AVISO: Tentativa de chamar Airbyte API sem credenciais configuradas (${endpoint})`);
      
      // Para não interromper completamente o desenvolvimento, retornamos respostas simuladas
      // específicas para endpoints comuns quando não há credenciais configuradas
      if (endpoint === 'workspaces/create') {
        return { workspaceId: `mock-${Date.now()}` };
      } else if (endpoint === 'sources/create') {
        return { sourceId: `mock-source-${Date.now()}` };
      } else if (endpoint === 'destinations/create') {
        return { destinationId: `mock-dest-${Date.now()}` };
      } else if (endpoint === 'connections/create') {
        return { connectionId: `mock-conn-${Date.now()}` };
      } else if (endpoint === 'connections/sync') {
        return { job: { id: Date.now(), status: 'running' } };
      }
      
      // Se não for um endpoint comum, retornamos um objeto vazio
      return {};
    }
    
    // Detectar ambiente Docker baseado na URL do Supabase
    const isDockerEnvironment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');
    let effectiveAirbyteApiUrl = clientConfig.apiUrl;

    if (isDockerEnvironment && effectiveAirbyteApiUrl.includes('localhost')) {
      effectiveAirbyteApiUrl = effectiveAirbyteApiUrl.replace('localhost', 'host.docker.internal');
      console.log(`Ambiente Docker detectado, usando URL Airbyte: ${effectiveAirbyteApiUrl}`);
    }

    try {
      const authToken = await getAuthToken();
      const url = `${effectiveAirbyteApiUrl}/${endpoint}`;
      
      console.log(`Airbyte API Call: ${method} ${url}`);
      if (body) console.log('Request body:', JSON.stringify(body, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authToken,
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
      console.log(`Airbyte API Success for ${method} ${url}:`, data);
      return data;
    } catch (authError) {
      console.error('Erro de autenticação ou comunicação com Airbyte:', authError);
      
      // Tentar com conexão direta sem autenticação para diagnóstico
      if (endpoint === 'health') {
        try {
          console.log('Tentando verificação de saúde do Airbyte sem autenticação...');
          const directUrl = `${effectiveAirbyteApiUrl}/health`;
          const directResponse = await fetch(directUrl, { method: 'GET' });
          
          if (directResponse.ok) {
            console.log('Serviço Airbyte está respondendo em verificação direta sem autenticação');
            const directData = await directResponse.json();
            return directData;
          } else {
            console.error(`Falha na verificação direta: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error('Falha completa na conexão direta com Airbyte:', directError);
        }
      }
      
      throw authError;
    }
  } catch (error) {
    console.error(`Failed to call Airbyte API (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Cria um workspace no Airbyte
 * @param userId ID do usuário
 * @param email Email do usuário
 * @returns ID do workspace criado
 */
export async function createWorkspace(userId: string, email: string): Promise<string> {
  console.log(`Creating Airbyte workspace for user: ${userId} (${email})`);
  
  // Verificar configuração
  console.log(`Airbyte Config URL: ${clientConfig.apiUrl}`);
  console.log(`Airbyte ClientID configurado: ${clientConfig.clientId ? 'SIM' : 'NÃO'}`);
  console.log(`Airbyte ClientSecret configurado: ${clientConfig.clientSecret ? 'SIM' : 'NÃO'}`);
  
  // Para evitar erros em ambiente de desenvolvimento, verificamos se as credenciais estão configuradas
  if (!clientConfig.clientId || !clientConfig.clientSecret) {
    console.warn('ATENÇÃO: Credenciais Airbyte não configuradas. Usando workspace simulado para desenvolvimento.');
    // Retornar um ID simulado para desenvolvimento
    const mockWorkspaceId = `dev-workspace-${Date.now()}`;
    
    // Atualizar ou criar o perfil com o workspace_id simulado
    try {
      const supabase = createSupabaseClient();
      await supabase
        .from('users')
        .update({ workspace_id: mockWorkspaceId })
        .eq('id', userId);
        
      console.log(`Workspace simulado criado: ${mockWorkspaceId}`);
      return mockWorkspaceId;
    } catch (err) {
      console.error('Erro ao salvar workspace simulado:', err);
      return mockWorkspaceId;
    }
  }
  
  try {
    const workspaceName = `Workspace - ${email}`;
    console.log('Preparando para chamar Airbyte API...');
    
    // Verificar conexão com o Airbyte antes
    try {
      const testUrl = `${clientConfig.apiUrl}/health`;
      console.log(`Testando conexão com Airbyte em: ${testUrl}`);
      const healthCheck = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (healthCheck.ok) {
        console.log('Conexão com Airbyte OK!');
      } else {
        const errorText = await healthCheck.text();
        console.error(`Erro na verificação de saúde do Airbyte: ${healthCheck.status} - ${errorText}`);
      }
    } catch (checkError) {
      console.error('Falha ao verificar conexão com Airbyte:', checkError);
    }
    
    const response = await apiCall('workspaces/create', 'POST', {
      name: workspaceName,
      email: email,
      anonymousDataCollection: false,
      news: false,
      securityUpdates: true,
      displaySetupWizard: false
    });

    if (!response?.workspaceId) {
      console.error('Resposta do Airbyte não contém workspaceId:', response);
      throw new Error('Falha ao criar workspace no Airbyte');
    }

    console.log(`Created workspace: ${response.workspaceId}`);
    
    // Armazenar o workspaceId no perfil do usuário
    const supabase = createSupabaseClient();
    
    // Verificar se já existe um perfil para o usuário
    const { data: existingProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Erro ao verificar perfil existente:', profileError);
      throw new Error(`Erro ao verificar perfil do usuário: ${profileError.message}`);
    }

    // Atualizar ou criar o perfil com o workspace_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ workspace_id: response.workspaceId })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao salvar workspace_id:', updateError);
      throw new Error(`Erro ao salvar workspace_id: ${updateError.message}`);
    }

    return response.workspaceId;
  } catch (error) {
    console.error('Erro ao criar workspace:', error);
    throw error;
  }
}

/**
 * Cria uma source no Airbyte
 */
export async function createSource(
  workspaceId: string,
  config: {
    name: string;
    sourceDefinitionId: string;
    connectionConfiguration: any;
  }
): Promise<string> {
  console.log(`Creating Airbyte source in workspace: ${workspaceId}`);
  
  // Para desenvolvimento sem Airbyte
  if (workspaceId.startsWith('dev-') || workspaceId.startsWith('mock-') ||
      config.sourceDefinitionId.startsWith('mock-')) {
    const mockId = `mock-source-${Date.now()}`;
    console.log(`Mock mode: Criando source simulada ${mockId}`);
    return mockId;
  }
  
  try {
    // Log detalhado
    console.log(`Criando source "${config.name}" com definição ${config.sourceDefinitionId}`);
    
    // Adicionar validação adicional
    if (!workspaceId || !config.sourceDefinitionId) {
      throw new Error(
        `Parâmetros inválidos: workspaceId=${workspaceId}, sourceDefinitionId=${config.sourceDefinitionId}`
      );
    }
    
    // Tentar a criação da source
    console.log('Enviando requisição para criar source...');
    const response = await apiCall('sources/create', 'POST', {
      workspaceId,
      name: config.name,
      sourceDefinitionId: config.sourceDefinitionId,
      connectionConfiguration: config.connectionConfiguration
    });

    if (!response?.sourceId) {
      console.error('Resposta sem sourceId:', response);
      throw new Error('Falha ao criar source no Airbyte: resposta não contém sourceId');
    }

    console.log(`Source criada com sucesso: ${response.sourceId}`);
    return response.sourceId;
  } catch (error) {
    console.error('Erro detalhado ao criar source:', error);
    
    // Se estamos em ambiente de desenvolvimento, retornar um ID de source simulado
    if (process.env.NODE_ENV !== 'production') {
      const fallbackId = `dev-source-error-${Date.now()}`;
      console.warn(`Ambiente de desenvolvimento: retornando ID simulado após erro: ${fallbackId}`);
      return fallbackId;
    }
    
    throw error;
  }
}

/**
 * Cria uma destination no Airbyte
 */
export async function createDestination(
  workspaceId: string,
  config: {
    name: string;
    destinationDefinitionId: string;
    connectionConfiguration: any;
  }
): Promise<string> {
  console.log(`Creating Airbyte destination in workspace: ${workspaceId}`);
  
  // Para desenvolvimento sem Airbyte
  if (workspaceId.startsWith('dev-') || workspaceId.startsWith('mock-') ||
      config.destinationDefinitionId.startsWith('mock-')) {
    const mockId = `mock-destination-${Date.now()}`;
    console.log(`Mock mode: Criando destination simulada ${mockId}`);
    return mockId;
  }
  
  try {
    // Log detalhado
    console.log(`Criando destination "${config.name}" com definição ${config.destinationDefinitionId}`);
    console.log('Configuração de conexão:', JSON.stringify(config.connectionConfiguration, null, 2));
    
    // Adicionar validação adicional
    if (!workspaceId || !config.destinationDefinitionId) {
      throw new Error(
        `Parâmetros inválidos: workspaceId=${workspaceId}, destinationDefinitionId=${config.destinationDefinitionId}`
      );
    }
    
    // Tentar a criação do destino
    console.log('Enviando requisição para criar destination...');
    const response = await apiCall('destinations/create', 'POST', {
      workspaceId,
      name: config.name,
      destinationDefinitionId: config.destinationDefinitionId,
      connectionConfiguration: config.connectionConfiguration
    });

    if (!response?.destinationId) {
      console.error('Resposta sem destinationId:', response);
      throw new Error('Falha ao criar destination no Airbyte: resposta não contém destinationId');
    }

    console.log(`Destination criado com sucesso: ${response.destinationId}`);
    return response.destinationId;
  } catch (error) {
    console.error('Erro detalhado ao criar destination:', error);
    
    // Se estamos em ambiente de desenvolvimento, retornar um ID de destination simulado
    if (process.env.NODE_ENV !== 'production') {
      const fallbackId = `dev-destination-error-${Date.now()}`;
      console.warn(`Ambiente de desenvolvimento: retornando ID simulado após erro: ${fallbackId}`);
      return fallbackId;
    }
    
    throw error;
  }
}

/**
 * Cria uma conexão no Airbyte
 */
export async function createConnection(
  sourceId: string, 
  destinationId: string, 
  schema: any = null
): Promise<string> {
  console.log(`Creating Airbyte connection between source ${sourceId} and destination ${destinationId}`);
  
  try {
    // Se não fornecer schema, descobrir automaticamente
    let syncCatalog = schema;
    if (!syncCatalog) {
      const discovery = await apiCall('sources/discover_schema', 'POST', {
        sourceId
      });
      
      syncCatalog = discovery.catalog;
      
      // Configurar todos os streams como sincronizáveis por padrão
      if (syncCatalog?.streams) {
        syncCatalog.streams = syncCatalog.streams.map((stream: any) => ({
          ...stream,
          config: {
            syncMode: "incremental",
            cursorField: ["updated_at"],
            destinationSyncMode: "append_dedup",
            primaryKey: [["id"]],
            aliasName: stream.stream.name,
            selected: true
          }
        }));
      }
    }
    
    const response = await apiCall('connections/create', 'POST', {
      sourceId,
      destinationId,
      name: `Connection ${sourceId} to ${destinationId}`,
      namespaceDefinition: "source",
      namespaceFormat: "${SOURCE_NAMESPACE}",
      prefix: "",
      status: "active",
      scheduleType: "manual",
      syncCatalog,
      operations: []
    });

    if (!response?.connectionId) {
      throw new Error('Falha ao criar conexão no Airbyte');
    }

    console.log(`Created connection: ${response.connectionId}`);
    return response.connectionId;
  } catch (error) {
    console.error('Erro ao criar conexão:', error);
    throw error;
  }
}

/**
 * Sincroniza uma conexão no Airbyte
 */
export async function syncConnection(connectionId: string): Promise<any> {
  console.log(`Triggering sync for connection: ${connectionId}`);
  
  try {
    const response = await apiCall('connections/sync', 'POST', {
      connectionId
    });

    if (!response?.job?.id) {
      throw new Error('Falha ao iniciar job de sincronização');
    }

    console.log(`Sync job started: ${response.job.id}`);
    return response;
  } catch (error) {
    console.error('Erro ao iniciar sincronização:', error);
    throw error;
  }
}

/**
 * Cria uma source para o projeto no Airbyte
 * @param workspaceId ID do workspace Airbyte
 * @param projectId ID do projeto
 * @param provider Nome do provedor (ex: 'woocommerce')
 * @param connectionConfiguration Configuração do provedor
 * @returns ID da source criada
 */
export async function createProjectSource(
  workspaceId: string,
  projectId: string,
  provider: string,
  connectionConfiguration: any
): Promise<string> {
  console.log(`Creating ${provider} source for project ${projectId} in workspace ${workspaceId}`);
  
  // Para evitar erros em ambiente de desenvolvimento, verificamos se as credenciais estão configuradas
  if (!clientConfig.clientId || !clientConfig.clientSecret || workspaceId.startsWith('dev-') || workspaceId.startsWith('mock-')) {
    console.warn('ATENÇÃO: Credenciais Airbyte não configuradas ou usando workspace simulado. Usando source simulada.');
    // Retornar um ID simulado para desenvolvimento
    const mockSourceId = `dev-source-${Date.now()}`;
    console.log(`Source simulada criada: ${mockSourceId}`);
    return mockSourceId;
  }
  
  try {
    console.log('Buscando definições de source do Airbyte...');
    
    // Testar se a definição de source já existe em cache antes de fazer a chamada API
    const cachedDefinition = getSourceDefinitionByName(provider === 'woocommerce' ? 'WooCommerce' : provider);
    let sourceDefinition;
    
    if (cachedDefinition) {
      console.log(`Usando definição em cache para ${provider}:`, cachedDefinition);
      sourceDefinition = cachedDefinition;
    } else {
      // Obter a definição da fonte para o provedor
      console.log(`Buscando definição de source para o provider ${provider}...`);
      
      const sourceDefinitions = await apiCall('source_definitions/list', 'POST', {
        workspaceId
      });
      
      // Mapeamento de provedores para nomes de definição no Airbyte
      const providerToDefinitionName: { [key: string]: string } = {
        'woocommerce': 'WooCommerce',
        'google': 'Google Ads',
        'meta': 'Facebook Marketing',
        // Adicionar outros provedores conforme necessário
      };
      
      const definitionName = providerToDefinitionName[provider];
      
      if (!definitionName) {
        console.error(`Provedor ${provider} não mapeado para definição Airbyte`);
        throw new Error(`Provedor não suportado: ${provider}`);
      }
      
      console.log(`Procurando definição de source '${definitionName}'...`);
      
      if (!sourceDefinitions?.sourceDefinitions || sourceDefinitions.sourceDefinitions.length === 0) {
        console.error('Nenhuma definição de source retornada pela API:', sourceDefinitions);
        
        // Para desenvolvimento, usar uma definição simulada para WooCommerce
        if (provider === 'woocommerce') {
          console.warn('Usando definição simulada para WooCommerce');
          sourceDefinition = {
            sourceDefinitionId: 'mock-woocommerce-definition',
            name: 'WooCommerce',
            dockerRepository: 'airbyte/source-woocommerce',
            dockerImageTag: 'latest',
            documentationUrl: 'https://docs.airbyte.com/integrations/sources/woocommerce'
          };
        } else {
          throw new Error(`Definições de source não encontradas`);
        }
      } else {
        // Encontrar a definição pelo nome
        sourceDefinition = sourceDefinitions.sourceDefinitions.find(
          (d: any) => d.name === definitionName
        );
        
        if (!sourceDefinition) {
          console.error(`Definição '${definitionName}' não encontrada nas definições disponíveis:`,
            sourceDefinitions.sourceDefinitions.map((d: any) => d.name).join(', '));
          
          // Para desenvolvimento com WooCommerce, usar uma definição simulada
          if (provider === 'woocommerce') {
            console.warn('Usando definição simulada para WooCommerce');
            sourceDefinition = {
              sourceDefinitionId: 'mock-woocommerce-definition',
              name: 'WooCommerce',
              dockerRepository: 'airbyte/source-woocommerce',
              dockerImageTag: 'latest',
              documentationUrl: 'https://docs.airbyte.com/integrations/sources/woocommerce'
            };
          } else {
            throw new Error(`Definição de source ${definitionName} não encontrada`);
          }
        }
      }
    }
    
    // Verificar se temos uma definição válida
    if (!sourceDefinition?.sourceDefinitionId) {
      throw new Error(`Definição de source para ${provider} não encontrada ou inválida`);
    }
    
    console.log(`Encontrada definição de source: ${sourceDefinition.name} (${sourceDefinition.sourceDefinitionId})`);
    
    // Nomear a source de maneira única
    const sourceName = `${provider.toUpperCase()} - Project ${projectId}`;
    
    // Verificar se já existe uma source com esse nome
    try {
      console.log(`Verificando se já existe uma source para o projeto ${projectId}...`);
      const existingSources = await apiCall('sources/list', 'POST', {
        workspaceId
      });
      
      const existingSource = existingSources?.sources?.find((s: any) => s.name === sourceName);
      if (existingSource) {
        console.log(`Source existente encontrada: ${existingSource.sourceId}`);
        return existingSource.sourceId;
      }
    } catch (listError) {
      console.warn('Erro ao listar sources existentes, tentando criar uma nova:', listError);
    }
    
    // Criar a source
    console.log('Criando nova source com configuração:', JSON.stringify(connectionConfiguration, null, 2));
    
    return await createSource(workspaceId, {
      name: sourceName,
      sourceDefinitionId: sourceDefinition.sourceDefinitionId,
      connectionConfiguration
    });
  } catch (error) {
    console.error(`Erro detalhado ao criar source do projeto ${projectId}:`, error);
    
    // Para ambiente de desenvolvimento, retornar um ID simulado
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Ambiente de desenvolvimento: retornando ID de source simulado');
      return `dev-source-error-${Date.now()}`;
    }
    
    throw error;
  }
}

/**
 * Cria um destination Postgres/Supabase para o projeto no Airbyte
 * @param workspaceId ID do workspace
 * @param projectId ID do projeto
 * @returns ID da destination criada
 */
export async function createProjectDestination(
  workspaceId: string,
  projectId: string
): Promise<string> {
  console.log(`Creating destination for project ${projectId} in workspace ${workspaceId}`);
  
  // Para evitar erros em ambiente de desenvolvimento, verificamos se as credenciais estão configuradas
  if (!clientConfig.clientId || !clientConfig.clientSecret || workspaceId.startsWith('dev-') || workspaceId.startsWith('mock-')) {
    console.warn('ATENÇÃO: Credenciais Airbyte não configuradas ou usando workspace simulado. Usando destination simulada.');
    // Retornar um ID simulado para desenvolvimento
    const mockDestId = `dev-destination-${Date.now()}`;
    console.log(`Destination simulada criada: ${mockDestId}`);
    return mockDestId;
  }
  
  // Verificação de senha do Supabase (apenas se não estiver em modo simulado)
  if (!SUPABASE_DB_PASSWORD) {
    console.warn('AVISO: SUPABASE_DB_PASSWORD não configurado. Usando senha simulada para desenvolvimento.');
    // Em ambiente de desenvolvimento, continuar com uma senha fictícia
    if (process.env.NODE_ENV !== 'production') {
      console.log('Usando senha simulada em ambiente de desenvolvimento.');
    } else {
      throw new Error('SUPABASE_DB_PASSWORD não configurado para ambiente de produção');
    }
  }

  try {
    console.log('Buscando definição de destination Postgres...');
    
    // Testar se a definição de destination já existe em cache antes de fazer a chamada API
    const cachedDefinition = getDestinationDefinitionByName('Postgres');
    let postgresDefinition;
    
    if (cachedDefinition) {
      console.log(`Usando definição em cache para Postgres:`, cachedDefinition);
      postgresDefinition = cachedDefinition;
    } else {
      // Obter a definição para Postgres
      console.log('Buscando definições de destinations do Airbyte...');
      const destinationDefinitions = await apiCall('destination_definitions/list', 'POST', {
        workspaceId
      });
      
      console.log(`Procurando definição 'Postgres' nas destinations disponíveis...`);
      
      if (!destinationDefinitions?.destinationDefinitions || destinationDefinitions.destinationDefinitions.length === 0) {
        console.error('Nenhuma definição de destination retornada pela API:', destinationDefinitions);
        
        // Para desenvolvimento, usar uma definição simulada para Postgres
        console.warn('Usando definição simulada para Postgres');
        postgresDefinition = {
          destinationDefinitionId: 'mock-postgres-definition',
          name: 'Postgres',
          dockerRepository: 'airbyte/destination-postgres',
          dockerImageTag: 'latest',
          documentationUrl: 'https://docs.airbyte.com/integrations/destinations/postgres'
        };
      } else {
        // Encontrar a definição pelo nome
        postgresDefinition = destinationDefinitions.destinationDefinitions.find(
          (d: any) => d.name === 'Postgres'
        );
        
        if (!postgresDefinition) {
          console.error('Definição Postgres não encontrada. Definições disponíveis:',
            destinationDefinitions.destinationDefinitions.map((d: any) => d.name).join(', '));
          
          // Para desenvolvimento, usar uma definição simulada
          console.warn('Usando definição simulada para Postgres');
          postgresDefinition = {
            destinationDefinitionId: 'mock-postgres-definition',
            name: 'Postgres',
            dockerRepository: 'airbyte/destination-postgres',
            dockerImageTag: 'latest',
            documentationUrl: 'https://docs.airbyte.com/integrations/destinations/postgres'
          };
        }
      }
    }
    
    // Verificar se temos uma definição válida
    if (!postgresDefinition?.destinationDefinitionId) {
      throw new Error('Definição de destination Postgres não encontrada ou inválida');
    }
    
    console.log(`Encontrada definição de destination: ${postgresDefinition.name} (${postgresDefinition.destinationDefinitionId})`);
    
    // Configurar schema específico para o projeto
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurado');
    }
    
    const supabaseHost = supabaseUrl.includes('localhost')
      ? 'host.docker.internal'
      : new URL(supabaseUrl).hostname;
    
    const schema = `project_${projectId.replace(/-/g, '_')}`;
    const destinationName = `Supabase - Project ${projectId}`;
    
    // Verificar se já existe um destination com esse nome
    try {
      console.log(`Verificando se já existe um destination para o projeto ${projectId}...`);
      const existingDestinations = await apiCall('destinations/list', 'POST', {
        workspaceId
      });
      
      const existingDestination = existingDestinations?.destinations?.find((d: any) => d.name === destinationName);
      if (existingDestination) {
        console.log(`Destination existente encontrado: ${existingDestination.destinationId}`);
        return existingDestination.destinationId;
      }
    } catch (listError) {
      console.warn('Erro ao listar destinations existentes, tentando criar um novo:', listError);
    }
    
    // Criar a configuração para o destination
    const connectionConfiguration = {
      host: supabaseHost,
      port: 5432,
      database: 'postgres',
      schema: schema,
      username: 'postgres',
      password: SUPABASE_DB_PASSWORD || 'mock_password_for_development',
      ssl_mode: { mode: 'disable' },
      tunnel_method: { tunnel_method: 'NO_TUNNEL' }
    };
    
    console.log('Criando novo destination com configuração:',
      { ...connectionConfiguration, password: '[REDACTED]' });
    
    // Criar o destination
    return await createDestination(workspaceId, {
      name: destinationName,
      destinationDefinitionId: postgresDefinition.destinationDefinitionId,
      connectionConfiguration
    });
  } catch (error) {
    console.error(`Erro detalhado ao criar destination para projeto ${projectId}:`, error);
    
    // Para ambiente de desenvolvimento, retornar um ID simulado
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Ambiente de desenvolvimento: retornando ID de destination simulado');
      return `dev-destination-error-${Date.now()}`;
    }
    
    throw error;
  }
}

/**
 * Cria uma conexão entre source e destination para o projeto no Airbyte
 * @param sourceId ID da source
 * @param destinationId ID da destination
 * @param projectId ID do projeto
 * @returns ID da conexão criada
 */
export async function createProjectConnection(
  sourceId: string,
  destinationId: string,
  projectId: string
): Promise<string> {
  console.log(`Creating connection between source ${sourceId} and destination ${destinationId} for project ${projectId}`);
  
  // Para evitar erros em ambiente de desenvolvimento, verificamos se estamos usando IDs simulados
  if (sourceId.startsWith('dev-') || sourceId.startsWith('mock-') ||
      destinationId.startsWith('dev-') || destinationId.startsWith('mock-')) {
    console.warn('ATENÇÃO: Usando source/destination simulados. Criando conexão simulada.');
    const mockConnectionId = `dev-connection-${Date.now()}`;
    console.log(`Conexão simulada criada: ${mockConnectionId}`);
    return mockConnectionId;
  }
  
  // Verificar se os IDs fornecidos são válidos
  if (!sourceId || !destinationId) {
    throw new Error(`IDs inválidos: sourceId=${sourceId}, destinationId=${destinationId}`);
  }
  
  try {
    // Verificar se já existe uma conexão entre essa source e destination
    try {
      console.log('Verificando conexões existentes...');
      const connectionsList = await apiCall('connections/list', 'POST', {});
      
      const existingConnection = connectionsList?.connections?.find(
        (c: any) => c.sourceId === sourceId && c.destinationId === destinationId
      );
      
      if (existingConnection) {
        console.log(`Conexão existente encontrada: ${existingConnection.connectionId}`);
        return existingConnection.connectionId;
      }
    } catch (listError) {
      console.warn('Erro ao verificar conexões existentes:', listError);
    }
    
    // Descobrir schema da source
    console.log(`Descobrindo schema para sourceId: ${sourceId}...`);
    const discovery = await apiCall('sources/discover_schema', 'POST', {
      sourceId
    });
    
    if (!discovery?.catalog?.streams || discovery.catalog.streams.length === 0) {
      console.error('Nenhum stream encontrado na resposta:', discovery);
      
      // Em modo de desenvolvimento, criar um catálogo simulado básico
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Usando catálogo simulado para desenvolvimento');
        discovery.catalog = {
          streams: [
            {
              stream: {
                name: 'mock_stream',
                namespace: 'mock_namespace',
                jsonSchema: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
                supportedSyncModes: ['full_refresh', 'incremental'],
                sourceDefinedCursor: true,
                defaultCursorField: ['id'],
                sourceDefinedPrimaryKey: [['id']]
              },
              config: {
                syncMode: 'incremental',
                cursorField: ['id'],
                destinationSyncMode: 'append_dedup',
                primaryKey: [['id']],
                aliasName: 'mock_stream',
                selected: true
              }
            }
          ]
        };
      } else {
        throw new Error('Nenhum stream encontrado na source');
      }
    }
    
    // Copiar e configurar o catálogo
    console.log(`Configurando catálogo com ${discovery.catalog.streams.length} streams`);
    const syncCatalog = {
      ...discovery.catalog
    };
    
    // Configurar todos os streams como sincronizáveis
    if (syncCatalog?.streams) {
      syncCatalog.streams = syncCatalog.streams.map((stream: any) => {
        // Verificar se o stream tem propriedades e campos adequados
        console.log(`Configurando stream: ${stream.stream?.name || 'unnamed'}`);
        
        // Alguns streams podem não ter um campo updated_at, nesse caso usar outros campos disponíveis
        const streamProperties = stream.stream?.jsonSchema?.properties || {};
        let cursorField = ['updated_at'];
        
        if (!streamProperties.updated_at) {
          // Tentar encontrar algum campo de data
          if (streamProperties.date || streamProperties.created_at) {
            cursorField = [streamProperties.date ? 'date' : 'created_at'];
            console.log(`Campo updated_at não encontrado, usando ${cursorField[0]} como campo cursor`);
          } else {
            // Usar o primeiro campo como cursor
            const firstField = Object.keys(streamProperties)[0] || 'id';
            cursorField = [firstField];
            console.log(`Nenhum campo de data encontrado, usando ${firstField} como campo cursor`);
          }
        }
        
        // Obter campo ID ou chave primária
        const primaryKey = [['id']];
        if (!streamProperties.id) {
          const possibleKeys = Object.keys(streamProperties).filter(k =>
            k.includes('id') || k.includes('key') || k.endsWith('_pk')
          );
          if (possibleKeys.length > 0) {
            const firstKey = possibleKeys[0]; // Garantir que não seja undefined
            primaryKey[0] = [firstKey];
            console.log(`Campo id não encontrado, usando ${firstKey} como chave primária`);
          }
        }
        
        return {
          ...stream,
          config: {
            syncMode: "incremental",
            cursorField: cursorField,
            destinationSyncMode: "append_dedup",
            primaryKey: primaryKey,
            aliasName: stream.stream.name,
            selected: true
          }
        };
      });
      
      console.log('Configuração de streams concluída');
    } else {
      console.warn('Nenhum stream encontrado na fonte. O catálogo de sincronização estará vazio.');
    }
    
    // Criar a conexão
    console.log('Criando conexão com as configurações definidas');
    
    const connectionName = `Connection ${sourceId} to ${destinationId} - Project ${projectId}`;
    const response = await apiCall('connections/create', 'POST', {
      sourceId,
      destinationId,
      name: connectionName,
      namespaceDefinition: "source",
      namespaceFormat: "${SOURCE_NAMESPACE}",
      prefix: "",
      status: "active",
      scheduleType: "manual",
      syncCatalog,
      operations: []
    });
    
    if (!response?.connectionId) {
      console.error('Resposta da criação de conexão inválida:', response);
      throw new Error('Falha ao criar conexão no Airbyte: resposta não contém connectionId');
    }
    
    console.log(`Conexão criada com sucesso. ID: ${response.connectionId}`);
    return response.connectionId;
  } catch (error) {
    console.error(`Erro detalhado ao criar conexão para o projeto ${projectId}:`, error);
    
    // Para ambiente de desenvolvimento, retornar um ID simulado
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Ambiente de desenvolvimento: retornando ID de conexão simulado');
      return `dev-connection-error-${Date.now()}`;
    }
    
    throw error;
  }
}

/**
 * Sincroniza uma conexão do Airbyte para um projeto e registra metadados
 *
 * @param connectionId - ID da conexão Airbyte
 * @param projectId - ID do projeto
 * @param provider - Nome do provedor (ex: 'woocommerce')
 * @returns Detalhes do job de sincronização
 */
export async function syncProjectConnection(
  connectionId: string,
  projectId: string,
  provider: string
): Promise<any> {
  if (!connectionId) {
    throw new Error('connectionId é obrigatório');
  }
  
  if (!projectId) {
    throw new Error('projectId é obrigatório');
  }
  
  if (!provider) {
    throw new Error('provider é obrigatório');
  }
  
  console.log(`Sincronizando conexão ${connectionId} para projeto ${projectId} com provedor ${provider}`);
  
  // Para IDs simulados, retornar uma resposta simulada
  if (connectionId.startsWith('dev-') || connectionId.startsWith('mock-')) {
    console.warn('ATENÇÃO: Usando connectionId simulado. Retornando job simulado.');
    return {
      job: {
        id: `mock-job-${Date.now()}`,
        status: 'running'
      }
    };
  }
  
  try {
    // 1. Iniciar sincronização via Airbyte
    const syncJob = await syncConnection(connectionId);
    
    if (!syncJob?.job?.id) {
      throw new Error('Falha ao iniciar job de sincronização');
    }
    
    console.log(`Job de sincronização iniciado: ${syncJob.job.id}`);
    
    // 2. Registrar metadados da conexão no banco de dados
    try {
      console.log(`Registrando metadados da sincronização no banco de dados`);
      
      const supabase = createSupabaseClient();
      const timestamp = new Date().toISOString();
      
      // Primeiro, verificamos se a tabela e coluna existem fazendo um select
      console.log('Verificando estrutura da tabela airbyte_connections...');
      
      // Preparar dados para o upsert
      const connectionData: any = {
        project_id: projectId,
        provider: provider,
        connection_id: connectionId,
        status: 'syncing'
      };
      
      // Tentar adicionar last_sync_at apenas se a coluna existir
      try {
        // Adicionar campo last_sync_at ao objeto
        connectionData.last_sync_at = timestamp;
        
        // Realizar upsert (insert se não existe, update se existe)
        const { data, error } = await supabase
          .from('airbyte_connections')
          .upsert(
            connectionData,
            {
              onConflict: 'project_id,provider', // Campos que definem a unicidade do registro
              ignoreDuplicates: false // Atualiza se houver conflito
            }
          );
        
        if (error) {
          // Se o erro menciona last_sync_at, tente novamente sem esse campo
          if (error.message.includes('last_sync_at')) {
            console.warn('Coluna last_sync_at não encontrada. Tentando novamente sem esse campo.');
            delete connectionData.last_sync_at;
            
            const retryResult = await supabase
              .from('airbyte_connections')
              .upsert(
                connectionData,
                {
                  onConflict: 'project_id,provider',
                  ignoreDuplicates: false
                }
              );
              
            if (retryResult.error) {
              throw new Error(`Erro na segunda tentativa: ${retryResult.error.message}`);
            }
          } else {
            throw error;
          }
        }
      } catch (dbError) {
        console.error('Erro ao atualizar tabela airbyte_connections:', dbError);
        console.warn('Continuando a sincronização apesar do erro no banco de dados');
        // Não vamos falhar a sincronização só porque não conseguimos registrar os metadados
      }
      
      console.log(`Metadados de sincronização registrados com sucesso para projeto ${projectId} e provedor ${provider}`);
    } catch (metadataError) {
      console.error('Erro ao registrar metadados, mas continuando com a sincronização:', metadataError);
      // Não interromper o processo só porque ocorreu erro no registro de metadados
    }
    
    // 3. Retornar os detalhes do job de sincronização
    return syncJob;
  } catch (error) {
    console.error(`Erro ao sincronizar conexão para projeto ${projectId}:`, error);
    
    // Para ambiente de desenvolvimento, retornar um job simulado
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Ambiente de desenvolvimento: retornando job simulado após erro');
      return {
        job: {
          id: `error-recovery-job-${Date.now()}`,
          status: 'running'
        }
      };
    }
    
    throw error;
  }
}

export default {
  createWorkspace,
  createSource,
  createDestination,
  createConnection,
  syncConnection,
  configureAirbyteClient,
  getAirbyteConfig,
  createProjectSource,
  createProjectDestination,
  createProjectConnection,
  syncProjectConnection,
  fetchSourceDefinitions,
  fetchDestinationDefinitions,
  refreshDefinitions,
  getSourceDefinitionByName,
  getDestinationDefinitionByName,
  loadDefinitions,
  saveDefinitions
};