/**
 * Stock Auto Watchlist 동기화 클라이언트
 * stock_auto 서버 (14.49.182.30:8080)로 관심종목 변경 사항을 동기화
 */

const API_BASE_URL = process.env.STOCK_AUTO_API_URL || 'http://14.49.182.30:8080'
const TIMEOUT_MS = 3000
const MAX_RETRIES = 1

/**
 * 관심종목 추가 동기화
 * @param stockCode 종목코드 (6자리)
 * @param stockName 종목명
 * @param market 시장구분 (KOSPI/KOSDAQ)
 * @returns 성공 여부 (실패 시 false)
 */
export async function syncWatchlistAdd(
  stockCode: string,
  stockName: string,
  market: string
): Promise<boolean> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(`${API_BASE_URL}/api/mashup/sync/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stock_code: stockCode,
          stock_name: stockName,
          market: market,
          source: 'stock_watchlist'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return true
    } catch (error) {
      lastError = error as Error

      // 마지막 시도가 아니라면 재시도
      if (attempt < MAX_RETRIES) {
        continue
      }
    }
  }

  // 모든 시도 실패
  if (lastError) {
    console.warn(`Watchlist add sync failed for ${stockCode}:`, lastError.message)
  }
  return false
}

/**
 * 관심종목 삭제 동기화
 * @param stockCode 종목코드 (6자리)
 * @returns 성공 여부 (실패 시 false, 404는 성공으로 간주)
 */
export async function syncWatchlistRemove(stockCode: string): Promise<boolean> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(`${API_BASE_URL}/api/mashup/sync/watchlist/${stockCode}`, {
        method: 'DELETE',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 404는 이미 삭제된 경우로 성공으로 간주
      if (response.status === 404) {
        return true
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return true
    } catch (error) {
      lastError = error as Error

      // 마지막 시도가 아니라면 재시도
      if (attempt < MAX_RETRIES) {
        continue
      }
    }
  }

  // 모든 시도 실패
  if (lastError) {
    console.warn(`Watchlist remove sync failed for ${stockCode}:`, lastError.message)
  }
  return false
}
