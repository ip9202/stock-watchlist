'use client'

// @MX:NOTE: 이 컴포넌트는 브라우저 전용 API(canvas)를 사용하므로 반드시 dynamic import + ssr:false로 로드해야 함
// @MX:REASON: lightweight-charts는 window/document에 직접 접근하므로 SSR 환경에서 실행 불가

import { useEffect, useRef } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  ColorType,
  SeriesType,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts'
import { ChartCandle, ChartType } from '@/types/stock'

interface ChartContainerProps {
  // 렌더링할 캔들 데이터 배열
  candles: ChartCandle[]
  // 차트 표시 타입 (캔들스틱 또는 라인)
  chartType: ChartType
}

/**
 * lightweight-charts를 사용하여 주가 차트를 렌더링하는 컨테이너 컴포넌트
 * - 반드시 'use client' + dynamic import + ssr:false 조합으로 사용
 * - chartType 변경 시 차트 인스턴스를 재생성하지 않고 시리즈만 교체
 */
export function ChartContainer({ candles, chartType }: ChartContainerProps) {
  // 차트가 마운트될 DOM 컨테이너 ref
  const containerRef = useRef<HTMLDivElement>(null)
  // 차트 인스턴스 ref (리렌더링 간 유지)
  const chartRef = useRef<IChartApi | null>(null)
  // 현재 시리즈 ref (타입 전환 시 제거 후 재생성)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  // 현재 chartType을 ref로 추적하여 변경 감지
  const chartTypeRef = useRef<ChartType>(chartType)

  // 캔들 데이터를 캔들스틱 형식으로 변환
  const toCandlestickData = (data: ChartCandle[]): CandlestickData[] =>
    data
      .map((c) => ({
        time: c.date as `${number}-${number}-${number}`,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1))

  // 캔들 데이터를 라인 차트 형식으로 변환 (종가 기준)
  const toLineData = (data: ChartCandle[]): LineData[] =>
    data
      .map((c) => ({
        time: c.date as `${number}-${number}-${number}`,
        value: c.close,
      }))
      .sort((a, b) => (a.time > b.time ? 1 : -1))

  // 차트 초기화 (마운트 시 1회)
  useEffect(() => {
    if (!containerRef.current) return

    // 차트 인스턴스 생성 (lightweight-charts v5 API)
    const chart = createChart(containerRef.current, {
      // 컨테이너 너비에 맞게 자동 크기 조정
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#374151',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // 언마운트 시 차트 정리
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // 데이터 또는 차트 타입 변경 시 시리즈 업데이트
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // 기존 시리즈 제거 (타입이 변경된 경우)
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current)
      seriesRef.current = null
    }

    // v5 API: chart.addSeries(SeriesDefinition, options) 방식 사용
    if (chartType === 'candlestick') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#ef4444',      // 상승: 빨간색 (한국 주식 관례)
        downColor: '#3b82f6',    // 하락: 파란색
        borderVisible: false,
        wickUpColor: '#ef4444',
        wickDownColor: '#3b82f6',
      })
      candleSeries.setData(toCandlestickData(candles))
      seriesRef.current = candleSeries
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
      })
      lineSeries.setData(toLineData(candles))
      seriesRef.current = lineSeries
    }

    // 데이터가 있을 때만 전체 범위로 맞춤
    if (candles.length > 0) {
      chart.timeScale().fitContent()
    }

    chartTypeRef.current = chartType
  }, [candles, chartType])

  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] sm:h-[400px]"
      aria-label="주가 차트"
    />
  )
}
