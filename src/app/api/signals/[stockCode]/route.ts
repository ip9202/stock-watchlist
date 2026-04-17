import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { fetchSignalByCode } from '@/lib/stock-auto/client'

/**
 * 종목별 AI 시그널 조회 API (SPEC-MASHUP-003)
 * GET /api/signals/[stockCode]
 *
 * Stock Auto FastAPI 서버에서 종목별 AI 시그널을 조회하여 반환
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stockCode: string }> }
) {
  try {
    const { stockCode } = await params

    // 종목코드 검증
    if (!stockCode || stockCode.length !== 6) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '유효하지 않은 종목코드입니다'
      }, { status: 400 })
    }

    // Stock Auto API 호출
    const signal = await fetchSignalByCode(stockCode)

    // 미조회 시 404 반환
    if (!signal) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '시그널을 찾을 수 없습니다'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: signal
    })

  } catch (error) {
    console.error('Signal detail API error:', error)
    const errorMessage = error instanceof Error ? error.message : '시그널 데이터를 가져오는 데 실패했습니다'

    return NextResponse.json<ApiResponse>({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}
