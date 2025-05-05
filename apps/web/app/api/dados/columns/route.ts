import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Obter o client do Supabase com service role
    const supabase = createClient();

    // Obter o project_id e table_name do corpo da requisição
    const { project_id, table_name } = await request.json();
    
    if (!project_id) {
      return NextResponse.json(
        { error: 'ID do projeto não fornecido' },
        { status: 400 }
      );
    }

    if (!table_name) {
      return NextResponse.json(
        { error: 'Nome da tabela não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem acesso ao projeto (segurança)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Erro ao buscar projeto:', projectError);
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o usuário logado é o dono do projeto
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Usuário não tem permissão para acessar este projeto' },
        { status: 403 }
      );
    }

    // Schema do projeto: "project_" seguido do ID do projeto formatado
    const projectSchema = `project_${project_id.replace(/-/g, '_')}`;
    
    // Consultar informações sobre as colunas da tabela usando information_schema
    const { data: columns, error: columnsError } = await supabase.rpc(
      'execute_sql',
      { 
        sql_query: `
          SELECT 
            column_name, 
            data_type,
            character_maximum_length,
            is_nullable,
            column_default,
            ordinal_position
          FROM 
            information_schema.columns
          WHERE 
            table_schema = '${projectSchema}'
            AND table_name = '${table_name}'
          ORDER BY 
            ordinal_position
        `
      }
    );

    // Verificar se houve erro na consulta
    if (columnsError) {
      console.error(`Erro ao consultar colunas: ${columnsError.message}`);
      
      // Se o erro for relacionado a schema ou tabela inexistente, retornar 404
      if (columnsError.message.includes('relation') && columnsError.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Tabela não encontrada',
            message: `A tabela ${table_name} não existe no schema do projeto.`,
            details: 'Os dados ainda não foram sincronizados ou a tabela não foi criada.'
          },
          { status: 404 }
        );
      }
      
      // Outros erros
      return NextResponse.json(
        { 
          error: 'Erro ao consultar colunas',
          message: columnsError.message
        },
        { status: 500 }
      );
    }

    // Se a consulta não retornou resultados, a tabela não existe
    if (!columns || columns.length === 0) {
      return NextResponse.json(
        { 
          error: 'Tabela não encontrada',
          message: `A tabela ${table_name} não existe no schema do projeto ou está vazia.`,
          details: 'Os dados ainda não foram sincronizados ou a tabela não foi criada.'
        },
        { status: 404 }
      );
    }

    // Formatar e retornar os resultados
    const formattedColumns = columns.map(column => ({
      name: column.column_name,
      type: column.data_type,
      maxLength: column.character_maximum_length,
      isNullable: column.is_nullable === 'YES',
      defaultValue: column.column_default,
      position: column.ordinal_position,
      // Propriedades adicionais derivadas
      isNumeric: ['integer', 'numeric', 'decimal', 'real', 'double precision', 'bigint', 'smallint'].includes(column.data_type),
      isText: ['character varying', 'varchar', 'text', 'char'].includes(column.data_type),
      isDate: ['timestamp', 'date', 'time'].includes(column.data_type) || column.data_type.includes('timestamp'),
      isBoolean: column.data_type === 'boolean'
    }));

    return NextResponse.json({
      table: table_name,
      schema: projectSchema,
      columns: formattedColumns
    });

  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error.message || 'Ocorreu um erro ao processar a requisição'
      },
      { status: 500 }
    );
  }
}