'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { ChartMode, ChartData } from '@/types/stock'
import { ChartToolbar } from './ChartToolbar'
import { apiUrl } from '@/lib/api'

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
 * - candle 모드: interval → API period, 기본 기간 설정
 * - line 모드: 1D → minute(분봉), 3M/1Y → daily, 3Y → weekly, 10Y → monthly
 * @MX:ANCHOR: SWR URL 생성의 핵심 함수 - mode/period 추가 시 여기를 수정
 * @MX:REASON: ChartMode, StockChart, StockChart 테스트 3곳에서 참조됨
 */
export function getApiParams(mode: ChartMode): {
  apiPeriod: string
  fromDate: string
  toDate: string
  ticScope?: string
} {
  const now = new Date()
  const toDate = now.toISOString().slice(0, 10).replace(/-/g, '')
  const from = new Date(now)

  if (mode.type === 'candle') {
    // 봉 타입별 기본 조회 기간 설정
    switch (mode.interval) {
      case 'daily':
        // 일봉: 최근 3개월 (약 60 영업일, ka10081)
        from.setMonth(from.getMonth() - 3)
        break
      case 'weekly':
        // 주봉: 최근 1년 (약 52주, ka10082)
        from.setFullYear(from.getFullYear() - 1)
        break
      case 'monthly':
        // 월봉: 최근 3년 (36개월, ka10083)
        from.setFullYear(from.getFullYear() - 3)
        break
    }
    return {
      apiPeriod: mode.interval,
      fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''),
      toDate,
    }
  }

  // 기간 선택 (라인차트): 1D → 분봉(ka10080)
  // 장외 시간(09:00 이전, 15:30 이후)이나 주말에도 최근 거래일 데이터를 보여주기 위해
  // fromDate를 5일 전으로 설정 (주말 + 공휴일 대비)
  // fetchChart에서 가장 최근 거래일 데이터만 필터링하여 반환
  if (mode.period === '1D') {
    const from1D = new Date(now)
    from1D.setDate(from1D.getDate() - 5)
    return {
      apiPeriod: 'minute',
      fromDate: from1D.toISOString().slice(0, 10).replace(/-/g, ''),
      toDate,
      ticScope: '1',
    }
  }

  // 기간별 적절한 API 해상도 선택
  // 3M/1Y → daily, 3Y → weekly, 10Y → monthly
  switch (mode.period) {
    case '3M':
      from.setMonth(from.getMonth() - 3)
      return { apiPeriod: 'daily', fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''), toDate }
    case '1Y':
      from.setFullYear(from.getFullYear() - 1)
      return { apiPeriod: 'daily', fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''), toDate }
    case '3Y':
      from.setFullYear(from.getFullYear() - 3)
      return { apiPeriod: 'weekly', fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''), toDate }
    case '10Y':
      from.setFullYear(from.getFullYear() - 10)
      return { apiPeriod: 'monthly', fromDate: from.toISOString().slice(0, 10).replace(/-/g, ''), toDate }
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

  const { apiPeriod, fromDate, toDate, ticScope } = getApiParams(mode)
  // 차트 표시 타입은 모드에서 자동 결정
  const chartType = mode.type === 'candle' ? 'candlestick' : 'line'

  // API URL 구성: from(시작일) + to(종료일=오늘) + period + tic_scope(분봉 전용)
  // apiUrl()로 basePath 적용 (클라이언트 컴포넌트에서는 자동 적용 안 됨)
  const chartUrl = ticScope
    ? apiUrl(`/api/stocks/${symbol}/chart?period=${apiPeriod}&from=${fromDate}&to=${toDate}&tic_scope=${ticScope}`)
    : apiUrl(`/api/stocks/${symbol}/chart?period=${apiPeriod}&from=${fromDate}&to=${toDate}`)

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

  // 1일 차트에서 전일 종가 기준선 표시를 위해 주식 상세 데이터 페칭
  const detailUrl = mode.type === 'line' && mode.period === '1D'
    ? apiUrl(`/api/stocks/${symbol}`)
    : null
  const { data: detailData } = useSWR<{ success: boolean; data: { previousClose?: number } }>(
    detailUrl,
    fetcher,
    { revalidateOnFocus: false }
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
            previousClose={detailData?.data?.previousClose}
          />
        )}
      </div>
    </div>
  )
}
