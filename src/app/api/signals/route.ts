import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { fetchSignals } from '@/lib/stock-auto/client'

// 시그널 캐시 TTL: 30초
const CACHE_TTL_SIGNALS = 30

// 캐시 키
const CACHE_KEY_SIGNALS = 'ai_signals_all'

/**
 * AI 시그널 목록 조회 API (SPEC-MASHUP-003)
 * GET /api/signals
 *
 * Stock Auto FastAPI 서버에서 AI 시그널을 조회하여 반환
 * 캐시 TTL: 30초
 */
export async function GET(_request: NextRequest) {
  try {
    // 캐시 확인
    const cached = cache.get(CACHE_KEY_SIGNALS)
    if (cached) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cached
      })
    }

    // Stock Auto API 호출
    const response = await fetchSignals()

    // API 에러 시 빈 배열 반환
    if (!response) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { signals: [], count: 0, generated_at: new Date().toISOString() }
      })
    }

    // 30초 캐시 저장
    cache.set(CACHE_KEY_SIGNALS, response, CACHE_TTL_SIGNALS)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Signals API error:', error)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { signals: [], count: 0, generated_at: new Date().toISOString() }
    })
  }
}
