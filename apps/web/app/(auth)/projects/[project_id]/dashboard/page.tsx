import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';
// Ajustar caminho de importação para NewProjectButton
// import NewProjectButton from '../../../dashboard/new-project-button'; 
// Comentado por enquanto, pois NewProjectButton pode não ser relevante aqui

interface DashboardPageProps {
  params: {
    project_id: string;
  };
}

export default async function ProjectDashboardPage({ params }: DashboardPageProps) {
  const projectId = params.project_id;
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

  // Buscar dados específicos deste projeto (exemplo: nome e conexões)
  // O layout já valida o acesso, mas podemos buscar novamente se necessário
  // ou passar dados do layout (mais complexo)
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      name,
      external_tokens (
        provider,
        created_at
      )
    `)
    .eq('id', projectId)
    .single();

  if (error || !project) {
    console.error(`ProjectDashboardPage: Error fetching project ${projectId}`, error);
    // O layout deve ter redirecionado, mas como fallback:
    return <div>Erro ao carregar dados do projeto.</div>;
  }

  console.log(`ProjectDashboardPage: Displaying dashboard for project ${project.name} (${projectId})`);

  const connections = project.external_tokens || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard: {project.name}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Visão geral do projeto e suas conexões.
          </p>
        </div>
        {/* Botão de Novo Projeto não faz sentido aqui, talvez um botão de Configurações? */}
        {/* <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <NewProjectButton />
        </div> */}
      </div>

      {/* Conteúdo do Dashboard Específico do Projeto */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card de Resumo das Conexões */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Conexões Ativas</h2>
          {connections.length > 0 ? (
            <ul className="space-y-2">
              {connections.map((conn: any) => (
                <li key={conn.provider} className="text-sm text-gray-700">
                  - {conn.provider} (Conectado em: {new Date(conn.created_at).toLocaleDateString()})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma conexão ativa.</p>
          )}
          <div className="mt-4">
            <Link href={`/projects/${projectId}/connections`} passHref>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Gerenciar Conexões →
              </button>
            </Link>
          </div>
        </div>

        {/* Outros Cards/Informações do Dashboard */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Outras Informações</h2>
          <p className="text-sm text-gray-500">Adicione aqui outros dados relevantes do projeto...</p>
        </div>
      </div>
    </div>
  );
}