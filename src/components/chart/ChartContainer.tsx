'use client'

// @MX:NOTE: 이 컴포넌트는 브라우저 전용 API(canvas)를 사용하므로 반드시 dynamic import + ssr:false로 로드해야 함
// @MX:REASON: lightweight-charts는 window/document에 직접 접근하므로 SSR 환경에서 실행 불가

import { useEffect, useRef } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  SeriesType,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  UTCTimestamp,
  WhitespaceData,
} from 'lightweight-charts'
import { ChartCandle } from '@/types/stock'
import { toCandlestickData, toLineData } from './chart-data-utils'

// 한국 주식시장 정규장 시간 (KST)
const MARKET_OPEN_HOUR = 9
const MARKET_OPEN_MIN = 0
const MARKET_CLOSE_HOUR = 15
const MARKET_CLOSE_MIN = 30

interface ChartContainerProps {
  // 렌더링할 캔들 데이터 배열
  candles: ChartCandle[]
  // 차트 표시 타입 (캔들스틱 또는 라인)
  chartType: 'candlestick' | 'line'
  // 전일 종가 (1일 분봉 차트에서 기준선 표시용)
  previousClose?: number
}

/**
 * lightweight-charts를 사용하여 주가 차트를 렌더링하는 컨테이너 컴포넌트
 * - 반드시 'use client' + dynamic import + ssr:false 조합으로 사용
 * - chartType 변경 시 차트 인스턴스를 재생성하지 않고 시리즈만 교체
 */
export function ChartContainer({ candles, chartType, previousClose }: ChartContainerProps) {
  // 차트가 마운트될 DOM 컨테이너 ref
  const containerRef = useRef<HTMLDivElement>(null)
  // 차트 인스턴스 ref (리렌더링 간 유지)
  const chartRef = useRef<IChartApi | null>(null)
  // 현재 시리즈 ref (타입 전환 시 제거 후 재생성)
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null)
  // 현재 chartType을 ref로 추적하여 변경 감지
  const chartTypeRef = useRef<'candlestick' | 'line'>(chartType)

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
        attributionLogo: false,
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
        fixLeftEdge: true,
        fixRightEdge: true,
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
      // 1일 분봉 차트에서 전일종가를 Y축 범위에 포함시키기 위해
      // autoscaleInfoProvider를 설정하여 가격 스케일 확장
      const isIntraday = candles.length > 0 && candles[0].date.includes('T')
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        ...(isIntraday && previousClose ? {
          autoscaleInfoProvider: (original: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
            const res = original()
            if (res !== null) {
              res.priceRange.minValue = Math.min(res.priceRange.minValue, previousClose)
              res.priceRange.maxValue = Math.max(res.priceRange.maxValue, previousClose)
            }
            return res
          },
        } : {}),
      })
      const lineData: (Parameters<typeof lineSeries.setData>[0][number])[] = toLineData(candles)

      if (isIntraday && lineData.length > 0) {
        // 1일 분봉 차트: 09:00~15:30 시간축 고정
        // 실제 데이터 포인트로 시간축 앵커를 생성하여 확실한 범위 확장
        const dateStr = candles[0].date.slice(0, 10)
        const y = parseInt(dateStr.slice(0, 4))
        const mo = parseInt(dateStr.slice(5, 7)) - 1
        const d = parseInt(dateStr.slice(8, 10))
        const marketOpen = Math.floor(Date.UTC(y, mo, d, MARKET_OPEN_HOUR, MARKET_OPEN_MIN) / 1000) as UTCTimestamp
        const marketClose = Math.floor(Date.UTC(y, mo, d, MARKET_CLOSE_HOUR, MARKET_CLOSE_MIN) / 1000) as UTCTimestamp

        // 정렬된 데이터에서 첫/마지막 값 가져오기
        const sortedData = lineData.filter((p): p is { time: UTCTimestamp; value: number } => 'value' in p)
        const firstValue = sortedData[0]?.value
        const lastValue = sortedData[sortedData.length - 1]?.value

        // 09:00 앵커: 데이터가 09:00보다 늦게 시작하면 시가로 포인트 추가
        if (firstValue !== undefined && (sortedData[0].time as number) > (marketOpen as number)) {
          lineData.unshift({ time: marketOpen, value: firstValue })
        }
        // 15:30 앵커: 마지막 데이터 이후 빈 시간을 마지막 종가로 연장
        if (lastValue !== undefined && (sortedData[sortedData.length - 1].time as number) < (marketClose as number)) {
          lineData.push({ time: marketClose, value: lastValue })
        }
      }

      lineSeries.setData(lineData)
      seriesRef.current = lineSeries
    }

    if (candles.length > 0) {
      const isIntradayChart = candles[0].date.includes('T')

      if (isIntradayChart) {
        // 1일 분봉: fixEdge 해제 후 09:00~15:30 범위 고정
        chart.timeScale().applyOptions({ fixLeftEdge: false, fixRightEdge: false })
        const dateStr = candles[0].date.slice(0, 10)
        const y = parseInt(dateStr.slice(0, 4))
        const mo = parseInt(dateStr.slice(5, 7)) - 1
        const d = parseInt(dateStr.slice(8, 10))
        const marketOpen = Math.floor(Date.UTC(y, mo, d, MARKET_OPEN_HOUR, MARKET_OPEN_MIN) / 1000) as UTCTimestamp
        const marketClose = Math.floor(Date.UTC(y, mo, d, MARKET_CLOSE_HOUR, MARKET_CLOSE_MIN) / 1000) as UTCTimestamp
        chart.timeScale().setVisibleRange({ from: marketOpen, to: marketClose })
      } else {
        // 일봉/주봉/월봉: fixEdge 복원 후 fitContent
        chart.timeScale().applyOptions({ fixLeftEdge: true, fixRightEdge: true })
        chart.timeScale().fitContent()
      }

      // 1일 분봉 차트에서 전일 종가 기준선 표시
      if (isIntradayChart && previousClose && seriesRef.current) {
        seriesRef.current.createPriceLine({
          price: previousClose,
          color: '#f59e0b',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '전일종가',
        })
      }
    }

    chartTypeRef.current = chartType
  }, [candles, chartType, previousClose])

  return (
    <div
      ref={containerRef}
      className="w-full h-[320px] sm:h-[400px]"
      aria-label="주가 차트"
    />
  )
}
