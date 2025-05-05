-- Adiciona a coluna last_sync_at à tabela airbyte_connections para rastrear a hora da última sincronização
ALTER TABLE public.airbyte_connections
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone;

-- Atualizar as conexões existentes com um timestamp atual como valor inicial
UPDATE public.airbyte_connections
SET last_sync_at = timezone('utc'::text, now())
WHERE last_sync_at IS NULL;

-- Comentário para documentar
COMMENT ON COLUMN public.airbyte_connections.last_sync_at IS 'Timestamp da última sincronização bem-sucedida';