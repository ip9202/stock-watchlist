'use client'

// @MX:NOTE: 시장 지표(KOSPI, KOSDAQ, 환율) 탭 전환 차트 컴포넌트
// 상세 페이지 1일 차트와 동일한 ChartContainer를 재사용

import { useState } from 'react'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { apiUrl } from '@/lib/api'
import type { ChartCandle } from '@/types/stock'

// ChartContainer를 SSR 비활성화로 동적 로드 (상세 페이지와 동일 패턴)
const ChartContainer = dynamic(
  () => import('../chart/ChartContainer').then((mod) => mod.ChartContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] sm:h-[400px] bg-gray-100 animate-pulse rounded-lg" />
    ),
  }
)

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

type TabType = 'kospi' | 'kosdaq' | 'exchange'

interface MarketIndex {
  code: string
  name: string
  value: number
  change: number
  changePercent: number
}

interface MarketResponse {
  success: boolean
  data: { kospi: MarketIndex; kosdaq: MarketIndex }
}

interface ExchangeRate {
  rate: number
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

interface ChartResponse {
  success: boolean
  data: { candles: ChartCandle[] }
}

// ────────────────────────────────────────────────────────────
// 유틸리티
// ────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function getDateRange(daysBack: number) {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - daysBack)
  return { from: toDateStr(from), to: toDateStr(today) }
}

/** 환율 히스토리를 ChartCandle 형식으로 변환 (ChartContainer 재사용을 위해) */
function historyToCandles(history: ExchangeRateHistory[]): ChartCandle[] {
  return history.map((h) => ({
    date: h.date,
    open: h.rate,
    high: h.rate,
    low: h.rate,
    close: h.rate,
    volume: 0,
  }))
}

/** 캔들 배열을 날짜 오름차순 정렬 */
function sortCandles(candles: ChartCandle[]): ChartCandle[] {
  return [...candles].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
}

function formatValue(value: number): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ────────────────────────────────────────────────────────────
// 탭 설정
// ────────────────────────────────────────────────────────────

const TABS: { key: TabType; label: string }[] = [
  { key: 'kospi', label: 'KOSPI' },
  { key: 'kosdaq', label: 'KOSDAQ' },
  { key: 'exchange', label: 'USD/KRW' },
]

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────

export function MarketIndicators() {
  const [activeTab, setActiveTab] = useState<TabType>('kospi')

  // 시장 지수 데이터 fetch
  const { data: marketRes, isLoading: marketLoading } =
    useSWR<MarketResponse>(apiUrl('/api/market'), fetcher, {
      revalidateOnFocus: false,
      errorRetryCount: 2,
    })

  // 환율 데이터 fetch
  const { data: exchangeRes, isLoading: exchangeLoading } =
    useSWR<ExchangeResponse>(apiUrl('/api/market/exchange'), fetcher, {
      revalidateOnFocus: false,
      errorRetryCount: 2,
    })

  // KOSPI/KOSDAQ 분봉 차트 데이터 fetch
  const { from, to } = getDateRange(5)
  const { data: kospiChartRes } = useSWR<ChartResponse>(
    apiUrl(`/api/market/chart?index=kospi&period=minute&from=${from}&to=${to}&tic_scope=1`),
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 2 }
  )
  const { data: kosdaqChartRes } = useSWR<ChartResponse>(
    apiUrl(`/api/market/chart?index=kosdaq&period=minute&from=${from}&to=${to}&tic_scope=1`),
    fetcher,
    { revalidateOnFocus: false, errorRetryCount: 2 }
  )

  // 현재 탭에 따른 데이터 선택
  const getTabData = () => {
    switch (activeTab) {
      case 'kospi': {
        const idx = marketRes?.data?.kospi
        const candles = kospiChartRes?.data?.candles
          ? sortCandles(kospiChartRes.data.candles) : []
        return {
          name: idx?.name ?? 'KOSPI',
          value: idx ? formatValue(idx.value) : '-',
          change: idx?.change ?? 0,
          changePercent: idx?.changePercent ?? 0,
          candles,
          isLoading: marketLoading,
        }
      }
      case 'kosdaq': {
        const idx = marketRes?.data?.kosdaq
        const candles = kosdaqChartRes?.data?.candles
          ? sortCandles(kosdaqChartRes.data.candles) : []
        return {
          name: idx?.name ?? 'KOSDAQ',
          value: idx ? formatValue(idx.value) : '-',
          change: idx?.change ?? 0,
          changePercent: idx?.changePercent ?? 0,
          candles,
          isLoading: marketLoading,
        }
      }
      case 'exchange': {
        const ex = exchangeRes?.data?.current
        const candles = exchangeRes?.data?.history
          ? historyToCandles(exchangeRes.data.history) : []
        return {
          name: 'USD/KRW',
          value: ex ? formatValue(ex.rate) : '-',
          change: ex?.change ?? 0,
          changePercent: ex?.changePercent ?? 0,
          candles,
          isLoading: exchangeLoading,
        }
      }
    }
  }

  const tabData = getTabData()
  const isUp = tabData.change >= 0
  const changeColor = isUp ? 'text-red-500' : 'text-blue-500'
  const sign = isUp ? '+' : ''
  const arrow = isUp ? '▲' : '▼'

  return (
    <Card className="bg-white border border-gray-200 rounded-lg">
      {/* 탭 버튼 */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <CardContent className="p-4">
        {/* 로딩 상태 */}
        {tabData.isLoading ? (
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-1" />
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-[320px] sm:h-[400px] bg-gray-100 rounded" />
          </div>
        ) : (
          <>
            {/* 지표 정보 */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-500 font-medium">{tabData.name}</h3>
              <p className="text-3xl font-bold text-gray-900">{tabData.value}</p>
              <p className={`text-sm font-medium ${changeColor}`}>
                {arrow} {sign}{formatValue(Math.abs(tabData.change))} ({sign}{tabData.changePercent.toFixed(2)}%)
              </p>
            </div>

            {/* 차트 — 상세 페이지 1일 차트와 동일한 ChartContainer 사용 */}
            {tabData.candles.length > 0 ? (
              <ChartContainer
                candles={tabData.candles}
                chartType="line"
              />
            ) : (
              <div className="h-[320px] sm:h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-sm text-gray-400">차트 데이터 없음</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
