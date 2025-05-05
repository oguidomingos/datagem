import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { META_ADS_CONFIG } from '@/config/oauth'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

async function getAccessToken(code: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
  const params = new URLSearchParams({
    client_id: META_ADS_CONFIG.client_id,
    client_secret: META_ADS_CONFIG.client_secret,
    redirect_uri: META_ADS_CONFIG.redirect_uri,
    code
  })

  const response = await fetch(`${tokenUrl}?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Falha ao obter token de acesso do Meta')
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const projectId = cookies().get('oauth_project_id')?.value

    if (!code || !projectId) {
      throw new Error('Código de autorização ou projeto não encontrado')
    }

    // Trocar o código por token de acesso
    const { access_token, expires_in } = await getAccessToken(code)

    // Garantir que o usuário existe na tabela public.users
    const user = await ensureUserExists()
    
    // Configurar cliente do Supabase
    const supabase = createClient()

    // Calcular data de expiração
    const expires_at = new Date()
    expires_at.setSeconds(expires_at.getSeconds() + expires_in)

    // Salvar os tokens no Supabase
    const { error: insertError } = await supabase
      .from('external_tokens')
      .upsert({
        user_id: user.id,
        project_id: projectId,
        provider: 'meta',
        access_token,
        expires_at: expires_at.toISOString()
      }, {
        onConflict: 'project_id,provider'
      })

    if (insertError) {
      throw insertError
    }

    // Limpar o cookie de project_id
    cookies().delete('oauth_project_id')

    // Redirecionar de volta para a página de conexões
    return NextResponse.redirect(
      new URL(`/connections?project_id=${projectId}`, request.url)
    )
  } catch (error) {
    console.error('Erro no callback Meta:', error)
    return NextResponse.redirect(
      new URL(`/connections?error=callback_failed`, request.url)
    )
  }
}