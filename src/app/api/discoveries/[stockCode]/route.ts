import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { fetchDiscoveryByCode } from '@/lib/stock-auto/client'

/**
 * AI 종목별 발견 조회 API (SPEC-MASHUP-004)
 * GET /api/discoveries/[stockCode]
 *
 * Stock Auto FastAPI 서버에서 특정 종목의 AI 발견을 조회하여 반환
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  try {
    const { stockCode } = await params

    // Stock Auto API 호출
    const response = await fetchDiscoveryByCode(stockCode)

    // API 에러 시 null 반환
    if (!response) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: null
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Discovery by code API error:', error)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: null
    })
  }
}
