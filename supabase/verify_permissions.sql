-- Conectar como postgres (superuser)
\c postgres postgres

-- Criar usuário de teste
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000099', 'test99@example.com')
returning *;

-- Verificar se o trigger criou o usuário em public.users
select * from public.users where id = '00000000-0000-0000-0000-000000000099';

-- Testar função administrativa com service role
set role service_role;

select admin_create_project(
  'Projeto Teste Admin',
  '00000000-0000-0000-0000-000000000099'
);

-- Verificar se o projeto foi criado
select * from public.projects where user_id = '00000000-0000-0000-0000-000000000099';

-- Testar como usuário autenticado
set role authenticated;
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000099';

-- Tentar criar projeto via função admin
select admin_create_project(
  'Projeto Teste Auth User',
  '00000000-0000-0000-0000-000000000099'
);

-- Tentar ler os projetos
select * from public.projects where user_id = '00000000-0000-0000-0000-000000000099';

-- Mostrar políticas ativas
\dp public.projects

-- Resetar role
reset role;