import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { META_ADS_CONFIG } from '@/config/oauth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Salvar o project_id nos cookies para usar no callback
    cookies().set('oauth_project_id', projectId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5 // 5 minutos
    })

    // Construir a URL de autorização do Facebook
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.append('client_id', META_ADS_CONFIG.client_id)
    authUrl.searchParams.append('redirect_uri', META_ADS_CONFIG.redirect_uri)
    authUrl.searchParams.append('scope', META_ADS_CONFIG.scopes.join(','))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('state', projectId)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Erro na autenticação Meta:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=auth_failed`, request.url)
    )
  }
}