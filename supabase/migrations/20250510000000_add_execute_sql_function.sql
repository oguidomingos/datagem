-- Função para executar consultas SQL dinamicamente com permissões elevadas
-- Requer permissões de superusuário para criação da função

-- Criar função para executar SQL com permissões de administrador
CREATE OR REPLACE FUNCTION execute_sql_admin(sql text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com as permissões do criador (deve ser role com permissões adequadas)
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Registrar quem está executando a consulta para auditoria
    RAISE NOTICE 'User % executing dynamic SQL: %', current_user, sql;
    
    -- Executar a consulta e capturar o resultado em formato JSON
    EXECUTE 'WITH result AS (' || sql || ' RETURNING *) SELECT COALESCE(jsonb_agg(r), ''[]''::jsonb) FROM result r' INTO result;
    
    -- Se a consulta não retornar nada, result poderá ser NULL, então fornecemos um array vazio
    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error executing SQL: %', SQLERRM;
        -- Incluir detalhes do erro no resultado
        RETURN jsonb_build_object('error', SQLERRM, 'sql', sql);
END;
$$;

-- Comentar a função
COMMENT ON FUNCTION execute_sql_admin IS 'Executa consultas SQL dinamicamente com permissões elevadas. Use com cautela, apenas para operações administrativas.';

-- Conceder permissão para o service_role usar esta função
GRANT EXECUTE ON FUNCTION execute_sql_admin TO service_role;

-- Função alternativa sem retorno para instruções DDL ou que não retornam registros
CREATE OR REPLACE FUNCTION execute_sql_ddl(sql text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Registrar quem está executando a consulta para auditoria
    RAISE NOTICE 'User % executing dynamic DDL: %', current_user, sql;
    
    -- Executar a consulta
    EXECUTE sql;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error executing SQL: %', SQLERRM;
END;
$$;

-- Comentar a função
COMMENT ON FUNCTION execute_sql_ddl IS 'Executa instruções DDL dinamicamente com permissões elevadas. Use com cautela, apenas para operações administrativas.';

-- Conceder permissão para o service_role usar esta função
GRANT EXECUTE ON FUNCTION execute_sql_ddl TO service_role;