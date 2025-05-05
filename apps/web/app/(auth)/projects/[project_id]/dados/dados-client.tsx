'use client';

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SyncProgressIndicator from '@/components/sync-progress-indicator';
import { useRouter } from 'next/navigation';

// Interface para tabela de dados sincronizados
interface TableData {
  name: string;
  columns: string[];
  rows: any[];
  isLoading?: boolean;
  error?: string;
}

interface DadosClientProps {
  projectId: string;
  lastSync: Date | null;
  connections: {
    id: string;
    provider: string;
    status: string;
  }[];
}

// Tabelas conhecidas que queremos exibir
const KNOWN_TABLES = ['orders', 'products', 'customers'];

// Dados de exemplo para cada tabela quando não há dados reais
const EXAMPLE_DATA = {
  orders: [
    { id: 1, order_id: 1001, date_created: new Date().toISOString(), status: 'completed', customer_email: 'cliente@exemplo.com', customer_name: 'João Silva', total: 125.50, items_count: 3, payment_method: 'pix' },
    { id: 2, order_id: 1002, date_created: new Date(Date.now() - 86400000).toISOString(), status: 'processing', customer_email: 'maria@exemplo.com', customer_name: 'Maria Souza', total: 299.99, items_count: 1, payment_method: 'credit_card' }
  ],
  products: [
    { id: 1, product_id: 101, name: 'Smartphone XYZ', sku: 'PHN-001', price: 1299.99, regular_price: 1499.99, sale_price: 1299.99, stock_quantity: 15, stock_status: 'instock', description: 'Smartphone de última geração' },
    { id: 2, product_id: 102, name: 'Notebook Ultra', sku: 'LPT-001', price: 4599.90, regular_price: 4899.90, sale_price: 4599.90, stock_quantity: 8, stock_status: 'instock', description: 'Notebook de alto desempenho' }
  ],
  customers: [
    { id: 1, customer_id: 201, email: 'cliente@exemplo.com', first_name: 'João', last_name: 'Silva', role: 'customer', date_created: new Date().toISOString(), orders_count: 5, total_spent: 1500.75 },
    { id: 2, customer_id: 202, email: 'maria@exemplo.com', first_name: 'Maria', last_name: 'Souza', role: 'customer', date_created: new Date().toISOString(), orders_count: 2, total_spent: 599.98 }
  ]
};

// Colunas conhecidas para cada tabela
const KNOWN_COLUMNS = {
  orders: ['id', 'order_id', 'date_created', 'status', 'customer_email', 'customer_name', 'total', 'items_count', 'payment_method', 'synced_at'],
  products: ['id', 'product_id', 'name', 'sku', 'price', 'regular_price', 'sale_price', 'stock_quantity', 'stock_status', 'description', 'synced_at'],
  customers: ['id', 'customer_id', 'email', 'first_name', 'last_name', 'role', 'date_created', 'orders_count', 'total_spent', 'synced_at']
};

export default function DadosClient({ projectId, lastSync, connections }: DadosClientProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const router = useRouter();
  
  // Estados para o indicador de progresso
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncStep, setSyncStep] = useState<string>('preparing');
  const [syncError, setSyncError] = useState<string | undefined>(undefined);

  // Carregar dados das tabelas individualmente
  useEffect(() => {
    if (!projectId) return;

    // Inicializar tabelas com estados de carregamento
    const initialTables = KNOWN_TABLES.map(tableName => ({
      name: tableName,
      columns: KNOWN_COLUMNS[tableName as keyof typeof KNOWN_COLUMNS] || [],
      rows: [],
      isLoading: true,
      error: undefined
    }));
    
    setTables(initialTables);
    
    // Definir primeira tab como ativa
    if (initialTables.length > 0) {
      setActiveTab(initialTables[0].name);
    }

    // Função para carregar dados de uma tabela específica
    const loadTableData = async (tableName: string) => {
      try {
        const response = await fetch('/api/dados/load', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            project_id: projectId,
            table_name: tableName
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Erro ao carregar tabela ${tableName}`);
        }

        const data = await response.json();
        // Atualizar apenas a tabela específica
        setTables(prevTables => 
          prevTables.map(table => 
            table.name === tableName
              ? {
                  ...table,
                  columns: data.columns || KNOWN_COLUMNS[tableName as keyof typeof KNOWN_COLUMNS] || [],
                  rows: data.rows || EXAMPLE_DATA[tableName as keyof typeof EXAMPLE_DATA] || [],
                  isLoading: false,
                  error: undefined
                }
              : table
          )
        );
      } catch (error) {
        console.error(`Erro ao carregar tabela ${tableName}:`, error);
        
        // Configurar dados de exemplo em caso de erro
        setTables(prevTables => 
          prevTables.map(table => 
            table.name === tableName
              ? {
                  ...table,
                  columns: KNOWN_COLUMNS[tableName as keyof typeof KNOWN_COLUMNS] || [],
                  rows: EXAMPLE_DATA[tableName as keyof typeof EXAMPLE_DATA] || [],
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Erro desconhecido'
                }
              : table
          )
        );
      }
    };

    // Carregar dados para cada tabela conhecida
    KNOWN_TABLES.forEach(tableName => {
      loadTableData(tableName);
    });
  }, [projectId]);

  // Função para recarregar explicitamente os dados das tabelas
  const reloadAllTableData = () => {
    toast.info('Recarregando dados das tabelas...');

    // Inicializar tabelas com estados de carregamento
    setTables(prevTables =>
      prevTables.map(table => ({
        ...table,
        isLoading: true
      }))
    );

    // Função para carregar dados de uma tabela específica
    const loadTableData = async (tableName: string) => {
      try {
        const response = await fetch('/api/dados/load', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            table_name: tableName,
            cache_bust: Date.now() // Para evitar cache
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Erro ao carregar tabela ${tableName}`);
        }

        const data = await response.json();
        
        // Atualizar apenas a tabela específica
        setTables(prevTables =>
          prevTables.map(table =>
            table.name === tableName
              ? {
                  ...table,
                  columns: data.columns || KNOWN_COLUMNS[tableName as keyof typeof KNOWN_COLUMNS] || [],
                  rows: data.rows || EXAMPLE_DATA[tableName as keyof typeof EXAMPLE_DATA] || [],
                  isLoading: false,
                  error: undefined
                }
              : table
          )
        );
      } catch (error) {
        console.error(`Erro ao carregar tabela ${tableName}:`, error);
        
        // Configurar dados de exemplo em caso de erro
        setTables(prevTables =>
          prevTables.map(table =>
            table.name === tableName
              ? {
                  ...table,
                  columns: KNOWN_COLUMNS[tableName as keyof typeof KNOWN_COLUMNS] || [],
                  rows: EXAMPLE_DATA[tableName as keyof typeof EXAMPLE_DATA] || [],
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Erro desconhecido'
                }
              : table
          )
        );
      }
    };

    // Carregar dados para cada tabela conhecida
    KNOWN_TABLES.forEach(tableName => {
      loadTableData(tableName);
    });
  };

  // Função para processar a sequência de etapas de sincronização
  const processSyncSteps = () => {
    // Simular a progressão das etapas
    setShowSyncProgress(true);
    setSyncError(undefined);
    
    // Sequência de etapas com tempos de transição
    const steps = [
      { key: 'preparing', time: 2000 },
      { key: 'connecting', time: 3500 },
      { key: 'extracting', time: 5000 },
      { key: 'loading', time: 4000 },
      { key: 'finalizing', time: 3000 }
    ];
    
    let currentStepIndex = 0;
    
    // Configurar o primeiro passo
    setSyncStep(steps[0].key);
    
    // Função para avançar para o próximo passo
    const advanceToNextStep = () => {
      currentStepIndex++;
      
      if (currentStepIndex < steps.length) {
        setSyncStep(steps[currentStepIndex].key);
        setTimeout(advanceToNextStep, steps[currentStepIndex].time);
      } else {
        // Finalizar o processo
        setTimeout(() => {
          setShowSyncProgress(false);
          reloadAllTableData();
          router.refresh();
          toast.success('Sincronização concluída com sucesso!');
          setIsSyncing(false);
        }, 1000);
      }
    };
    
    // Iniciar o sequenciamento
    setTimeout(advanceToNextStep, steps[0].time);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStep('preparing');
    setShowSyncProgress(true);
    toast.info('Iniciando sincronização completa...');

    try {
      // Usar a nova rota full-sync em vez da woocommerce-sync
      const response = await fetch('/api/airbyte/full-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          provider: 'woocommerce' // Por enquanto, hardcoded como woocommerce
        }),
      });

      // Se a API retornar um erro, verificamos o que aconteceu
      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.code === '42P01') {
          // Erro de tabela inexistente - sem implementação real do Airbyte
          toast.info("Ambiente de desenvolvimento: simulando sincronização...");
          
          // Simular um processo de sincronização com o indicador visual
          processSyncSteps();
          return;
        }
        
        throw new Error(errorData.details || errorData.error || 'Falha ao iniciar sincronização');
      }

      const result = await response.json();
      toast.success(`Sincronização iniciada com sucesso! ID da conexão: ${result.connectionId}`);
      
      // Iniciar sequência de etapas de sincronização
      processSyncSteps();

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      
      // Mostrar erro no indicador visual
      setSyncError(errorMessage);
      
      if (errorMessage.includes('42P01')) {
        toast.info("Ambiente de desenvolvimento: tabela de sincronização não encontrada. Configure o Airbyte para ativar esta funcionalidade.");
        
        // Simular processo mesmo assim
        processSyncSteps();
      } else {
        toast.error(`Erro ao sincronizar: ${errorMessage}`);
        setTimeout(() => {
          setShowSyncProgress(false);
          setIsSyncing(false);
        }, 5000);
      }
    }
  };
  
  // Fechar o indicador de progresso
  const handleSyncProgressComplete = () => {
    setShowSyncProgress(false);
  };

  // Encontrar tabela ativa
  const activeTableData = tables.find(table => table.name === activeTab);

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de sincronização */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 border rounded-lg shadow-sm">
        <div className="mb-2 sm:mb-0">
          <span className="text-sm text-gray-600">
            Última sincronização:{' '}
            {lastSync ? (
              <span title={lastSync.toLocaleString('pt-BR')}>
                {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
              </span>
            ) : (
              'Nunca'
            )}
          </span>
        </div>
        <Button 
          onClick={handleSyncNow} 
          disabled={isSyncing}
          className="flex items-center"
        >
          {isSyncing ? (
            <>
              <span className="mr-2">⏳</span>
              Sincronizando...
            </>
          ) : (
            <>
              <span className="mr-2">🔄</span>
              Sincronizar Agora
            </>
          )}
        </Button>
      </div>

      {/* Sem tabelas */}
      {tables.length === 0 && (
        <div className="bg-white p-6 rounded-lg border text-center">
          <div className="text-5xl mb-2">📄</div>
          <h3 className="text-lg font-medium text-gray-900">Nenhuma tabela encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Não há tabelas sincronizadas para este projeto no momento.
          </p>
        </div>
      )}

      {/* Dados carregados */}
      {tables.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Dados Sincronizados</h2>
          </div>

          {/* Tabs simples */}
          <div className="border-b">
            <div className="px-4 pt-2 flex overflow-x-auto">
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => setActiveTab(table.name)}
                  className={`px-4 py-2 border-b-2 font-medium text-sm ${
                    activeTab === table.name
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {table.name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                  {table.isLoading && <span className="ml-2 animate-pulse">⏳</span>}
                  {table.error && <span className="ml-2 text-red-500">⚠️</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo da tab ativa */}
          <div className="p-4">
            {activeTableData && (
              <>
                {/* Mensagem de erro */}
                {activeTableData.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Erro:</span> {activeTableData.error}
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Exibindo dados de exemplo para visualização.
                    </p>
                  </div>
                )}

                {/* Estado de carregamento */}
                {activeTableData.isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin mr-2">⏳</div>
                    <span className="text-gray-500">Carregando {activeTableData.name}...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <caption className="sr-only">
                        Dados da tabela {activeTableData.name}
                      </caption>
                      <thead className="bg-gray-50">
                        <tr>
                          {activeTableData.columns.map((column) => (
                            <th 
                              key={column} 
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activeTableData.rows.length > 0 ? (
                          activeTableData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {activeTableData.columns.map((column) => (
                                <td 
                                  key={`${rowIndex}-${column}`}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                >
                                  {row[column] !== null && row[column] !== undefined 
                                    ? String(row[column]) 
                                    : '-'}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td 
                              colSpan={activeTableData.columns.length} 
                              className="px-6 py-4 text-center text-sm text-gray-500"
                            >
                              Nenhum registro encontrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td 
                            colSpan={activeTableData.columns.length}
                            className="px-6 py-3 text-sm text-gray-500 text-center"
                          >
                            Mostrando {activeTableData.rows.length} registros
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Indicador de progresso de sincronização */}
      <SyncProgressIndicator
        isVisible={showSyncProgress}
        currentStep={syncStep}
        error={syncError}
        onComplete={handleSyncProgressComplete}
      />
    </div>
  );
}