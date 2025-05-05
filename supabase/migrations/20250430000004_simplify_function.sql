-- Drop função anterior
drop function if exists public.create_project(text);

-- Criar função simplificada
create or replace function public.create_project(
  project_name text
)
returns public.projects
language sql
security definer
set search_path = public
as $$
  insert into projects (name, user_id)
  values (project_name, auth.uid())
  returning *;
$$;

-- Garantir que apenas usuários autenticados podem chamar a função
revoke execute on function public.create_project(text) from public;
grant execute on function public.create_project(text) to authenticated;

-- Simplificar políticas RLS
truncate table public.projects cascade;

drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Enable insert for authenticated users" on public.projects;
drop policy if exists "Enable select for user's own projects" on public.projects;
drop policy if exists "Enable update for user's own projects" on public.projects;
drop policy if exists "Enable delete for user's own projects" on public.projects;

-- Criar política única para todas as operações
create policy "Users can manage own projects"
  on public.projects
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Garantir que a RLS está ativada
alter table public.projects enable row level security;