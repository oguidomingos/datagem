import { google } from 'googleapis'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { GOOGLE_ADS_CONFIG } from '@/config/oauth'

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_ADS_CONFIG.client_id,
  GOOGLE_ADS_CONFIG.client_secret,
  GOOGLE_ADS_CONFIG.redirect_uri
)

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

    // Gerar a URL de autorização
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_ADS_CONFIG.scopes,
      prompt: 'consent'
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Erro na autenticação Google:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=auth_failed`, request.url)
    )
  }
}