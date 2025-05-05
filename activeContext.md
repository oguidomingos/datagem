# Context Atual do Projeto DataGem

## Sprint 0 – Setup Inicial
### Etapa 4: Setup local de ingestão de dados com Airbyte ✅

O ambiente Airbyte foi configurado com sucesso fora do monorepo, diretamente em ~/airbyte.

### Serviços Configurados

O ambiente conta com os seguintes serviços no docker-compose.yml:

1. **webapp** 
   - Interface web do Airbyte
   - Acessível via porta 8000
   - Depende do servidor principal

2. **server**
   - Servidor principal da aplicação
   - Expõe API na porta 8001
   - Gerencia workspace e configurações

3. **db**
   - Banco de dados PostgreSQL
   - Porta 5433 (mapeada de 5432)
   - Armazena configurações e estado do Airbyte

4. **bootloader**
   - Responsável por inicialização e migrações
   - Garante consistência do banco de dados
   - Executa antes do servidor principal

5. **worker**
   - Processa as sincronizações de dados
   - Compartilha volumes com o servidor
   - Gerencia execução dos conectores

6. **connector-builder-server**
   - Servidor para construção de conectores
   - Porta 8080
   - Facilita desenvolvimento de novos conectores

### Status Atual

O ambiente está operacional e acessível via localhost:
- UI: http://localhost:8000
- API: http://localhost:8001
- Database: localhost:5433

Todos os serviços estão rodando em containers Docker e comunicando-se através da rede interna `airbyte_internal`.

## Estrutura Técnica do Projeto

### Monorepo (Turborepo)
- Gerenciamento de workspaces com npm
- Estrutura organizada em apps/* e packages/*
- Node.js >= 18 requerido

### Frontend (apps/web)
- Next.js 14.1.0
- React 18.2.0
- Tailwind CSS 3.4.1
- TypeScript 5.3.3
- Porta de desenvolvimento: 3000

### Backend (Supabase)
- Autenticação nativa do Supabase
- PostgreSQL com Row Level Security (RLS)
- Estrutura de dados:
  - Users (extends auth.users)
  - Projects (com políticas RLS)
- Triggers automáticos para criação de usuário
- Funções SQL utilitárias (ex: get_user_projects)

### Biblioteca de UI (packages/ui)
- Componentes React compartilhados
- Sistema de design consistente
- Exportação centralizada de componentes
- Integração com Tailwind CSS

### Configurações de Desenvolvimento
- ESLint com configuração zero-warnings
- Prettier para formatação de código
- TypeScript strict mode
- Verificação de tipos automatizada

### Estrutura de Diretórios
```
./
├── apps/
│   ├── web/     # Aplicação Next.js principal
│   └── docs/    # Documentação do projeto
├── packages/
│   ├── ui/      # Componentes compartilhados
│   ├── eslint-config/
│   └── typescript-config/
├── supabase/    # Configurações do Supabase
└── airbyte/     # Configurações de ingestão de dados
```

### Conectores Airbyte Configurados
- Google Ads
- Meta (Facebook) Ads
- Faker (para desenvolvimento)