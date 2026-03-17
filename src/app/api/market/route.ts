import { NextRequest, NextResponse } from 'next/server'
import type { MarketIndex } from '@/types/stock'
import type { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { KiwoomStockAPI } from '@/lib/kiwoom-stock-api'

// 지수 캐시 TTL: 1분 (60초) - 실시간에 가까운 갱신
const CACHE_TTL_INDEX = 60

// 업종코드: KOSPI=0001, KOSDAQ=1001
const KOSPI_CODE = '0001'
const KOSDAQ_CODE = '1001'

// 캐시 키
const CACHE_KEY_MARKET = 'market_index_kospi_kosdaq'

// 응답 데이터 타입
interface MarketIndexData {
  kospi: MarketIndex
  kosdaq: MarketIndex
}

/**
 * KOSPI/KOSDAQ 지수 조회 API (SPEC-MARKET-001 Task 1)
 * GET /api/market
 *
 * 키움증권 ka20001 TR을 사용하여 KOSPI, KOSDAQ 지수를 병렬 조회
 * 캐시 TTL: 1분
 */
export async function GET(_request: NextRequest) {
  try {
    // 캐시 확인
    const cached = cache.get(CACHE_KEY_MARKET)
    if (cached) {
      return NextResponse.json<ApiResponse<MarketIndexData>>({
        success: true,
        data: cached
      })
    }

    const stockAPI = new KiwoomStockAPI()

    // KOSPI, KOSDAQ 지수 병렬 조회
    const [kospi, kosdaq] = await Promise.all([
      stockAPI.fetchIndexInfo(KOSPI_CODE),
      stockAPI.fetchIndexInfo(KOSDAQ_CODE),
    ])

    const data: MarketIndexData = { kospi, kosdaq }

    // 1분 캐시 저장
    cache.set(CACHE_KEY_MARKET, data, CACHE_TTL_INDEX)

    return NextResponse.json<ApiResponse<MarketIndexData>>({
      success: true,
      data
    })

  } catch (error) {
    console.error('Market index API error:', error)
    const errorMessage = error instanceof Error ? error.message : '시장 지수 데이터를 가져오는 데 실패했습니다'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
