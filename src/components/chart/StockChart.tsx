'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { ChartMode, ChartData } from '@/types/stock'
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

/**
 * ChartMode에서 API 요청 파라미터를 계산하는 함수
 * - candle 모드: interval → API period, 기본 3개월 기간
 * - line 모드: 1D → minute(분봉), 나머지 → daily interval + fromDate 계산
 * @MX:ANCHOR: SWR URL 생성의 핵심 함수 - mode/period 추가 시 여기를 수정
 * @MX:REASON: ChartMode, StockChart, StockChart 테스트 3곳에서 참조됨
 */
export function getApiParams(mode: ChartMode): {
  apiPeriod: string
  fromDate: string
  ticScope?: string
} {
  const now = new Date()
  const from = new Date(now)

  if (mode.type === 'candle') {
    // 봉 타입별 기본 조회 기간 설정
    // 캔들 1개만 표시하면 의미가 없으므로 적절한 기본 기간 사용
    switch (mode.interval) {
      case 'daily':
        // 일봉: 최근 3개월 (약 60 영업일)
        from.setMonth(from.getMonth() - 3)
        break
      case 'weekly':
        // 주봉: 최근 1년 (약 52주)
        from.setFullYear(from.getFullYear() - 1)
        break
      case 'monthly':
        // 월봉: 최근 3년 (36개월)
        from.setFullYear(from.getFullYear() - 3)
        break
    }
    return {
      apiPeriod: mode.interval,
      fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''),
    }
  }

  // 기간 선택 (라인차트): 1D → 분봉(ka10080), 나머지 → 일봉(ka10081) 종가 라인
  if (mode.period === '1D') {
    // 1일: 분봉 API(ka10080)로 장중 가격 변동 표시 (SPEC-CHART-003)
    return {
      apiPeriod: 'minute',
      fromDate: now.toISOString().slice(0, 10).replace(/-/g, ''),
      ticScope: '1',
    }
  }

  switch (mode.period) {
    case '3M':
      from.setMonth(from.getMonth() - 3)
      break
    case '1Y':
      from.setFullYear(from.getFullYear() - 1)
      break
    case '3Y':
      from.setFullYear(from.getFullYear() - 3)
      break
    case '10Y':
      from.setFullYear(from.getFullYear() - 10)
      break
  }

  return {
    apiPeriod: 'daily',
    fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''),
  }
}

interface StockChartProps {
  // 조회할 종목 코드
  symbol: string
}

/**
 * 주가 차트 통합 컴포넌트 (SPEC-CHART-002)
 * - 봉 타입(일봉/주봉/월봉) 선택 → 캔들차트
 * - 기간(1일/3개월/1년/3년/10년) 선택 → 라인차트
 * - 두 그룹은 상호 배타적
 */
export function StockChart({ symbol }: StockChartProps) {
  // 차트 모드 (기본값: 일봉 캔들차트)
  const [mode, setMode] = useState<ChartMode>({ type: 'candle', interval: 'daily' })

  const { apiPeriod, fromDate, ticScope } = getApiParams(mode)
  // 차트 표시 타입은 모드에서 자동 결정
  const chartType = mode.type === 'candle' ? 'candlestick' : 'line'

  // 분봉(minute) 요청 시 tic_scope 쿼리 파라미터 추가
  const chartUrl = ticScope
    ? `/api/stocks/${symbol}/chart?period=${apiPeriod}&from=${fromDate}&tic_scope=${ticScope}`
    : `/api/stocks/${symbol}/chart?period=${apiPeriod}&from=${fromDate}`

  // 차트 데이터 SWR 페칭
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    data: ChartData
  }>(
    chartUrl,
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
      {/* 차트 모드 선택 툴바 */}
      <ChartToolbar mode={mode} onModeChange={setMode} />

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
            chartType={chartType}
          />
        )}
      </div>
    </div>
  )
}
