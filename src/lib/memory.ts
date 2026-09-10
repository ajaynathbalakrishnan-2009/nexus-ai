export type MemoryMetadata = Record<string, string | number | boolean>

export type VectorMemory = {
  id: string
  text: string
  vector: number[]
  metadata: MemoryMetadata
  createdAt: string
}

export type GraphNode = {
  id: string
  label: string
  type: 'learner' | 'goal' | 'topic' | 'habit' | 'event' | 'resource'
  properties: MemoryMetadata
}

export type GraphEdge = {
  id: string
  from: string
  to: string
  relation: string
  weight: number
  createdAt: string
}

export type MemorySearchResult = VectorMemory & { score: number }

export type MemoryHealth = {
  vectors: number
  nodes: number
  edges: number
}

type MemorySnapshot = {
  vectors: VectorMemory[]
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const STORAGE_KEY = 'nexus-ai-memory-v1'
const DIMENSIONS = 32

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function embed(text: string): number[] {
  const vector = Array.from({ length: DIMENSIONS }, () => 0)
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? []

  tokens.forEach((token, tokenIndex) => {
    let hash = 2166136261
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    vector[(hash >>> 0) % DIMENSIONS] += 1 + tokenIndex / 20
  })

  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0)) || 1
  return vector.map((value) => value / magnitude)
}

function similarity(left: number[], right: number[]): number {
  return left.reduce((total, value, index) => total + value * (right[index] ?? 0), 0)
}

export class StudyMemoryDatabase {
  private snapshot: MemorySnapshot
  private readonly storage: Storage | null

  constructor() {
    this.storage = safeStorage()
    this.snapshot = this.read()
  }

  remember(id: string, text: string, metadata: MemoryMetadata = {}): VectorMemory {
    const memory: VectorMemory = {
      id,
      text,
      vector: embed(text),
      metadata,
      createdAt: new Date().toISOString(),
    }
    this.snapshot.vectors = [memory, ...this.snapshot.vectors.filter((item) => item.id !== id)]
    this.persist()
    return memory
  }

  addNode(node: GraphNode): GraphNode {
    this.snapshot.nodes = [node, ...this.snapshot.nodes.filter((item) => item.id !== node.id)]
    this.persist()
    return node
  }

  connect(from: string, to: string, relation: string, weight = 1): GraphEdge {
    const id = `${from}:${relation}:${to}`
    const edge: GraphEdge = { id, from, to, relation, weight, createdAt: new Date().toISOString() }
    this.snapshot.edges = [edge, ...this.snapshot.edges.filter((item) => item.id !== id)]
    this.persist()
    return edge
  }

  search(query: string, limit = 5): MemorySearchResult[] {
    const queryVector = embed(query)
    return this.snapshot.vectors
      .map((memory) => ({ ...memory, score: similarity(queryVector, memory.vector) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  }

  health(): MemoryHealth {
    return {
      vectors: this.snapshot.vectors.length,
      nodes: this.snapshot.nodes.length,
      edges: this.snapshot.edges.length,
    }
  }

  private read(): MemorySnapshot {
    const stored = this.storage?.getItem(STORAGE_KEY)
    if (!stored) return { vectors: [], nodes: [], edges: [] }
    try {
      return JSON.parse(stored) as MemorySnapshot
    } catch {
      return { vectors: [], nodes: [], edges: [] }
    }
  }

  private persist() {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.snapshot))
  }
}
