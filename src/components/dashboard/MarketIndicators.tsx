'use client'

// @MX:NOTE: 시장 지표(KOSPI, KOSDAQ, 환율) 카드를 보여주는 대시보드 컴포넌트
// SWR로 독립 fetch, 각 카드가 개별 로딩/에러 상태를 가짐

import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { apiUrl } from '@/lib/api'
import { MiniChart } from './MiniChart'

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

interface MarketIndex {
  code: string
  name: string
  value: number
  change: number
  changePercent: number
}

interface MarketData {
  kospi: MarketIndex
  kosdaq: MarketIndex
}

interface MarketResponse {
  success: boolean
  data: MarketData
}

interface ExchangeRate {
  base: string
  target: string
  rate: number
  date: string
  change: number
  changePercent: number
}

interface ExchangeRateHistory {
  date: string
  rate: number
}

interface ExchangeResponse {
  success: boolean
  data: {
    current: ExchangeRate
    history: ExchangeRateHistory[]
  }
}

interface ChartCandle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartResponse {
  success: boolean
  data: {
    candles: ChartCandle[]
  }
}

type MiniChartData = { time: string | number; value: number }[]

// ────────────────────────────────────────────────────────────
// 유틸리티 함수
// ────────────────────────────────────────────────────────────

/** SWR fetcher */
const fetcher = (url: string) =>
  fetch(url).then((res) => res.json())

/** YYYYMMDD 형식의 날짜 문자열 반환 */
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** 오늘과 n일 전 날짜를 YYYYMMDD 형식으로 반환 */
function getDateRange(daysBack: number) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - daysBack)
  return {
    from: toDateStr(from),
    to: toDateStr(today),
  }
}

/**
 * 분봉 ChartCandle 배열을 MiniChart용 데이터로 변환
 * 분봉: date가 ISO datetime 형식 (YYYY-MM-DDTHH:MM:SS)
 * → UTCTimestamp (초 단위 숫자)로 변환
 */
function candlesToMiniData(candles: ChartCandle[]): MiniChartData {
  const data = candles.map((c) => {
    if (c.date.includes('T')) {
      // 분봉: ISO datetime → UTCTimestamp
      const [datePart, timePart] = c.date.split('T')
      const [y, mo, d] = datePart.split('-').map(Number)
      const [h, mi, s] = (timePart || '00:00:00').split(':').map(Number)
      const ts = Math.floor(Date.UTC(y, mo - 1, d, h, mi, s ?? 0) / 1000)
      return { time: ts, value: c.close }
    }
    // 일봉 이상: YYYY-MM-DD 문자열 그대로 사용
    return { time: c.date, value: c.close }
  })
  // lightweight-charts는 시간 오름차순 필수 — 키움 API는 최신→과거 순서로 반환
  return data.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
}

/**
 * 환율 히스토리를 MiniChart용 데이터로 변환
 * date: YYYY-MM-DD 형식
 */
function historyToMiniData(history: ExchangeRateHistory[]): MiniChartData {
  return history.map((h) => ({ time: h.date, value: h.rate }))
}

/** 숫자를 천 단위 구분자 포함 소수점 2자리로 포맷 */
function formatValue(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 변화율 포맷 (+/-1.23%) */
function formatChange(value: number, percent: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatValue(value)} (${sign}${percent.toFixed(2)}%)`
}

// ────────────────────────────────────────────────────────────
// 스켈레톤 로딩 컴포넌트
// ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-7 bg-gray-200 rounded w-2/3 mb-1" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-[120px] bg-gray-100 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// 개별 지표 카드 컴포넌트
// ────────────────────────────────────────────────────────────

interface IndicatorCardProps {
  name: string
  value: string
  change: number
  changeText: string
  chartData: MiniChartData
  isLoading: boolean
  hasError: boolean
}

function IndicatorCard({
  name,
  value,
  change,
  changeText,
  chartData,
  isLoading,
  hasError,
}: IndicatorCardProps) {
  if (isLoading) return <CardSkeleton />

  // 상승: 빨간색, 하락: 파란색 (한국 주식 관례)
  const isUp = change >= 0
  const changeColor = isUp ? 'text-red-500' : 'text-blue-500'
  const chartColor = isUp ? '#ef4444' : '#3b82f6'
  const arrow = isUp ? '▲' : '▼'

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        {/* 지표명 */}
        <p className="text-sm text-gray-500 font-medium mb-1">{name}</p>

        {hasError ? (
          <p className="text-sm text-gray-400 py-2">데이터 없음</p>
        ) : (
          <>
            {/* 현재 값 */}
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>

            {/* 변화량 */}
            <p className={`text-sm font-medium mb-3 ${changeColor}`}>
              {arrow} {changeText}
            </p>

            {/* 미니 차트 */}
            {chartData.length > 0 ? (
              <MiniChart data={chartData} color={chartColor} height={120} />
            ) : (
              <div className="h-[120px] bg-gray-50 rounded flex items-center justify-center">
                <span className="text-xs text-gray-400">차트 데이터 없음</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// 메인 MarketIndicators 컴포넌트
// ────────────────────────────────────────────────────────────

export function MarketIndicators() {
  // 시장 지수 데이터 fetch
  const {
    data: marketRes,
    isLoading: marketLoading,
    error: marketError,
  } = useSWR<MarketResponse>(apiUrl('/api/market'), fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
  })

  // 환율 데이터 fetch
  const {
    data: exchangeRes,
    isLoading: exchangeLoading,
    error: exchangeError,
  } = useSWR<ExchangeResponse>(apiUrl('/api/market/exchange'), fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
  })

  // KOSPI 분봉 차트 데이터 fetch (오늘 기준 5일 전~오늘)
  const { from: kospiFrom, to: kospiTo } = getDateRange(5)
  const {
    data: kospiChartRes,
    isLoading: kospiChartLoading,
  } = useSWR<ChartResponse>(
    apiUrl(`/api/market/chart?index=kospi&period=minute&from=${kospiFrom}&to=${kospiTo}&tic_scope=1`),
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 2 }
  )

  // KOSDAQ 분봉 차트 데이터 fetch
  const { from: kosdaqFrom, to: kosdaqTo } = getDateRange(5)
  const {
    data: kosdaqChartRes,
    isLoading: kosdaqChartLoading,
  } = useSWR<ChartResponse>(
    apiUrl(`/api/market/chart?index=kosdaq&period=minute&from=${kosdaqFrom}&to=${kosdaqTo}&tic_scope=1`),
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 2 }
  )

  // 미니 차트 데이터 변환
  const kospiChartData = kospiChartRes?.data?.candles
    ? candlesToMiniData(kospiChartRes.data.candles)
    : []

  const kosdaqChartData = kosdaqChartRes?.data?.candles
    ? candlesToMiniData(kosdaqChartRes.data.candles)
    : []

  const exchangeChartData = exchangeRes?.data?.history
    ? historyToMiniData(exchangeRes.data.history)
    : []

  // 환율 로딩/에러 상태 판단
  const exchangeIsLoading = exchangeLoading
  const exchangeHasError = !exchangeLoading && (!!exchangeError || !exchangeRes?.success)
  const exchangeData = exchangeRes?.data?.current

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* KOSPI 카드 */}
      <IndicatorCard
        name="KOSPI"
        value={
          marketRes?.data?.kospi
            ? formatValue(marketRes.data.kospi.value)
            : '-'
        }
        change={marketRes?.data?.kospi?.change ?? 0}
        changeText={
          marketRes?.data?.kospi
            ? formatChange(
                marketRes.data.kospi.change,
                marketRes.data.kospi.changePercent
              )
            : '-'
        }
        chartData={kospiChartData}
        isLoading={marketLoading || kospiChartLoading}
        hasError={!marketLoading && (!!marketError || !marketRes?.success)}
      />

      {/* KOSDAQ 카드 */}
      <IndicatorCard
        name="KOSDAQ"
        value={
          marketRes?.data?.kosdaq
            ? formatValue(marketRes.data.kosdaq.value)
            : '-'
        }
        change={marketRes?.data?.kosdaq?.change ?? 0}
        changeText={
          marketRes?.data?.kosdaq
            ? formatChange(
                marketRes.data.kosdaq.change,
                marketRes.data.kosdaq.changePercent
              )
            : '-'
        }
        chartData={kosdaqChartData}
        isLoading={marketLoading || kosdaqChartLoading}
        hasError={!marketLoading && (!!marketError || !marketRes?.success)}
      />

      {/* 원/달러 환율 카드 */}
      <IndicatorCard
        name="원/달러 환율"
        value={exchangeData ? formatValue(exchangeData.rate) : '-'}
        change={exchangeData?.change ?? 0}
        changeText={
          exchangeData
            ? formatChange(exchangeData.change, exchangeData.changePercent)
            : '-'
        }
        chartData={exchangeChartData}
        isLoading={exchangeIsLoading}
        hasError={exchangeHasError}
      />
    </div>
  )
}
