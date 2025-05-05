'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@repo/ui'

export default function NewProjectButton() {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    try {
      setIsCreating(true)
      const name = prompt('Nome do projeto:')
      
      if (!name) return

      console.log('Criando projeto via API:', { name })

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Erro da API:', data)
        throw new Error(data.error || 'Erro ao criar projeto')
      }

      console.log('Projeto criado com sucesso:', data)
      router.refresh()
    } catch (error: any) {
      console.error('Erro completo:', error)
      alert(error.message || 'Erro ao criar projeto')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button
      onClick={handleCreate}
      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      disabled={isCreating}
    >
      {isCreating ? 'Criando...' : 'Novo Projeto'}
    </Button>
  )
}