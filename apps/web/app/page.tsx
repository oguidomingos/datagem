import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Redireciona para o dashboard se estiver logado
  if (session) {
    redirect('/dashboard')
  }

  // Redireciona para o login se não estiver logado
  redirect('/login')
}
