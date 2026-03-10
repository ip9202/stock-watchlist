'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { ChartPeriod, ChartType, ChartData } from '@/types/stock'
import { ChartToolbar } from './ChartToolbar'

// @MX:NOTE: ChartContainer는 브라우저 전용 API를 사용하므로 SSR을 비활성화하여 dynamic import
// @MX:REASON: lightweight-charts가 window/document에 접근하여 서버 환경에서 오류 발생

// SSR 비활성화로 ChartContainer 동적 로드
const ChartContainer = dynamic(
  () => import('./ChartContainer').then((mod) => mod.ChartContainer),
  {
    ssr: false,
    // 로딩 중 스켈레톤 표시
    loading: () => (
      <div className="w-full h-[320px] sm:h-[400px] bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
)

// SWR 데이터 fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('차트 데이터를 불러오는 데 실패했습니다.')
    return res.json()
  })

// 기간 옵션에 따른 API 요청 파라미터 계산
function getPeriodParams(period: ChartPeriod): {
  apiPeriod: 'daily' | 'weekly'
  fromDate: string
} {
  const now = new Date()
  const from = new Date(now)

  // 기간별 from 날짜 계산
  switch (period) {
    case '1M':
      from.setMonth(from.getMonth() - 1)
      break
    case '3M':
      from.setMonth(from.getMonth() - 3)
      break
    case '6M':
      from.setMonth(from.getMonth() - 6)
      break
    case '1Y':
      from.setFullYear(from.getFullYear() - 1)
      break
    case '5Y':
      from.setFullYear(from.getFullYear() - 5)
      break
  }

  // YYYYMMDD 형식으로 변환
  const fromDate = from.toISOString().slice(0, 10).replace(/-/g, '')

  return {
    // 5년 기간은 주봉, 나머지는 일봉
    apiPeriod: period === '5Y' ? 'weekly' : 'daily',
    fromDate,
  }
}

interface StockChartProps {
  // 조회할 종목 코드
  symbol: string
}

/**
 * 주가 차트 통합 컴포넌트
 * - SWR로 백엔드 차트 API 호출
 * - 기간 및 차트 타입 상태 관리
 * - 로딩/에러/빈 데이터 상태 처리
 */
export function StockChart({ symbol }: StockChartProps) {
  // 선택된 기간 (기본값: 1개월)
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>('1M')
  // 선택된 차트 타입 (기본값: 캔들스틱)
  const [selectedType, setSelectedType] = useState<ChartType>('candlestick')

  const { apiPeriod, fromDate } = getPeriodParams(selectedPeriod)

  // 차트 데이터 SWR 페칭
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    data: ChartData
  }>(
    `/api/stocks/${symbol}/chart?period=${apiPeriod}&from=${fromDate}`,
    fetcher,
    {
      // 포커스 시 자동 갱신 비활성화 (주가 차트는 주기적 갱신 불필요)
      revalidateOnFocus: false,
      // 에러 발생 시 재시도 횟수 제한
      errorRetryCount: 2,
    }
  )

  return (
    <div className="w-full">
      {/* 기간/타입 선택 툴바 */}
      <ChartToolbar
        selectedPeriod={selectedPeriod}
        selectedType={selectedType}
        onPeriodChange={setSelectedPeriod}
        onTypeChange={setSelectedType}
      />

      {/* 차트 영역 */}
      <div className="relative">
        {/* 로딩 상태: 스켈레톤 표시 */}
        {isLoading && (
          <div className="w-full h-[320px] sm:h-[400px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-sm text-gray-400">차트 로딩 중...</span>
          </div>
        )}

        {/* 에러 상태: 에러 메시지 + 재시도 버튼 */}
        {!isLoading && error && (
          <div className="w-full h-[320px] sm:h-[400px] bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-500">
              차트 데이터를 불러오지 못했습니다.
            </p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 데이터 없음 상태 */}
        {!isLoading && !error && data?.data?.candles?.length === 0 && (
          <div className="w-full h-[320px] sm:h-[400px] bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            <p className="text-sm text-gray-500">데이터 없음</p>
          </div>
        )}

        {/* 정상 데이터: 차트 렌더링 */}
        {!isLoading && !error && data?.data?.candles && data.data.candles.length > 0 && (
          <ChartContainer
            candles={data.data.candles}
            chartType={selectedType}
          />
        )}
      </div>
    </div>
  )
}
