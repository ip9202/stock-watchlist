import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { cache } from '@/lib/cache'
import { fetchDiscoveries } from '@/lib/stock-auto/client'

// 발견 캐시 TTL: 30초
const CACHE_TTL_DISCOVERIES = 30

// 캐시 키
const CACHE_KEY_DISCOVERIES = 'ai_discoveries_all'

/**
 * AI 발견 목록 조회 API (SPEC-MASHUP-004)
 * GET /api/discoveries
 *
 * Stock Auto FastAPI 서버에서 AI 발견을 조회하여 반환
 * 캐시 TTL: 30초
 */
export async function GET(_request: NextRequest) {
  try {
    // 캐시 확인
    const cached = cache.get(CACHE_KEY_DISCOVERIES)
    if (cached) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cached
      })
    }

    // Stock Auto API 호출
    const response = await fetchDiscoveries()

    // API 에러 시 빈 배열 반환
    if (!response) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { discoveries: [], count: 0 }
      })
    }

    // 30초 캐시 저장
    cache.set(CACHE_KEY_DISCOVERIES, response, CACHE_TTL_DISCOVERIES)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Discoveries API error:', error)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { discoveries: [], count: 0 }
    })
  }
}
