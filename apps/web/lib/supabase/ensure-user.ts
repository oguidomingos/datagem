import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function ensureUserExists() {
  // Cliente com service role para operações administrativas
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

  // Cliente normal para obter o usuário atual
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Obter usuário autenticado
  const { data: { session } } = await authClient.auth.getSession()
  
  if (!session?.user) {
    throw new Error('Usuário não autenticado')
  }

  try {
    // Tenta inserir o usuário diretamente com a função RPC
    const { data: newUser, error: insertError } = await supabase.rpc('admin_create_user', {
      user_id: session.user.id,
      user_email: session.user.email || 'sem-email@example.com'
    })

    if (insertError) {
      console.error('Erro na função admin_create_user:', insertError)
      throw new Error(insertError.message)
    }

    console.log('Usuário verificado/criado com sucesso:', session.user.id)
  } catch (error: any) { // Tipar error como any para acessar propriedades
    // Logar o erro original completo para diagnóstico
    console.error('Erro detalhado ao garantir existência do usuário:', error);
    // Propagar a mensagem de erro original se disponível, ou uma mensagem padrão
    const errorMessage = error?.message || 'Erro desconhecido ao garantir existência do usuário';
    throw new Error(errorMessage);
  }

  return session.user
}