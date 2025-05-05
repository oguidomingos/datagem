-- Inserir uma conexão simulada para o projeto
INSERT INTO public.airbyte_connections (
  project_id,
  source_id,
  destination_id,
  connection_id,
  provider,
  user_id,
  status
)
VALUES (
  'cf623e37-48fa-41dd-a40a-277bc25b0f4a',  -- project_id - Substitua pelo ID do seu projeto
  'source_woocommerce_123',                -- ID da fonte (simulado)
  'destination_supabase_123',              -- ID do destino (simulado)
  'connection_woocommerce_supabase_123',   -- ID da conexão (simulado)
  'woocommerce',                           -- provedor
  'a09aad4b-2ecd-4a8d-953c-0e4092d3d04f',  -- user_id - Substitua pelo ID do seu usuário
  'active'                                 -- status
);