-- Testes de permissões

-- 1. Testar criação de usuário via trigger
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'test@example.com')
returning *;

-- 2. Verificar se o usuário foi criado na tabela public.users
select * from public.users where id = '00000000-0000-0000-0000-000000000001';

-- 3. Testar criação de projeto com service role
set role service_role;
insert into public.projects (name, user_id)
values ('Projeto Test Service Role', '00000000-0000-0000-0000-000000000001')
returning *;

-- 4. Testar leitura do projeto com service role
select * from public.projects where user_id = '00000000-0000-0000-0000-000000000001';

-- 5. Testar função create_project
select * from public.create_project('Projeto via Função');

-- 6. Verificar políticas RLS ativas
\dp public.projects

-- 7. Testar como usuário autenticado
set role authenticated;
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000001';
select * from public.projects where user_id = '00000000-0000-0000-0000-000000000001';

-- 8. Tentar criar projeto como usuário autenticado
insert into public.projects (name, user_id)
values ('Projeto Test Auth User', '00000000-0000-0000-0000-000000000001')
returning *;

-- Resetar role
reset role;