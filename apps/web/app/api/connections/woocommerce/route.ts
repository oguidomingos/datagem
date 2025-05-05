import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

export async function POST(request: Request) {
  try {
    const { store_url, consumer_key, consumer_secret, project_id } = await request.json()

    // Validação básica dos campos
    if (!store_url || !consumer_key || !consumer_secret || !project_id) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Validação da URL da loja
    try {
      new URL(store_url)
    } catch (error) {
      return NextResponse.json(
        { error: 'URL da loja inválida' },
        { status: 400 }
      )
    }

    // TODO: Validar as credenciais fazendo uma requisição de teste para a API do WooCommerce
    // GET {store_url}/wp-json/wc/v3/orders?per_page=1
    // com os headers de autenticação Basic base64(consumer_key:consumer_secret)

    // Garantir que o usuário existe na tabela public.users
    const user = await ensureUserExists()

    // Criar cliente do Supabase
    const supabase = createClient()

    // Inserir ou atualizar (UPSERT) credenciais no banco
    const { data, error } = await supabase
      .from('external_tokens')
      .upsert({
        user_id: user.id, // user_id pode precisar ser atualizado se o token for compartilhado? Ou manter o original? Mantendo o original por enquanto.
        project_id,
        provider: 'woocommerce',
        access_token: JSON.stringify({
          store_url,
          consumer_key,
          consumer_secret
        }),
        // Atualizar apenas o access_token se houver conflito em project_id e provider
      }, {
        onConflict: 'project_id, provider',
        // ignoreDuplicates: false // Padrão é false, então ele tentará atualizar
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar credenciais:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar credenciais' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}