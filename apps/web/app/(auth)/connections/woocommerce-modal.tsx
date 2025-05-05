'use client'

import { useState } from 'react'
import { Button } from '@repo/ui'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast' // Adicionado import do toast

interface WooCommerceModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export default function WooCommerceModal({ isOpen, onClose, projectId }: WooCommerceModalProps) {
  const router = useRouter()
  const [storeUrl, setStoreUrl] = useState('')
  const [consumerKey, setConsumerKey] = useState('')
  const [consumerSecret, setConsumerSecret] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError('')

      if (!storeUrl || !consumerKey || !consumerSecret) {
        setError('Todos os campos são obrigatórios')
        return
      }

      const response = await fetch('/api/connections/woocommerce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_url: storeUrl,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          project_id: projectId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Exibir mensagem de erro da API ou genérica
        const errorMessage = data.error || 'Erro ao conectar com o WooCommerce'
        toast.error(errorMessage) // Adicionado toast de erro
        throw new Error(errorMessage)
      }

      // Exibir toast de sucesso
      toast.success('Conexão WooCommerce salva com sucesso!')

      // Limpar os campos e fechar o modal
      setStoreUrl('')
      setConsumerKey('')
      setConsumerSecret('')
      
      // Atualizar a UI
      router.refresh()
      onClose()
    } catch (err) {
      console.error('Erro ao conectar:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao conectar com o WooCommerce'
      setError(errorMessage) // Mantém o erro no estado para exibição no modal (opcional)
      // Não precisa de toast.error aqui, pois já é chamado no bloco 'if (!response.ok)'
      // Se o erro ocorrer antes do fetch (ex: validação), o toast não será exibido.
      // Poderíamos adicionar um toast aqui também se quisermos cobrir esses casos.
      // Por ora, o erro será exibido dentro do modal.
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-lg font-medium mb-4">Conectar WooCommerce</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="storeUrl" className="block text-gray-700 text-sm font-bold mb-2">
            URL da loja
          </label>
          <input
            type="text"
            id="storeUrl"
            placeholder="https://sualoja.com.br"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="consumerKey" className="block text-gray-700 text-sm font-bold mb-2">
            Consumer Key
          </label>
          <input
            type="text"
            id="consumerKey"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={consumerKey}
            onChange={(e) => setConsumerKey(e.target.value)}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="consumerSecret" className="block text-gray-700 text-sm font-bold mb-2">
            Consumer Secret
          </label>
          <input
            type="password"
            id="consumerSecret"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={consumerSecret}
            onChange={(e) => setConsumerSecret(e.target.value)}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Conectando...' : 'Salvar e Conectar'}
          </Button>
        </div>
      </div>
    </div>
  )
}