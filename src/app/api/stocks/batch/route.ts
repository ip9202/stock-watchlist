import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI, type StockDetail } from '@/lib/kiwoom-stock-api'
import type { StockInfo } from '@/types/stock'

// 캐시 TTL: 15초 (SPEC-POLL-004: 폴링 인터벌과 일치)
const CACHE_TTL_STOCK_DETAIL = 15
// 최대 종목 수: 30개 (키움 API 100req/min 제한 고려)
const MAX_SYMBOLS = 30

interface BatchRequest {
  symbols: string[]
}

/**
 * 배치 종목 조회 API (SPEC-POLL-001, REQ-POLL-002)
 * POST /api/stocks/batch
 * Body: { symbols: string[] }
 * Response: { stocks: StockInfo[] }
 *
 * - 최대 30개 종목까지 일괄 조회
 * - 캐시된 데이터는 API 호출 없이 반환
 * - 개별 종목 실패 시 건너뛰고 부분 결과 반환
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 바디 파싱
    const body = await request.json() as BatchRequest

    // symbols 유효성 검사
    if (!body.symbols || !Array.isArray(body.symbols)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'symbols field is required and must be an array'
      }, { status: 400 })
    }

    if (body.symbols.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'symbols array cannot be empty'
      }, { status: 400 })
    }

    if (body.symbols.length > MAX_SYMBOLS) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Maximum ${MAX_SYMBOLS} symbols allowed per request`
      }, { status: 400 })
    }

    const stockAPI = new KiwoomStockAPI()
    const results: StockInfo[] = []

    // 각 종목별로 처리 (캐시 체크 → API 호출)
    for (const symbol of body.symbols) {
      try {
        const cacheKey = `stock_${symbol}`

        // 캐시 확인
        const cached = cache.get(cacheKey) as StockInfo | null
        if (cached) {
          results.push(cached)
          continue
        }

        // Kiwoom API 호출
        const stockDetail = await stockAPI.fetchStockDetail(symbol)
        const stockInfo = toStockInfo(symbol, stockDetail)

        // 캐시 저장 (15초 TTL)
        cache.set(cacheKey, stockInfo, CACHE_TTL_STOCK_DETAIL)

        results.push(stockInfo)
      } catch (error) {
        // 개별 종목 실패 시 로그만 출력하고 건너뜀
        console.error(`Failed to fetch stock ${symbol}:`, error)
        // 다음 종목으로 계속 진행
      }
    }

    return NextResponse.json<ApiResponse<{ stocks: StockInfo[] }>>({
      success: true,
      data: { stocks: results }
    })

  } catch (error) {
    console.error('Batch stock API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch batch stock data'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

/**
 * null을 undefined로 변환하는 헬퍼 함수
 */
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * StockDetail을 StockInfo로 변환 (REQ-007: 기존 인터페이스 호환)
 *
 * 주의: Kiwoom API에서 필수 필드가 누락된 경우 기본값 사용
 * - price, changeAmount, changePercent, volume이 null인 경우 0 사용
 * - 이는 데이터 부재를 0값과 구별하기 위함 (REQ-004)
 */
function toStockInfo(symbol: string, detail: StockDetail): StockInfo {
  return {
    symbol,
    name: detail.name ?? '',
    // 필수 필드: null인 경우 0 사용 (데이터 부재 표시)
    price: detail.price ?? 0,
    changeAmount: detail.changeAmount ?? 0,
    changePercent: detail.changePercent ?? 0,
    volume: detail.volume ?? 0,
    // 선택 필드: null을 undefined로 변환
    marketCap: nullToUndefined(detail.marketCap),
    tradingValue: nullToUndefined(detail.tradingValue),
    sharesOutstanding: nullToUndefined(detail.sharesOutstanding),
    volumeRatio: nullToUndefined(detail.volumeRatio),
    high: nullToUndefined(detail.high),
    low: nullToUndefined(detail.low),
    open: nullToUndefined(detail.open),
    previousClose: nullToUndefined(detail.previousClose),
    high52w: nullToUndefined(detail.high52w),
    low52w: nullToUndefined(detail.low52w),
    timestamp: new Date(),
    extra_info: {
      data_source: 'Kiwoom REST API'
    }
  }
}
