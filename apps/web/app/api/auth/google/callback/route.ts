import { google } from 'googleapis'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GOOGLE_ADS_CONFIG } from '@/config/oauth'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_ADS_CONFIG.client_id,
  GOOGLE_ADS_CONFIG.client_secret,
  GOOGLE_ADS_CONFIG.redirect_uri
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const projectId = cookies().get('oauth_project_id')?.value

    if (!code || !projectId) {
      throw new Error('Código de autorização ou projeto não encontrado')
    }

    // Trocar o código por tokens
    const { tokens } = await oauth2Client.getToken(code)
    const { access_token, refresh_token, expiry_date } = tokens

    if (!access_token) {
      throw new Error('Token de acesso não recebido')
    }

    // Garantir que o usuário existe na tabela public.users
    const user = await ensureUserExists()
    
    // Configurar cliente do Supabase
    const supabase = createClient()

    // Salvar os tokens no Supabase
    const { error: insertError } = await supabase
      .from('external_tokens')
      .upsert({
        user_id: user.id,
        project_id: projectId,
        provider: 'google',
        access_token,
        refresh_token,
        expires_at: expiry_date ? new Date(expiry_date).toISOString() : null
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
    console.error('Erro no callback Google:', error)
    return NextResponse.redirect(
      new URL(`/connections?error=callback_failed`, request.url)
    )
  }
}