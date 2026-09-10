import type { MemorySnapshot } from './memory'

export async function syncRemoteMemory(snapshot: MemorySnapshot): Promise<boolean> {
  const apiUrl = import.meta.env.VITE_MEMORY_API_URL
  if (!apiUrl) return false
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/memory/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  })
  if (!response.ok) throw new Error('Remote memory synchronization failed.')
  return true
}