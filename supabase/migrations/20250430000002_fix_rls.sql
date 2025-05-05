-- Remover políticas existentes
drop policy if exists "Users can create own projects" on public.projects;
drop policy if exists "Users can read own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

-- Criar novas políticas mais permissivas para usuários autenticados
create policy "Enable insert for authenticated users"
  on public.projects for insert
  with check (auth.role() = 'authenticated');

create policy "Enable select for user's own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Enable update for user's own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Enable delete for user's own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Garantir que a RLS está ativada
alter table public.projects force row level security;

-- Criar política para verificar se é usuário autenticado
create policy "Enable select for authenticated users"
  on public.users for select
  using (auth.role() = 'authenticated');

-- Garantir que todos os usuários autenticados podem se inserir na tabela users
create policy "Enable insert for authenticated users"
  on public.users for insert
  with check (auth.role() = 'authenticated');