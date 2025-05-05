-- Remover a política de leitura antiga que verificava apenas o user_id do token
-- O nome exato pode variar, verifique no Supabase Studio se necessário.
-- Tentativa de remover com o nome provável:
DROP POLICY IF EXISTS "Users can read own tokens" ON public.external_tokens;

-- Criar nova política de leitura baseada na associação ao projeto
-- Permite que um usuário leia tokens se ele for membro do projeto associado ao token.
CREATE POLICY "Users can read tokens for projects they belong to"
  ON public.external_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p -- Usar a tabela projects
      WHERE p.id = external_tokens.project_id -- Compara o projeto do token com a tabela projects
        AND p.user_id = auth.uid() -- Verifica se o dono do projeto é o usuário autenticado
    )
  );

-- Opcional: Revisar e ajustar outras políticas (INSERT, UPDATE, DELETE) se necessário
-- Por exemplo, permitir update/delete se for membro do projeto? Ou apenas o criador?
-- A política de INSERT geralmente deve verificar se o usuário pertence ao projeto onde está inserindo.

-- Exemplo de ajuste para INSERT (verificar se já não existe uma política melhor):
-- DROP POLICY IF EXISTS "Users can insert own tokens" ON public.external_tokens;
-- CREATE POLICY "Users can insert tokens for projects they belong to"
--   ON public.external_tokens FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1
--       FROM public.project_users pu
--       WHERE pu.project_id = external_tokens.project_id
--         AND pu.user_id = auth.uid()
--     )
--     -- Adicionalmente, garantir que o user_id do token seja o do usuário que está inserindo
--     AND auth.uid() = external_tokens.user_id
--   );

-- Por enquanto, focaremos apenas na correção da política SELECT que causa o erro de leitura.