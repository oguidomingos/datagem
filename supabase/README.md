# Configuração do Supabase - DataGem

Este diretório contém a configuração do Supabase para o projeto DataGem, incluindo schemas, migrations e seeds.

## Pré-requisitos

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. [Supabase CLI](https://supabase.com/docs/guides/cli)
   ```bash
   brew install supabase/tap/supabase
   ```

## Estrutura do Diretório

```
supabase/
├── schema.sql     # Definição das tabelas
├── seeds.sql      # Dados iniciais para desenvolvimento
└── config.toml    # Configuração do Supabase (gerado automaticamente)
```

## Comandos Principais

1. Inicializar Supabase localmente:
```bash
supabase init
```

2. Iniciar serviços locais:
```bash
supabase start
```

3. Verificar status dos serviços:
```bash
supabase status
```

4. Parar serviços locais:
```bash
supabase stop
```

## Tabelas Principais

### users
- id (uuid, PK)
- email (text, unique)
- created_at (timestamp)

### projects
- id (uuid, PK)
- user_id (uuid, FK)
- name (text)
- created_at (timestamp)

## Autenticação

O projeto utiliza autenticação via email/password gerenciada pelo Supabase Auth.

## Row Level Security (RLS)

As políticas de RLS garantem que:
1. Usuários só podem ver e modificar seus próprios projetos
2. Usuários não podem acessar dados de outros usuários

## Desenvolvimento Local

1. Inicie os serviços:
```bash
supabase start
```

2. Copie as credenciais geradas:
```bash
supabase status
```

3. Configure as variáveis de ambiente em `apps/web/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-aqui
```

## Notas Importantes

- Não commite arquivos `.env` ou credenciais
- Sempre execute `supabase stop` antes de desligar o computador
- Mantenha o `schema.sql` atualizado com todas as alterações