import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

// Este layout agora só verifica se o usuário está logado.
// A validação do projeto e a renderização da UI (sidebar, navbar)
// são feitas pelo layout aninhado em /projects/[project_id]/layout.tsx

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
  // Não recebe mais params aqui
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Verificar se o usuário está logado
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('AuthLayout: User not logged in, redirecting to /login', userError);
    redirect('/login');
  }

  console.log('AuthLayout: User is logged in:', user.id);

  // Simplesmente renderiza os filhos. O layout específico do projeto cuidará do resto.
  return <>{children}</>;
}