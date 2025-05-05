-- Remover todas as políticas existentes
drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Enable insert for authenticated users" on public.projects;
drop policy if exists "Enable select for authenticated users" on public.projects;
drop policy if exists "Enable update for authenticated users" on public.projects;
drop policy if exists "Enable delete for authenticated users" on public.projects;

-- Política super simples: usuários autenticados podem fazer tudo com seus próprios projetos
create policy "Authenticated users can manage their own projects"
on public.projects
for all -- aplica para select, insert, update, delete
using (
  auth.role() = 'authenticated' -- usuário está autenticado
  and 
  auth.uid() = user_id -- usuário é dono do projeto
)
with check (
  auth.role() = 'authenticated'
  and
  auth.uid() = user_id
);

-- Certificar que RLS está ativo
alter table public.projects force row level security;

-- Permitir que service role ignore RLS
alter table public.projects enable row level security;
grant all on public.projects to service_role;
grant usage on schema public to service_role;

-- Recriar função com service_role
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

-- Garantir que usuários autenticados podem executar a função
revoke execute on function public.create_project(text) from public;
grant execute on function public.create_project(text) to authenticated;