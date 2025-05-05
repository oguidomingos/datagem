import Link from 'next/link';
// Remover importação de useParams
// import { useParams } from 'next/navigation';

// Ícones placeholder - idealmente usar uma biblioteca como react-icons ou SVGs
const DashboardIcon = () => <span>📊</span>;
const ConnectionsIcon = () => <span>🔗</span>;
const DataIcon = () => <span>💾</span>;
const InsightsIcon = () => <span>💡</span>;
const ReportsIcon = () => <span>📄</span>;
const ChatIcon = () => <span>💬</span>;
const AdminIcon = () => <span>⚙️</span>;

interface ProjectSidebarProps {
  projectName: string;
  isAdmin?: boolean;
  projectId: string; // Adicionar projectId às props
}

export function ProjectSidebar({ projectName, isAdmin = false, projectId }: ProjectSidebarProps) {
  // Remover uso de useParams
  // const params = useParams();
  // const projectId = params.project_id as string;

  // Usar projectId da prop
  const navItems = [
    { href: `/projects/${projectId}/dashboard`, label: 'Dashboard', icon: DashboardIcon },
    { href: `/projects/${projectId}/connections`, label: 'Conexões', icon: ConnectionsIcon },
    { href: `/projects/${projectId}/dados`, label: 'Dados', icon: DataIcon }, // Corrigido para /dados
    { href: `/projects/${projectId}/insights`, label: 'Insights', icon: InsightsIcon },
    { href: `/projects/${projectId}/reports`, label: 'Relatórios', icon: ReportsIcon },
    { href: `/projects/${projectId}/chat`, label: 'Chat com Dados', icon: ChatIcon },
  ];

  if (isAdmin) {
    navItems.push({ href: `/projects/${projectId}/admin`, label: 'Admin', icon: AdminIcon });
  }

  // TODO: Adicionar lógica para estado ativo/hover e buscar nome do projeto real
  // TODO: Melhorar estilização com Tailwind

  return (
    <aside className="w-64 h-screen bg-gray-100 p-4 border-r border-gray-300 flex flex-col fixed left-0 top-0">
      <h2 className="text-xl font-semibold mb-6 truncate" title={projectName}>
        {projectName || 'Carregando Projeto...'}
      </h2>
      <nav className="flex-grow">
        <ul>
          {navItems.map((item) => (
            <li key={item.href} className="mb-2">
              <Link href={item.href} className="flex items-center p-2 rounded hover:bg-gray-200 text-gray-700">
                <item.icon />
                <span className="ml-3">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Link para trocar de projeto */}
      <div className="mt-auto pt-4 border-t border-gray-300"> {/* Adiciona espaço e borda acima */}
        <Link href="/select-project" className="flex items-center p-2 rounded hover:bg-gray-200 text-gray-700 text-sm">
          {/* Ícone opcional para troca */}
          <span>🔄</span>
          <span className="ml-3">Trocar Projeto</span>
        </Link>
      </div>
      {/* Pode adicionar informações do usuário ou logout aqui se não estiver na navbar superior */}
    </aside>
  );
}