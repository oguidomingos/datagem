-- Criar função administrativa para inserir usuários com SQL direto
create or replace function public.admin_create_user(
  user_email text,
  user_id uuid
) returns public.users language plpgsql security definer as $$
declare
  result public.users;
begin
  -- Verifica se o usuário já existe em public.users
  select * into result from public.users where id = user_id;
  
  -- Se não existe, insere com SET LOCAL para desabilitar temporariamente restrições
  if result.id is null then
    -- Desabilitar temporariamente restrições de chave estrangeira
    SET LOCAL session_replication_role = 'replica';  -- Isso desabilita triggers e validações
    
    begin
      insert into public.users (id, email, created_at)
      values (
        user_id,
        user_email,
        timezone('utc'::text, now())
      );
      
      -- Restaurar configuração normal
      SET LOCAL session_replication_role = 'origin';
    exception
      when others then
        -- Garantir que configuração seja restaurada mesmo em caso de erro
        SET LOCAL session_replication_role = 'origin';
        raise;
    end;
    
    -- Obter o usuário inserido
    select * into result from public.users where id = user_id;
  end if;
  
  -- Retornar o usuário
  return result;
end;
$$;

-- Conceder permissão para o role service_role
grant execute on function public.admin_create_user(text, uuid) to service_role;

-- Comentar a função
comment on function public.admin_create_user(text, uuid) is
  'Insere um usuário diretamente na tabela public.users, ignorando restrições de chave estrangeira';