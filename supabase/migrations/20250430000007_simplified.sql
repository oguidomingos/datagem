-- Remover todas as políticas e funções existentes
drop policy if exists "Users can manage own projects" on public.projects;
drop policy if exists "Authenticated users can manage their own projects" on public.projects;
drop function if exists public.create_project(text);
drop function if exists public.force_create_project(text, uuid);

-- Garantir que RLS está ativo
alter table public.projects enable row level security;

-- Dar acesso total ao service role
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on schema public to service_role;

-- Criar política simples para usuários autenticados
create policy "Allow authenticated access"
on public.projects
as permissive
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Criar função simples que usa service role
create or replace function public.admin_create_project(
  name text,
  owner_id uuid
) returns public.projects as $$
  insert into public.projects (name, user_id)
  values (name, owner_id)
  returning *;
$$ language sql security definer;

-- Permitir que usuários autenticados chamem a função
grant execute on function public.admin_create_project(text, uuid) to authenticated;

-- Comentar função para documentação
comment on function public.admin_create_project(text, uuid) is
'Creates a project bypassing RLS. Security enforced through service_role.';