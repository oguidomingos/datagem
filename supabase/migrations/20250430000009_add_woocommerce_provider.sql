-- Alterar a constraint do provider para incluir woocommerce
alter table public.external_tokens 
  drop constraint external_tokens_provider_check,
  add constraint external_tokens_provider_check 
    check (provider in ('google', 'meta', 'woocommerce'));