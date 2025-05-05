'use client';

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast'; // Importar toast
// Importar ExternalToken em vez de Connection
import { ExternalToken } from '@/types';

// Remover definição local da interface Connection

interface EditWooCommerceModalProps {
  // Usar ExternalToken
  connection: ExternalToken | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedToken: ExternalToken) => void;
  projectId: string; // Adicionar projectId
}

export function EditWooCommerceModal({ connection, isOpen, onClose, onSave, projectId }: EditWooCommerceModalProps) {
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState(''); // Idealmente, não editar segredos diretamente
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connection && connection.provider === 'woocommerce') {
      // Preencher para edição
      setStoreUrl(connection.metadata?.store_url || '');
      setConsumerKey(connection.metadata?.consumer_key || '');
      setConsumerSecret('');
      setError(null);
    } else {
      // Limpar para criação (connection é null)
      setStoreUrl('');
      setConsumerKey('');
      setConsumerSecret('');
      setError(null);
    }
  }, [connection, isOpen]); // Adicionar isOpen para resetar ao reabrir

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Não retornar mais se connection for null, pois precisamos lidar com a criação

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const metadataPayload = {
        store_url: storeUrl,
        consumer_key: consumerKey,
        // Incluir segredo apenas se fornecido (importante para criação e atualização)
        ...(consumerSecret && { consumer_secret: consumerSecret }),
      };

      let data: ExternalToken | null = null;
      let saveError: any = null;

      if (connection) {
        // --- Atualizar Conexão Existente ---
        const { data: updateData, error: updateError } = await supabase
          .from('external_tokens')
          .update({
            metadata: {
              // Mesclar com metadados existentes, caso haja outros campos
              ...connection.metadata,
              ...metadataPayload,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
          .select()
          .single();
        data = updateData;
        saveError = updateError;
      } else {
        // --- Criar Nova Conexão ---
        if (!consumerSecret) {
          throw new Error('Consumer Secret é obrigatório para criar uma nova conexão.');
        }

        // Obter o ID do usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Não foi possível obter o usuário autenticado para salvar a conexão.');
        }

        const { data: insertData, error: insertError } = await supabase
          .from('external_tokens')
          .insert({
            user_id: user.id, // Incluir user_id
            project_id: projectId, // Usar projectId da prop
            provider: 'woocommerce', // Definir provedor
            metadata: metadataPayload,
            // access_token, refresh_token, expires_at não são usados para WooCommerce API Key
            access_token: 'woocommerce_api_key', // Placeholder ou valor fixo
          })
          .select()
          .single();
        data = insertData;
        saveError = insertError;
      }

      if (saveError) {
        throw saveError;
      }

      if (!data) {
        // Segurança extra caso a query não retorne dados mesmo sem erro
        throw new Error('Não foi possível obter os dados da conexão após salvar.');
      }

      toast.success('Conexão WooCommerce atualizada com sucesso!'); // Usar toast
      onSave(data as ExternalToken); // Passar o ExternalToken atualizado
      onClose();

    } catch (err: any) {
      console.error('Error saving WooCommerce connection:', err);
      setError(`Erro ao salvar: ${err.message}`);
      toast.error(`Erro ao salvar: ${err.message}`); // Usar toast
    } finally {
      setIsSaving(false);
    }
  };

  // Renderizar apenas se isOpen for true
  if (!isOpen) {
    return null;
  }

  // A lógica de salvar/atualizar já lida com connection ser null ou não
  // O título pode ser ajustado se necessário para "Adicionar Conexão" vs "Editar"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Editar Conexão WooCommerce</h2>
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-1">URL da Loja</label>
            <input
              type="url"
              id="storeUrl"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="consumerKey" className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
            <input
              type="text"
              id="consumerKey"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="consumerSecret" className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret (deixe em branco para manter)</label>
            <input
              type="password"
              id="consumerSecret"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder="********"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
             <p className="text-xs text-gray-500 mt-1">A chave secreta não é exibida por segurança.</p>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-end space-x-3">
            <Button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}