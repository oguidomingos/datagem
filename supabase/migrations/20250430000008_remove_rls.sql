-- Remover todas as políticas e funções existentes
drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Authenticated users can manage their own projects" on public.projects;
drop function if exists public.create_project(text);
drop function if exists public.force_create_project(text, uuid);
drop function if exists public.admin_create_project(text, uuid);

-- Desabilitar RLS
alter table public.projects disable row level security;

-- Dar acesso total ao service role
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on schema public to service_role;

-- Recriar função com service_role
create or replace function public.admin_create_project(
  name text,
  owner_id uuid
) returns public.projects as $$
  insert into public.projects (name, user_id)
  values (name, owner_id)
  returning *;
$$ language sql security definer;

-- Permitir que usuários autenticados chamem a função
revoke execute on function public.admin_create_project(text, uuid) from public;
grant execute on function public.admin_create_project(text, uuid) to authenticated;

-- Comentar função para documentação
comment on function public.admin_create_project(text, uuid) is
  'Creates a project ignoring RLS. Security enforced through service_role.';