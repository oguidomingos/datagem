// Importar createClient do supabase-js para criar o cliente admin
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { providers } from '@/types'
// Manter createServerClient se for usado em getConnections
import { createServerClient } from '@supabase/ssr'

export async function getConnections(project_id: string) {
  const cookieStore = cookies() // Obter a store de cookies
  const supabase = createServerClient( // Usar a função do @supabase/ssr
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

  const { data: tokens, error } = await supabase
    .from('external_tokens')
    .select('*')
    .eq('project_id', project_id)

  // Retornar também o erro para tratamento no componente
  return { providers, tokens, error }
}

export async function hasActiveWooCommerceConnection(project_id: string): Promise<boolean> {
  console.log(`[hasActiveWooCommerceConnection] Checking for project_id: ${project_id}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[hasActiveWooCommerceConnection] Missing Supabase URL or Service Role Key.');
    return false; // Impede a verificação se a configuração estiver incompleta
  }

  // Criar cliente admin que bypassa RLS
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  console.log(`[hasActiveWooCommerceConnection] Using admin client.`);

  // Usar select com count: 'exact' para verificar a existência de forma eficiente
  const { error, count } = await supabaseAdmin
    .from('external_tokens')
    .select('*', { count: 'exact', head: true }) // Usar head:true para não buscar dados, apenas contar
    .eq('project_id', project_id)
    .eq('provider', 'woocommerce')
    .eq('status', 'active');

  if (error) {
    console.error(`[hasActiveWooCommerceConnection] Supabase admin error for project ${project_id}:`, error);
    return false;
  }

  console.log(`[hasActiveWooCommerceConnection] Supabase admin query count for project ${project_id}:`, count);
  // Se count for maior que 0, a conexão ativa existe
  const hasConnection = (count ?? 0) > 0;
  console.log(`[hasActiveWooCommerceConnection] Returning ${hasConnection} for project ${project_id}`);

  return hasConnection;
}