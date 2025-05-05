'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@repo/ui'
import type { ExternalToken, ProviderConfig } from '@/types'
import { createClient } from '@/lib/supabase/client'
import WooCommerceModal from './woocommerce-modal'

interface ProviderCardProps {
  provider: ProviderConfig
  token?: ExternalToken
  projectId: string
}

export default function ProviderCard({ provider, token, projectId }: ProviderCardProps) {
  const router = useRouter()
  const isConnected = !!token
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleConnect = () => {
    if (provider.id === 'woocommerce' as string) {
      setIsModalOpen(true)
    } else {
      // Redireciona para a URL de autenticação do provedor
      window.location.href = `${provider.authUrl}?project_id=${projectId}`
    }
  }

  const handleDisconnect = async () => {
    if (!token) return

    try {
      const supabase = createClient()
      await supabase
        .from('external_tokens')
        .delete()
        .match({ id: token.id })

      router.refresh()
    } catch (error) {
      console.error('Erro ao desconectar:', error)
    }
  }

  return (
    <div className="relative flex items-start space-x-4 rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-300">
        {(provider.id === 'google' as string) ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-600" fill="currentColor">
            <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 19.5c-4.15 0-7.5-3.35-7.5-7.5s3.35-7.5 7.5-7.5 7.5 3.35 7.5 7.5-3.35 7.5-7.5 7.5z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-600" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 6.016 4.432 10.984 10.207 11.852V15.18h-2.97v-3.154h2.97V9.927c0-3.475 1.693-5 4.58-5 1.383 0 2.115.102 2.461.149v2.753h-1.97c-1.226 0-1.654 1.163-1.654 2.473v1.724h3.593l-.488 3.154h-3.105v8.697C19.481 23.083 24 18.075 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-medium text-gray-900">
          <h3>{provider.name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {provider.description}
          </p>
        </div>
        <div className="mt-4">
          {isConnected ? (
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                Conectado
              </span>
              <Button
                onClick={handleDisconnect}
                className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Conectar
            </Button>
          )}
        </div>
        {(provider.id === 'woocommerce' as string) && (
          <WooCommerceModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  )
}