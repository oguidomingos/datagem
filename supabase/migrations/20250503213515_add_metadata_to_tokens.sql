-- Adicionar coluna metadata à tabela external_tokens
ALTER TABLE public.external_tokens
ADD COLUMN metadata jsonb;