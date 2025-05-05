import { getConnections } from './connections-server'
import ConnectionsClient from './connections-client'

export default async function Page({ searchParams }) {
  const project_id = searchParams?.project_id

  if (!project_id) {
    return <p>Faltando project_id</p>
  }

  const data = await getConnections(project_id)

  console.log("getConnections result:", data) // <-- isso deve mostrar providers!

  return (
    <ConnectionsClient
      providers={data.providers}
      tokens={data.tokens}
    />
  )
}