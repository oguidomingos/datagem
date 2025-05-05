import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NewProjectButton from './new-project-button'

export default async function DashboardPage() {
  const supabase = createClient()
  
  // Buscar projetos do usuário com suas conexões
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      external_tokens (
        provider
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Meus Projetos
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie seus projetos e conexões com APIs externas
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <NewProjectButton />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => {
          const connectedApis = project.external_tokens?.length || 0

          return (
            <div
              key={project.id}
              className="relative flex flex-col space-y-4 rounded-lg border border-gray-300 bg-white p-6 shadow-sm"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {project.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    connectedApis > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {connectedApis} APIs conectadas
                  </span>
                </div>
                <Link
                  href={`/connections?project_id=${project.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Gerenciar conexões →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {(!projects || projects.length === 0) && (
        <div className="mt-8 text-center">
          <h3 className="text-sm font-semibold text-gray-900">Nenhum projeto</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comece criando seu primeiro projeto.
          </p>
        </div>
      )}
    </div>
  )
}