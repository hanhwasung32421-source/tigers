// 관리자 화면처럼 같은 목록을 계속 새로 받아가는 API가 DB를 매번 읽지 않도록, 결과를 잠깐(ttlMs) 서버 메모리에 둔다.
// 같은 키로 동시에 들어온 요청은 한 번의 계산을 같이 쓴다(in-flight 공유).
const store = new Map<string, { at: number; value: any; pending?: Promise<any> }>()

export async function ttlCached<T>(key: string, ttlMs: number, produce: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit) {
    if (hit.pending) return hit.pending as Promise<T>
    if (now - hit.at < ttlMs) return hit.value as T
  }
  const pending = produce()
    .then((value) => {
      store.set(key, { at: Date.now(), value })
      return value
    })
    .catch((e) => {
      store.delete(key)
      throw e
    })
  store.set(key, { at: hit?.at ?? 0, value: hit?.value, pending })
  return pending
}

export function clearTtlCache(prefix = '') {
  for (const k of Array.from(store.keys())) if (!prefix || k.startsWith(prefix)) store.delete(k)
  if (store.size > 500) store.clear()
}
