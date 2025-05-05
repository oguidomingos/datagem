import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Obter o client do Supabase com service role (acesso admin)
    const supabase = createClient();

    // Obter o project_id do corpo da requisição
    const { project_id } = await request.json();
    
    if (!project_id) {
      return NextResponse.json(
        { error: 'ID do projeto não fornecido' },
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

    // Buscar o script SQL
    let sqlScript;
    try {
      // Caminho relativo ao diretório raiz do projeto
      const scriptPath = path.join(process.cwd(), 'supabase/sql/create_project_sample_data.sql');
      sqlScript = fs.readFileSync(scriptPath, 'utf8');
    } catch (err) {
      console.error('Erro ao ler arquivo SQL:', err);
      return NextResponse.json(
        { error: 'Erro ao ler script SQL para criar dados de teste' },
        { status: 500 }
      );
    }

    // Substituir o placeholder pelo ID do projeto
    sqlScript = sqlScript.replace(/{project_id}/g, project_id);

    // Executar o script SQL
    try {
      // Executar via RPC
      const { data, error } = await supabase.rpc('execute_sql_admin', {
        sql: sqlScript
      });

      if (error) {
        console.error('Erro ao executar SQL:', error);
        // Tentativa alternativa
        try {
          // Executar como uma série de consultas individuais
          const statements = sqlScript
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);
          
          for (const statement of statements) {
            const { error: stmtError } = await supabase.rpc('execute_sql_admin', {
              sql: statement + ';'
            });
            
            if (stmtError) {
              console.error(`Erro ao executar statement: ${statement}`, stmtError);
              // Continue mesmo com erros
            }
          }
        } catch (sqlError) {
          console.error('Erro ao executar SQL alternativo:', sqlError);
          return NextResponse.json(
            { 
              error: 'Erro ao executar script SQL', 
              details: error,
              message: 'A função execute_sql_admin pode não existir ou você não tem permissão para usá-la. Entre em contato com o administrador.'
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ 
        message: 'Dados de teste criados com sucesso!',
        schema: `project_${project_id}`
      });

    } catch (sqlExecError) {
      console.error('Erro ao executar SQL:', sqlExecError);
      return NextResponse.json(
        { error: 'Erro ao executar script SQL', details: sqlExecError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}