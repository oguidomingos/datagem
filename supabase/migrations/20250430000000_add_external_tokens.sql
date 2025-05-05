-- Criar a tabela external_tokens
create table if not exists public.external_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  project_id uuid references public.projects on delete cascade not null,
  provider text not null check (provider in ('google', 'meta')),
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.external_tokens enable row level security;

-- Políticas RLS
create policy "Users can read own tokens"
  on public.external_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on public.external_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens"
  on public.external_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on public.external_tokens for delete
  using (auth.uid() = user_id);

-- Índices
create index external_tokens_user_id_idx on public.external_tokens(user_id);
create index external_tokens_project_id_idx on public.external_tokens(project_id);
create unique index external_tokens_project_provider_idx on public.external_tokens(project_id, provider);