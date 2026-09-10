import crypto from 'node:crypto'
import neo4j from 'neo4j-driver'

const vectorsCollection = process.env.QDRANT_COLLECTION || 'nexus_memories'
const qdrantUrl = (process.env.QDRANT_URL || '').replace(/\/$/, '')
const qdrantKey = process.env.QDRANT_API_KEY
const neo4jUri = process.env.NEO4J_URI
const neo4jUser = process.env.NEO4J_USER
const neo4jPassword = process.env.NEO4J_PASSWORD
const neo4jDriver = neo4jUri && neo4jUser && neo4jPassword ? neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword)) : null

function qdrantHeaders() {
  return { 'Content-Type': 'application/json', ...(qdrantKey ? { 'api-key': qdrantKey } : {}) }
}

function pointId(id) {
  const hash = crypto.createHash('md5').update(id).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

export async function ensureMemoryStores() {
  if (qdrantUrl) {
    await fetch(`${qdrantUrl}/collections/${vectorsCollection}`, {
      method: 'PUT',
      headers: qdrantHeaders(),
      body: JSON.stringify({ vectors: { size: 32, distance: 'Cosine' } }),
    })
  }
}

export async function syncMemory(snapshot) {
  if (qdrantUrl && snapshot.vectors.length) {
    await fetch(`${qdrantUrl}/collections/${vectorsCollection}/points?wait=true`, {
      method: 'PUT',
      headers: qdrantHeaders(),
      body: JSON.stringify({ points: snapshot.vectors.map((memory) => ({ id: pointId(memory.id), vector: memory.vector, payload: { id: memory.id, text: memory.text, metadata: memory.metadata, createdAt: memory.createdAt } })) }),
    })
  }

  if (neo4jDriver) {
    const session = neo4jDriver.session()
    try {
      await session.executeWrite(async (transaction) => {
        for (const node of snapshot.nodes) {
          await transaction.run('MERGE (n:MemoryEntity {id: $id}) SET n.label = $label, n.type = $type, n.properties = $properties', {
            id: node.id,
            label: node.label,
            type: node.type,
            properties: node.properties,
          })
        }
        for (const edge of snapshot.edges) {
          await transaction.run('MATCH (a:MemoryEntity {id: $from}), (b:MemoryEntity {id: $to}) MERGE (a)-[r:RELATES {id: $id}]->(b) SET r.relation = $relation, r.weight = $weight, r.createdAt = $createdAt', edge)
        }
      })
    } finally {
      await session.close()
    }
  }

  return { vectors: snapshot.vectors.length, nodes: snapshot.nodes.length, edges: snapshot.edges.length }
}

export async function searchMemory(vector, limit = 5) {
  if (!qdrantUrl) return []
  const response = await fetch(`${qdrantUrl}/collections/${vectorsCollection}/points/search`, {
    method: 'POST',
    headers: qdrantHeaders(),
    body: JSON.stringify({ vector, limit, with_payload: true }),
  })
  if (!response.ok) throw new Error('Vector search failed.')
  const result = await response.json()
  return result.result || []
}

export async function closeMemoryStores() {
  await neo4jDriver?.close()
}

export function memoryStoreStatus() {
  return { qdrant: Boolean(qdrantUrl), neo4j: Boolean(neo4jDriver), collection: vectorsCollection }
}
