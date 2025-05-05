import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as airbyteClient from '../../../../lib/airbyte-client';

export async function POST(request: NextRequest) {
  // Inicializar o cliente Supabase
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Email do usuário não disponível' }, { status: 400 });
    }

    // Obter parâmetros da requisição
    const { project_id, provider } = await request.json();

    // Validar parâmetros
    if (!project_id) {
      return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 });
    }
    
    if (!provider) {
      return NextResponse.json({ error: 'provider é obrigatório' }, { status: 400 });
    }

    console.log(`Iniciando sincronização completa para projeto ${project_id} com provider ${provider}`);

    // Verificar permissão do usuário sobre o projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', project_id)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      console.error('Erro ao verificar permissão do projeto:', projectError);
      return NextResponse.json(
        { error: 'Projeto não encontrado ou sem permissão de acesso' }, 
        { status: 403 }
      );
    }

    // 1. Buscar o token ativo para o provider
    // Definir a estrutura do token para melhorar a tipagem
    interface ExternalToken {
      id: string;
      user_id: string;
      project_id: string;
      provider: string;
      access_token: string;
      refresh_token?: string;
      expires_at?: string;
      created_at: string;
      status: string;
      metadata?: {
        store_url?: string;
        consumer_key?: string;
        consumer_secret?: string;
        [key: string]: any;
      };
    }
    
    const { data: token, error: tokenError } = await supabase
      .from('external_tokens')
      .select('*')
      .eq('project_id', project_id)
      .eq('provider', provider)
      .eq('status', 'active')
      .maybeSingle();

    if (tokenError) {
      console.error('Erro ao buscar token:', tokenError);
      return NextResponse.json(
        { error: 'Erro interno ao buscar credenciais do provedor' },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: `Conexão ${provider} ativa não encontrada para este projeto` },
        { status: 404 }
      );
    }

    // Validar metadata do token de acordo com o provider
    if (provider === 'woocommerce' &&
        (!token?.metadata?.store_url || !token?.metadata?.consumer_key || !token?.metadata?.consumer_secret)) {
      console.error('Metadata do token WooCommerce incompleto:', token?.metadata);
      return NextResponse.json(
        { error: 'Credenciais WooCommerce incompletas' },
        { status: 400 }
      );
    }
    // Adicionar validação para outros providers quando forem suportados

    // 2. Verificar se o usuário já tem um workspace_id. Se não, criar um
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Erro interno ao verificar workspace do usuário' },
        { status: 500 }
      );
    }

    let workspaceId = user?.workspace_id;
    
    // Se não tiver workspace, criar um novo
    if (!workspaceId) {
      try {
        workspaceId = await airbyteClient.createWorkspace(userId, userEmail);
        console.log(`Workspace criado: ${workspaceId}`);
      } catch (error) {
        console.error('Erro ao criar workspace:', error);
        return NextResponse.json(
          { error: 'Erro ao criar workspace no Airbyte' },
          { status: 500 }
        );
      }
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Não foi possível obter ou criar um workspace' },
        { status: 500 }
      );
    }

    // 3. Criar um source no Airbyte com os dados do provedor
    let sourceId: string;
    try {
      // Preparar a configuração do conector de acordo com o provider
      let connectionConfiguration: any = {};
      
      if (provider === 'woocommerce') {
        connectionConfiguration = {
          shop: token.metadata!.store_url,
          api_key: token.metadata!.consumer_key,
          api_secret: token.metadata!.consumer_secret,
          start_date: "2023-01-01T00:00:00Z",
          is_sandbox: false
        };
      } else {
        // Implementar outros providers no futuro
        return NextResponse.json(
          { error: `Provider ${provider} ainda não suportado para integração Airbyte` },
          { status: 400 }
        );
      }
      
      // Usar a função createProjectSource que desenvolvemos
      sourceId = await airbyteClient.createProjectSource(
        workspaceId, 
        project_id, 
        provider, 
        connectionConfiguration
      );
      
      console.log(`Source criada com sucesso: ${sourceId}`);
    } catch (error) {
      console.error('Erro ao criar source:', error);
      return NextResponse.json(
        { error: 'Erro ao criar source no Airbyte' },
        { status: 500 }
      );
    }

    // 4. Criar um destination com Supabase
    let destinationId: string;
    try {
      // Usar a função createProjectDestination que desenvolvemos
      destinationId = await airbyteClient.createProjectDestination(
        workspaceId, 
        project_id
      );
      
      console.log(`Destination criada com sucesso: ${destinationId}`);
    } catch (error) {
      console.error('Erro ao criar destination:', error);
      return NextResponse.json(
        { error: 'Erro ao criar destination no Airbyte' },
        { status: 500 }
      );
    }

    // 5. Criar uma connection entre source e destination
    let connectionId: string;
    try {
      // Usar a função createProjectConnection que desenvolvemos
      connectionId = await airbyteClient.createProjectConnection(
        sourceId, 
        destinationId, 
        project_id
      );
      
      console.log(`Connection criada com sucesso: ${connectionId}`);
    } catch (error) {
      console.error('Erro ao criar connection:', error);
      return NextResponse.json(
        { error: 'Erro ao criar connection no Airbyte' },
        { status: 500 }
      );
    }

    // 6. Iniciar sincronização e registrar metadados
    try {
      // Usar a função syncProjectConnection que desenvolvemos
      const syncResult = await airbyteClient.syncProjectConnection(
        connectionId, 
        project_id, 
        provider
      );
      
      console.log(`Sincronização iniciada com sucesso: ${syncResult.job.id}`);
      
      // 7. Retornar o resultado
      return NextResponse.json({
        status: "ok",
        connectionId: connectionId,
        jobId: syncResult.job.id,
        provider: provider,
        projectId: project_id
      });
    } catch (error) {
      console.error('Erro ao iniciar sincronização:', error);
      return NextResponse.json(
        { error: 'Erro ao iniciar sincronização no Airbyte' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro na rota de sincronização completa:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor', details: error.message },
      { status: 500 }
    );
  }
}