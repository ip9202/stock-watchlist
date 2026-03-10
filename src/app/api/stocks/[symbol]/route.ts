import { NextRequest, NextResponse } from 'next/server'
import { StockInfo } from '@/types/stock'
import { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI, type StockDetail } from '@/lib/kiwoom-stock-api'

const CACHE_TTL_STOCK_DETAIL = 30 // 30초

/**
 * 개별 종목 시세 조회 API (REQ-003: WebSocket → Kiwoom REST API 전환)
 * GET /api/stocks/{symbol}
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params

    if (!symbol) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // 캐시 키 생성
    const cacheKey = `stock_${symbol}`

    // 캐시된 데이터 확인 (30초 TTL)
    const cachedData = cache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json<ApiResponse<StockInfo>>({
        success: true,
        data: cachedData
      })
    }

    // Kiwoom REST API에서 종목 시세 조회
    const stockAPI = new KiwoomStockAPI()
    const stockDetail = await stockAPI.fetchStockDetail(symbol)

    // StockDetail을 StockInfo로 변환 (REQ-007: 인터페이스 호환성 유지)
    const stockInfo: StockInfo = toStockInfo(symbol, stockDetail)

    // 캐시에 저장 (30초 TTL)
    cache.set(cacheKey, stockInfo, CACHE_TTL_STOCK_DETAIL)

    return NextResponse.json<ApiResponse<StockInfo>>({
      success: true,
      data: stockInfo
    })

  } catch (error) {
    console.error('Stock detail error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data'

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
