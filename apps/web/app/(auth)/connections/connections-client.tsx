"use client"

import { Button } from '@repo/ui'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react';
// Importar ExternalToken e ProviderConfig de @/types
import { ProviderConfig, ExternalToken } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { EditWooCommerceModal } from '@/components/edit-woocommerce-modal';

// Interface para informações de sincronização do Airbyte
interface AirbyteSync {
  connection_id: string;
  project_id: string;
  provider: string;
  status: string;
  last_sync_at: string;
}

// Remover definição local da interface Token

interface ConnectionsProps {
  // Usar ExternalToken importado
  tokens: ExternalToken[] | null;
  providers: ProviderConfig[] | undefined;
}

// Componente de Ícone simples
const ProviderIcon = ({ providerId }: { providerId: string }) => {
  const icons: { [key: string]: string } = {
    google_ads: '📢',
    meta: '📱',
    woocommerce: '🛒',
  };
  return <span>{icons[providerId] || '🔗'}</span>;
};

export default function ConnectionsClient({ tokens: initialTokens, providers }: ConnectionsProps) {
  console.log("ConnectionsClient - Initial Tokens:", initialTokens);
  console.log("ConnectionsClient - Providers:", providers);

  const params = useParams();
  const projectId = params.project_id as string;

  // Usar ExternalToken para o estado
  const [tokens, setTokens] = useState<ExternalToken[] | null>(initialTokens);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<ExternalToken | null>(null);
  const [syncingProviders, setSyncingProviders] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<{[key: string]: AirbyteSync}>({});

  // Handler para desconectar
  const handleDisconnect = async (tokenId: string, providerName: string) => {
    // ... (código existente sem alterações)
    if (disconnectingId) return;

    if (confirm(`Tem certeza que deseja desconectar a integração com ${providerName}?`)) {
      setDisconnectingId(tokenId);
      const supabase = createClient();
      try {
        const { error } = await supabase
          .from('external_tokens')
          .delete()
          .eq('id', tokenId)
          .eq('project_id', projectId);

        if (error) {
          throw error;
        }
        setTokens(currentTokens => currentTokens?.filter(t => t.id !== tokenId) || null);
        toast.success(`${providerName} desconectado com sucesso!`);
      } catch (error: any) {
        console.error('Error disconnecting:', error);
        toast.error(`Erro ao desconectar ${providerName}: ${error.message}`);
      } finally {
        setDisconnectingId(null);
      }
    }
  };

  // Handler para abrir modal de Edição/Criação (usar ExternalToken)
  const handleOpenModal = (token: ExternalToken | null) => {
    setEditingToken(token);
    setIsModalOpen(true);
  };

  // Handler para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingToken(null); // Limpar token em edição ao fechar
  };

  // Handler para salvar conexão (usar ExternalToken)
  const handleSaveConnection = (updatedToken: ExternalToken) => {
    setTokens(currentTokens => {
      const existingIndex = currentTokens?.findIndex(t => t.id === updatedToken.id);
      if (existingIndex !== undefined && existingIndex > -1 && currentTokens) {
        // Atualizar token existente
        const newTokens = [...currentTokens];
        newTokens[existingIndex] = updatedToken;
        return newTokens;
      } else {
        // Adicionar novo token (se for criação)
        return [...(currentTokens || []), updatedToken];
      }
    });
    // O modal já fecha a si mesmo via onClose
  };


  // Buscar status de sincronização ao carregar e quando tokens mudarem
  useEffect(() => {
    const fetchSyncStatus = async () => {
      if (!projectId || !tokens || tokens.length === 0) return;
      
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('airbyte_connections')
          .select('*')
          .eq('project_id', projectId);
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          // Criar um mapa de provider -> sync status
          const statusMap: {[key: string]: AirbyteSync} = {};
          data.forEach(item => {
            statusMap[item.provider] = item;
          });
          setSyncStatus(statusMap);
        }
      } catch (error: any) {
        console.error('Erro ao buscar status de sincronização:', error);
      }
    };
    
    fetchSyncStatus();
  }, [projectId, tokens]);

  // Handler para iniciar sincronização
  const handleSync = async (provider: string) => {
    if (syncingProviders.includes(provider)) return;
    
    setSyncingProviders(prev => [...prev, provider]);
    
    try {
      const response = await fetch('/api/airbyte/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          provider
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao iniciar sincronização');
      }
      
      const result = await response.json();
      
      // Atualizar o status de sincronização local
      setSyncStatus(prev => ({
        ...prev,
        [provider]: {
          connection_id: result.connectionId,
          project_id: projectId,
          provider,
          status: 'syncing',
          last_sync_at: new Date().toISOString()
        }
      }));
      
      toast.success(`Sincronização com ${provider} iniciada com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast.error(`Erro ao sincronizar com ${provider}: ${error.message}`);
    } finally {
      setSyncingProviders(prev => prev.filter(p => p !== provider));
    }
  };

  if (!projectId) {
    console.error("ConnectionsClient: project_id não encontrado nos parâmetros da URL.");
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Erro: ID do projeto não encontrado.</p>
        <Link href="/select-project">
          <Button className="mt-4">Selecionar Projeto</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Conexões
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie suas contas conectadas para sincronizar dados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers?.map((provider) => {
          const token = tokens?.find(t => t.provider === provider.id);
          const isConnected = !!token;
          const isDisconnecting = disconnectingId === token?.id;

          return (
            <div key={provider.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col">
              {/* Cabeçalho do Card */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <ProviderIcon providerId={provider.id} />
                  <h3 className="text-lg font-medium text-gray-800">{provider.name}</h3>
                </div>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isConnected ? 'Conectado' : 'Não conectado'}
                </span>
              </div>

              {/* Corpo do Card */}
              <div className="text-sm text-gray-600 mb-4 flex-grow">
                {isConnected && token ? (
                  <div className="space-y-1">
                    <p><strong>ID:</strong> <code className="text-xs bg-gray-100 p-1 rounded">{token.id}</code></p>
                    <p><strong>Conectado em:</strong> {new Date(token.created_at).toLocaleDateString()}</p>
                    {/* Detalhes específicos do WooCommerce */}
                    {token.provider === 'woocommerce' && token.metadata?.store_url && (
                      <p><strong>URL da Loja:</strong> {token.metadata.store_url}</p>
                    )}
                    
                    {/* Mostrar status de sincronização quando disponível */}
                    {syncStatus[provider.id] && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p>
                          <strong>Status:</strong>
                          <span className={`ml-1 font-medium ${
                            syncStatus[provider.id].status === 'syncing'
                              ? 'text-blue-600'
                              : syncStatus[provider.id].status === 'completed'
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}>
                            {syncStatus[provider.id].status === 'syncing'
                              ? 'Sincronizando...'
                              : syncStatus[provider.id].status === 'completed'
                              ? 'Concluída'
                              : syncStatus[provider.id].status}
                          </span>
                        </p>
                        <p>
                          <strong>Última sincronização:</strong>
                          {new Date(syncStatus[provider.id].last_sync_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>Conecte sua conta {provider.name} para começar a sincronizar dados.</p>
                )}
              </div>

              {/* Rodapé do Card - Botões */}
              <div className="flex space-x-2 mt-auto">
                {isConnected && token ? (
                  <>
                    {/* Botão Editar - Abre modal para WooCommerce */}
                    <Button
                      onClick={() => {
                        if (token.provider === 'woocommerce') {
                          handleOpenModal(token);
                        } else {
                          toast(`Edição para ${token.provider} ainda não implementada.`);
                        }
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isDisconnecting}
                    >
                      Editar
                    </Button>
                    
                    {/* Botão Sincronizar */}
                    <Button
                      onClick={() => handleSync(provider.id)}
                      className={`px-3 py-1 text-sm rounded ${
                        syncingProviders.includes(provider.id)
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={syncingProviders.includes(provider.id)}
                    >
                      {syncingProviders.includes(provider.id) ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    
                    <Button
                      onClick={() => handleDisconnect(token.id, provider.name)}
                      className={`px-3 py-1 text-sm rounded ${isDisconnecting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Botão Conectar */}
                    {provider.id === 'woocommerce' ? (
                      // Botão específico para WooCommerce - Abre modal de criação
                      <Button
                        onClick={() => handleOpenModal(null)} // Passa null para indicar criação
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Conectar
                      </Button>
                    ) : (
                      // Link genérico para outros provedores OAuth
                      <Link href={`/api/auth/${provider.id}?project_id=${projectId}`} passHref>
                         <Button className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">
                           Conectar
                         </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Renderizar o Modal WooCommerce */}
      <EditWooCommerceModal
        // Passar o token correto (pode ser null para criação)
        // O modal precisa ser adaptado para lidar com `null` se for usado para criação
        // Ou criar um modal separado `AddWooCommerceModal`
        connection={editingToken}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveConnection}
        projectId={projectId} // Passar projectId para o modal
      />
    </div>
  );
}