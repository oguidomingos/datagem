-- Remover políticas anteriores
drop policy if exists "Enable insert for authenticated users" on public.projects;
drop policy if exists "Enable select for user's own projects" on public.projects;
drop policy if exists "Enable update for user's own projects" on public.projects;
drop policy if exists "Enable delete for user's own projects" on public.projects;

-- Criar função para inserir projetos de forma segura
create or replace function public.create_project(
  project_name text
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  -- Inserir o projeto
  insert into public.projects (name, user_id)
  values (project_name, auth.uid())
  returning * into new_project;

  return new_project;
end;
$$;

-- Criar políticas básicas
create policy "Users can manage own projects"
  on public.projects
  using (auth.uid() = user_id);

-- Garantir que apenas usuários autenticados podem chamar a função
revoke execute on function public.create_project(text) from public;
grant execute on function public.create_project(text) to authenticated;

-- Garantir que a RLS está ativada
alter table public.projects enable row level security;