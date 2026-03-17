import type { ExchangeRate, ExchangeRateHistory } from '@/types/stock'

// Frankfurter API 응답 타입
interface FrankfurterLatestResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface FrankfurterHistoryResponse {
  base: string
  start_date: string
  end_date: string
  rates: Record<string, Record<string, number>>
}

// API 요청 타임아웃 (5초)
const REQUEST_TIMEOUT_MS = 5000

/**
 * fetch 요청에 타임아웃을 적용하는 헬퍼 함수
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Frankfurter API 클라이언트 (SPEC-MARKET-001 Task 2)
 * https://api.frankfurter.dev/v1
 *
 * 무료 오픈소스 환율 API — ECB(유럽중앙은행) 데이터 기반
 * API 키 불필요, CORS 지원
 */
class FrankfurterAPI {
  private baseUrl = 'https://api.frankfurter.dev/v1'

  /**
   * 현재 USD/KRW 환율 조회
   * GET /v1/latest?base=USD&symbols=KRW
   *
   * 변화량 계산을 위해 전일 환율도 함께 조회
   */
  async getLatestRate(): Promise<ExchangeRate> {
    // 현재 환율과 전일 환율을 병렬로 조회
    const [latestResponse, prevResponse] = await Promise.all([
      fetchWithTimeout(`${this.baseUrl}/latest?base=USD&symbols=KRW`),
      fetchWithTimeout(`${this.baseUrl}/latest?base=USD&symbols=KRW`)
        .then(async () => {
          // 전일 환율: 최근 2일치 히스토리에서 이전 날짜 추출
          const today = new Date()
          const from = new Date(today)
          from.setDate(from.getDate() - 5) // 주말/공휴일 대비 5일 범위 조회
          const fromStr = from.toISOString().slice(0, 10)
          const toStr = today.toISOString().slice(0, 10)

          return fetchWithTimeout(
            `${this.baseUrl}/${fromStr}..${toStr}?base=USD&symbols=KRW`
          )
        })
    ])

    if (!latestResponse.ok) {
      throw new Error(`Frankfurter API 오류: ${latestResponse.status} ${latestResponse.statusText}`)
    }

    const latest: FrankfurterLatestResponse = await latestResponse.json()
    const currentRate = latest.rates['KRW']

    if (currentRate === undefined) {
      throw new Error('KRW 환율 데이터를 가져올 수 없습니다')
    }

    // 전일 환율 계산 (변화량 산출용)
    let change = 0
    let changePercent = 0

    try {
      if (prevResponse.ok) {
        const history: FrankfurterHistoryResponse = await prevResponse.json()
        const dates = Object.keys(history.rates).sort()

        // 가장 최근 두 날짜 비교
        if (dates.length >= 2) {
          const prevDate = dates[dates.length - 2]
          const prevRate = history.rates[prevDate]?.['KRW']

          if (prevRate !== undefined) {
            change = parseFloat((currentRate - prevRate).toFixed(2))
            changePercent = parseFloat(((change / prevRate) * 100).toFixed(4))
          }
        } else if (dates.length === 1) {
          // 단일 날짜만 있으면 변화량 0
          change = 0
          changePercent = 0
        }
      }
    } catch {
      // 전일 환율 조회 실패 시 변화량 0으로 처리
      change = 0
      changePercent = 0
    }

    return {
      base: 'USD',
      target: 'KRW',
      rate: currentRate,
      date: latest.date,
      change,
      changePercent
    }
  }

  /**
   * 기간별 환율 히스토리 조회
   * GET /v1/{from}..{to}?base=USD&symbols=KRW
   *
   * @param from - 시작 날짜 (YYYY-MM-DD)
   * @param to - 종료 날짜 (YYYY-MM-DD)
   * @returns 날짜 오름차순으로 정렬된 환율 배열
   */
  async getHistory(from: string, to: string): Promise<ExchangeRateHistory[]> {
    const url = `${this.baseUrl}/${from}..${to}?base=USD&symbols=KRW`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      throw new Error(`Frankfurter 히스토리 API 오류: ${response.status} ${response.statusText}`)
    }

    const data: FrankfurterHistoryResponse = await response.json()

    // 날짜 오름차순 정렬 후 배열로 변환
    const history: ExchangeRateHistory[] = Object.entries(data.rates)
      .filter(([, rates]) => rates['KRW'] !== undefined)
      .map(([date, rates]) => ({
        date,
        rate: rates['KRW']!
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return history
  }
}

export const frankfurterApi = new FrankfurterAPI()
