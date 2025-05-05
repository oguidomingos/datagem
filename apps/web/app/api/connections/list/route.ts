import { createClient } from '@/lib/supabase/server'; // Usar cliente server-side na API route
import { NextRequest, NextResponse } from 'next/server';
// cookies() é chamado dentro de createClient agora

export async function GET(request: NextRequest) {
  // cookieStore não é mais necessário aqui
  const supabase = createClient(); // Chamar sem argumentos

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Verificar se o usuário tem acesso ao projeto (importante para segurança)
  // TODO: Implementar verificação de permissão RLS ou lógica similar
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar os tokens externos para o projeto especificado
  const { data: connections, error } = await supabase
    .from('external_tokens')
    .select(`
      id,
      provider,
      created_at,
      updated_at,
      metadata,
      provider_user_id,
      provider_account_name
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false }); // Ordenar pelos mais recentes

  if (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections', details: error.message }, { status: 500 });
  }

  // Mapear os dados para o formato desejado (opcional, mas pode ser útil)
  const formattedConnections = connections.map(conn => ({
    id: conn.id,
    provider: conn.provider,
    status: 'connected', // Assumindo que todos os tokens buscados estão ativos
    details: {
      // Extrair detalhes específicos do metadata
      store_url: conn.provider === 'woocommerce' ? conn.metadata?.store_url : undefined,
      google_ads_account: conn.provider === 'google_ads' ? conn.provider_account_name : undefined, // Usar provider_account_name se disponível
      meta_business_name: conn.provider === 'meta' ? 'Nome Business Meta (Placeholder)' : undefined, // Placeholder
      // Adicionar outros detalhes conforme necessário
    },
    lastModified: conn.updated_at || conn.created_at,
  }));

  return NextResponse.json(formattedConnections);
}