-- Drop função anterior
drop function if exists public.create_project(text);

-- Criar função que ignora RLS completamente
create or replace function public.force_create_project(
  project_name text,
  owner_id uuid
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  -- Desabilitar RLS temporariamente
  set local role service_role;
  
  -- Inserir projeto
  insert into projects (name, user_id)
  values (project_name, owner_id)
  returning * into new_project;

  -- Resetar role
  reset role;

  return new_project;
end;
$$;

-- Garantir que service role pode ignorar RLS
alter table public.projects force row level security;
grant all on public.projects to service_role;
grant usage on schema public to service_role;

-- Permitir que a função seja chamada por usuários autenticados
revoke execute on function public.force_create_project(text, uuid) from public;
grant execute on function public.force_create_project(text, uuid) to authenticated;

comment on function public.force_create_project(text, uuid) is 
  'Função que força a criação de um projeto ignorando RLS. Usar com cautela.';