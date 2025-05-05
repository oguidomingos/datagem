-- Cria a tabela airbyte_sync_logs
create table if not exists public.airbyte_sync_logs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects on delete cascade not null,
  provider text not null,
  job_id bigint not null,
  status text not null,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  error text,
  user_id uuid references public.users on delete cascade not null
);

-- Habilita RLS na tabela airbyte_sync_logs
alter table public.airbyte_sync_logs enable row level security;

-- Cria a política RLS para permitir que o usuário acesse apenas os seus logs
create policy "User can access only own logs"
  on public.airbyte_sync_logs for all
  using (auth.uid() = user_id);