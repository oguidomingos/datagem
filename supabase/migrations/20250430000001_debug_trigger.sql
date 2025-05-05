-- Recriar o trigger com logging
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Log para debug
  raise notice 'Criando usuário: id=%, email=%', new.id, new.email;
  
  insert into public.users (id, email)
  values (new.id, new.email);

  -- Log de sucesso
  raise notice 'Usuário criado com sucesso';
  
  return new;
exception when others then
  -- Log de erro
  raise notice 'Erro ao criar usuário: %', SQLERRM;
  return null;
end;
$$ language plpgsql security definer;