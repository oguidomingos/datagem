import ConnectionsClient from './connections-client'
import { getConnections } from './connections-server'
import { providers } from '@/types'

interface Props {
  searchParams: { project_id: string }
}

export default async function Page({ searchParams }: Props) {
  const { project_id } = searchParams

  const tokens = await getConnections(project_id)

  return <ConnectionsClient tokens={tokens} providers={providers} />
}