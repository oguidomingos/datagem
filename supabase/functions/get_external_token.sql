create or replace function public.get_external_token(project_id uuid, provider text)
returns jsonb
language sql security definer
set search_path = public
stable
as $$
  select metadata from public.external_tokens
  where external_tokens.project_id = get_external_token.project_id
  and external_tokens.provider = get_external_token.provider
  and external_tokens.status = 'active';
$$;