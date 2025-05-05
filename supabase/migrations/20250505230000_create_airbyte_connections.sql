-- Adicionar campo workspace_id para tabela users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS workspace_id text;

-- Cria a tabela airbyte_connections
CREATE TABLE IF NOT EXISTS public.airbyte_connections (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  source_id text NOT NULL,
  destination_id text NOT NULL,
  connection_id text NOT NULL,
  provider text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' NOT NULL
);

-- Habilita RLS na tabela airbyte_connections
ALTER TABLE public.airbyte_connections ENABLE ROW LEVEL SECURITY;

-- Cria a política RLS para permitir que o usuário acesse apenas as suas conexões
CREATE POLICY "Users can read own connections"
  ON public.airbyte_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON public.airbyte_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON public.airbyte_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON public.airbyte_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX airbyte_connections_project_id_idx ON public.airbyte_connections(project_id);
CREATE INDEX airbyte_connections_user_id_idx ON public.airbyte_connections(user_id);
CREATE UNIQUE INDEX airbyte_connections_project_provider_idx ON public.airbyte_connections(project_id, provider);

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_airbyte_connections_updated_at
  BEFORE UPDATE ON public.airbyte_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();