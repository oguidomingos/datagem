import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';
import { Button } from '@repo/ui'; // Supondo que Button está em @repo/ui

// Definir tipo para Projeto (ajuste conforme sua estrutura real)
interface Project {
  id: string;
  name: string;
  // Adicione outros campos se necessário
}

export default async function SelectProjectPage() {
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
    console.error('SelectProjectPage: Error fetching user or no user logged in', userError);
    // Idealmente, redirecionar para login ou mostrar mensagem de erro
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Erro ao buscar usuário. Faça login novamente.</p>
      </div>
    );
  }

  console.log('SelectProjectPage: User ID:', user.id);

  // 2. Buscar projetos do usuário
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name') // Selecionar apenas os campos necessários
    .eq('user_id', user.id); // Filtrar pelo user_id

  if (projectsError) {
    console.error('SelectProjectPage: Error fetching projects:', projectsError);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Erro ao buscar projetos.</p>
      </div>
    );
  }

  console.log('SelectProjectPage: Fetched Projects:', projects);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Selecione um Projeto
        </h1>
        {projects && projects.length > 0 ? (
          <ul className="space-y-4">
            {projects.map((project: Project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}/dashboard`} passHref>
                  <Button
                    // Remover variant e ajustar className para estilo outline
                    className="w-full justify-start text-left p-4 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {project.name}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500">
            Você ainda não tem projetos. Crie um no dashboard.
            {/* Adicionar link para criar projeto se aplicável */}
          </p>
        )}
        {/* Opcional: Botão para criar novo projeto */}
        {/* <div className="mt-6 text-center">
          <Link href="/dashboard?newProject=true" passHref>
             <Button>Criar Novo Projeto</Button>
          </Link>
        </div> */}
      </div>
    </div>
  );
}