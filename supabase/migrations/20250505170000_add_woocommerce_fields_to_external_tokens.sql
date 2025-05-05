-- Adiciona os campos api_url, consumer_key e consumer_secret na tabela external_tokens
alter table public.external_tokens
add column api_url text,
add column consumer_key text,
add column consumer_secret text;