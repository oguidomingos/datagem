-- Ativar extensões necessárias
create extension if not exists "uuid-ossp";

-- Tabela de usuários (estende a auth.users do Supabase)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de projetos
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Função trigger para criar entrada na tabela users após signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar user após signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Políticas RLS

-- Habilitar RLS
alter table public.users enable row level security;
alter table public.projects enable row level security;

-- Políticas para users
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Políticas para projects
create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Função para buscar projetos do usuário atual
create or replace function public.get_user_projects()
returns setof public.projects
language sql security definer
set search_path = public
stable
as $$
  select * from public.projects
  where user_id = auth.uid()
  order by created_at desc;
$$;

-- Inserir usuários de teste
insert into auth.users (id, email, encrypted_password, email_confirmed_at)
values
  ('d0c4e95b-7e32-4927-9c6d-8031b4633492', 'teste1@datagem.com.br', crypt('senha123', gen_salt('bf')), now()),
  ('f1e2d3c4-b5a6-4321-9876-567890abcdef', 'teste2@datagem.com.br', crypt('senha123', gen_salt('bf')), now());