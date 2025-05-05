import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as airbyteClient from '../../../../lib/airbyte-client'

// Constante do SourceDefinitionId do WooCommerce
const WOOCOMMERCE_SOURCE_DEFINITION_ID = '2a2552ca-9f78-4c1c-9eb7-4d0dc66d72df';

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

    // Obter parâmetros da requisição
    const { project_id, provider } = await request.json();

    // Validar parâmetros
    if (!project_id) {
      return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 });
    }
    if (!provider) {
      return NextResponse.json({ error: 'provider é obrigatório' }, { status: 400 });
    }
    if (provider !== 'woocommerce' && provider !== 'google' && provider !== 'meta') {
      return NextResponse.json({ error: 'Provider não suportado' }, { status: 400 });
    }

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

    // 1. Buscar o token de external_tokens via Supabase
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
        (!token.metadata?.store_url || !token.metadata?.consumer_key || !token.metadata?.consumer_secret)) {
      console.error('Metadata do token WooCommerce incompleto:', token.metadata);
      return NextResponse.json(
        { error: 'Credenciais WooCommerce incompletas' }, 
        { status: 400 }
      );
    }
    // Validar outros providers quando forem suportados...

    // 2. Verificar se o usuário já tem um workspace_id. Se não, criar um e salvar
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
    if (!workspaceId && userEmail) {
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
      if (provider === 'woocommerce') {
        sourceId = await airbyteClient.createSource(workspaceId, {
          name: `WooCommerce - Projeto ${project.name} (${project_id})`,
          sourceDefinitionId: WOOCOMMERCE_SOURCE_DEFINITION_ID,
          connectionConfiguration: {
            shop: token.metadata.store_url,
            api_key: token.metadata.consumer_key,
            api_secret: token.metadata.consumer_secret,
            start_date: "2023-01-01T00:00:00Z",
            is_sandbox: false
          }
        });
      } else {
        // Implementar outros providers no futuro
        return NextResponse.json(
          { error: `Provider ${provider} ainda não suportado para integração Airbyte` },
          { status: 400 }
        );
      }
      
      console.log(`Source criada: ${sourceId}`);
    } catch (error) {
      console.error('Erro ao criar source:', error);
      return NextResponse.json(
        { error: 'Erro ao criar source no Airbyte' },
        { status: 500 }
      );
    }

    // 4. Criar um destination do tipo Postgres apontando para a Supabase
    let destinationId: string;
    try {
      destinationId = await airbyteClient.createDestination(workspaceId, project_id);
      console.log(`Destination criada: ${destinationId}`);
    } catch (error) {
      console.error('Erro ao criar destination:', error);
      return NextResponse.json(
        { error: 'Erro ao criar destination no Airbyte' },
        { status: 500 }
      );
    }

    // 5. Rodar o discoverSchema e criar o connection no Airbyte
    let connectionId: string;
    try {
      connectionId = await airbyteClient.createConnection(sourceId, destinationId);
      console.log(`Connection criada: ${connectionId}`);
    } catch (error) {
      console.error('Erro ao criar connection:', error);
      return NextResponse.json(
        { error: 'Erro ao criar connection no Airbyte' },
        { status: 500 }
      );
    }

    // 6. Salvar os IDs em airbyte_connections
    try {
      const { error: insertError } = await supabase
        .from('airbyte_connections')
        .insert({
          project_id: project_id,
          source_id: sourceId,
          destination_id: destinationId,
          connection_id: connectionId,
          provider: provider,
          user_id: userId,
          status: 'active'
        });

      if (insertError) {
        console.error('Erro ao salvar conexão no banco:', insertError);
        return NextResponse.json(
          { error: 'Erro ao registrar conexão no banco de dados' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Exceção ao salvar conexão:', error);
      return NextResponse.json(
        { error: 'Erro ao registrar conexão no banco de dados' },
        { status: 500 }
      );
    }

    // 7. Iniciar a sincronização
    try {
      const syncResult = await airbyteClient.syncConnection(connectionId);
      console.log(`Sincronização iniciada: ${syncResult.job?.id}`);
      
      // Registrar o log da sincronização
      await supabase
        .from('airbyte_sync_logs')
        .insert({
          project_id: project_id,
          provider: provider,
          job_id: syncResult.job.id,
          status: 'running',
          started_at: new Date().toISOString(),
          user_id: userId
        });
      
      // 7. Retornar status 200 com os IDs
      return NextResponse.json({
        success: true,
        source_id: sourceId,
        destination_id: destinationId,
        connection_id: connectionId,
        job_id: syncResult.job.id,
        message: 'Sincronização iniciada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao iniciar sincronização:', error);
      return NextResponse.json(
        { error: 'Erro ao iniciar sincronização no Airbyte' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro na rota de sincronização:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor', details: error.message },
      { status: 500 }
    );
  }
}