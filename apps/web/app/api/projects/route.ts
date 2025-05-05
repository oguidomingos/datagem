import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Nome do projeto é obrigatório' },
        { status: 400 }
      )
    }

    // Cliente com service role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookies().set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookies().delete({ name, ...options })
          },
        },
      }
    )

    // Garantir que o usuário existe na tabela public.users
    const user = await ensureUserExists()

    console.log('Criando projeto:', {
      name,
      user_id: user.id
    })

    // Usar a função administrativa para criar o projeto
    const { data: project, error: createError } = await supabase
      .rpc('admin_create_project', {
        name: name,
        owner_id: user.id
      })

    if (createError) {
      console.error('Erro detalhado:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      })
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    console.log('Projeto criado com sucesso:', project)
    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Erro completo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}