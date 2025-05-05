import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
    }

    const supabase = createClient()

    const { data: tokens, error } = await supabase
      .from('external_tokens')
      .select()
      .eq('project_id', projectId)

    if (error) {
      console.error('Erro ao buscar tokens:', error)
      return NextResponse.json({ error: 'Erro ao buscar tokens' }, { status: 500 })
    }

    return NextResponse.json(tokens)
  } catch (error) {
    console.error('Erro na rota /api/tokens:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}