import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { ProjectSidebar } from '@/components/project-sidebar';
// Ajustar caminho relativo para LogoutButton (agora está um nível acima)
import LogoutButton from '../../logout-button';

// Definir tipo para Projeto (ajuste conforme sua estrutura real)
interface Project {
  id: string;
  name: string;
  user_id: string; // Adicionar user_id para validação
}

export default async function ProjectLayout({ // Renomear para ProjectLayout
  children,
  params,
}: {
  children: React.ReactNode;
  params: { project_id: string }; // Receber params diretamente
}) {
  const projectId = params.project_id; // Agora deve receber o ID corretamente
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

  // 1. Obter o usuário atual
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('ProjectLayout: Error fetching user or no user logged in', userError);
    redirect('/login'); // Redirecionar para login se não houver usuário
  }

  console.log('ProjectLayout: User ID:', user.id);
  console.log('ProjectLayout: Project ID from params:', projectId);

  // 2. Buscar dados do projeto e validar acesso (RLS deve cuidar disso)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, user_id') // Buscar user_id para validação (opcional se confiar 100% RLS)
    .eq('id', projectId)
    .single();

  // Log detalhado ANTES da validação
  console.log('ProjectLayout: Validation Check - User ID:', user?.id);
  console.log('ProjectLayout: Validation Check - Project ID:', projectId);
  console.log('ProjectLayout: Validation Check - Project Data:', project);
  console.log('ProjectLayout: Validation Check - Project Error:', projectError);


  if (projectError || !project) {
    // Se RLS estiver correta, isso só deve acontecer se o projeto REALMENTE não existe
    console.error(`ProjectLayout: REDIRECTING (Project not found or RLS failed) - Project: ${projectId}, Error:`, projectError);
    redirect('/select-project');
  }

  // Verificação de propriedade redundante removida - confiando na RLS da query select()

  console.log('ProjectLayout: RLS check passed. Project Name:', project.name);


  // Permissão de Admin (conforme comentário anterior, sempre false por enquanto)
  const isAdmin = false;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Barra Lateral Fixa */}
      {/* Passar projectName, isAdmin E projectId obtidos no servidor */}
      <ProjectSidebar projectName={project.name} isAdmin={isAdmin} projectId={projectId} />

      {/* Conteúdo Principal com scroll */}
      <div className="flex-1 flex flex-col ml-64">

        {/* Navbar Superior */}
        <nav className="bg-white shadow sticky top-0 z-10 h-16 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-full justify-end items-center">
              <LogoutButton />
            </div>
          </div>
        </nav>

        {/* Área de Conteúdo da Página */}
        <main className="flex-grow p-6 md:p-10">
           <div className="mx-auto max-w-7xl">
            {children}
           </div>
        </main>
      </div>
    </div>
  );
}