// 간단한 메모리 캐시 구현
interface CacheItem {
  data: any
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem>()

  set(key: string, data: any, ttlSeconds: number = 60) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // 만료된 캐시 정리
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new MemoryCache()

// 5분마다 만료된 캐시 정리
setInterval(() => {
  cache.cleanup()
}, 5 * 60 * 1000)