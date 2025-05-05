import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Obter o client do Supabase com service role (acesso admin)
    const supabase = createClient();

    // Obter o project_id e table_name do corpo da requisição
    const { project_id, table_name } = await request.json();
    
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

    // Schema do projeto: "project_" seguido do ID do projeto
    const projectSchema = `project_${project_id.replace(/-/g, '_')}`;
    
    // Se table_name foi fornecido, processa apenas essa tabela
    if (table_name) {
      return await processTable(supabase, projectSchema, table_name);
    }

    // Se table_name não foi fornecido, processa todas as tabelas conhecidas
    const tableNames = ['orders', 'products', 'customers'];
    
    try {
      const tables = await Promise.all(
        tableNames.map(async (tableName) => {
          try {
            const result = await processTable(supabase, projectSchema, tableName);
            const data = await result.json();
            return data;
          } catch (tableError) {
            console.error(`Erro ao processar tabela ${tableName}:`, tableError);
            return {
              name: tableName,
              columns: [],
              rows: []
            };
          }
        })
      );
      
      return NextResponse.json({ tables });
    } catch (error) {
      console.error('Erro ao processar tabelas:', error);
      return NextResponse.json(
        { error: 'Erro ao processar tabelas', details: error },
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

// Função auxiliar para processar uma tabela específica
async function processTable(supabase: any, projectSchema: string, tableName: string) {
  // Colunas conhecidas para cada tabela (baseadas no script de exemplo)
  let columns: string[] = [];
  
  if (tableName === 'orders') {
    columns = ['id', 'order_id', 'date_created', 'status', 'customer_email', 
              'customer_name', 'total', 'items_count', 'payment_method', 'synced_at'];
  } 
  else if (tableName === 'products') {
    columns = ['id', 'product_id', 'name', 'sku', 'price', 'regular_price',
              'sale_price', 'stock_quantity', 'stock_status', 'description', 'synced_at'];
  }
  else if (tableName === 'customers') {
    columns = ['id', 'customer_id', 'email', 'first_name', 'last_name',
              'role', 'date_created', 'orders_count', 'total_spent', 'synced_at'];
  }
  
  try {
    // Tentar buscar dados diretamente do schema do projeto
    const { data: rows, error: rowsError } = await supabase
      .from(`${projectSchema}.${tableName}`)
      .select('*')
      .limit(100);
      
    if (rowsError) {
      console.error(`Erro ao buscar dados da tabela ${tableName}:`, rowsError);
      
      // Se for erro de tabela ou schema não existente, retornamos dados de exemplo
      if (rowsError.code === '42P01' || rowsError.code === '42P09') {
        // Dados de exemplo para demonstração
        let demoRows: Record<string, any>[] = [];
        
        if (tableName === 'orders') {
          demoRows = [
            { id: 1, order_id: 1001, date_created: new Date().toISOString(), status: 'completed', customer_email: 'cliente@exemplo.com', customer_name: 'João Silva', total: 125.50, items_count: 3, payment_method: 'pix' },
            { id: 2, order_id: 1002, date_created: new Date(Date.now() - 86400000).toISOString(), status: 'processing', customer_email: 'maria@exemplo.com', customer_name: 'Maria Souza', total: 299.99, items_count: 1, payment_method: 'credit_card' }
          ];
        }
        else if (tableName === 'products') {
          demoRows = [
            { id: 1, product_id: 101, name: 'Smartphone XYZ', sku: 'PHN-001', price: 1299.99, regular_price: 1499.99, sale_price: 1299.99, stock_quantity: 15, stock_status: 'instock', description: 'Smartphone de última geração' },
            { id: 2, product_id: 102, name: 'Notebook Ultra', sku: 'LPT-001', price: 4599.90, regular_price: 4899.90, sale_price: 4599.90, stock_quantity: 8, stock_status: 'instock', description: 'Notebook de alto desempenho' }
          ];
        }
        else if (tableName === 'customers') {
          demoRows = [
            { id: 1, customer_id: 201, email: 'cliente@exemplo.com', first_name: 'João', last_name: 'Silva', role: 'customer', date_created: new Date().toISOString(), orders_count: 5, total_spent: 1500.75 },
            { id: 2, customer_id: 202, email: 'maria@exemplo.com', first_name: 'Maria', last_name: 'Souza', role: 'customer', date_created: new Date().toISOString(), orders_count: 2, total_spent: 599.98 }
          ];
        }
        
        return NextResponse.json({
          name: tableName,
          columns,
          rows: demoRows,
          isDemo: true // Indicador para frontend saber que são dados de exemplo
        });
      }
      
      // Se for outro tipo de erro, propagamos
      throw rowsError;
    }
    
    return NextResponse.json({
      name: tableName,
      columns,
      rows: rows || []
    });
  } catch (error) {
    console.error(`Erro ao processar tabela ${tableName}:`, error);
    throw error;
  }
}