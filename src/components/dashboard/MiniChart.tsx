'use client'

// @MX:NOTE: 브라우저 전용 API를 사용하므로 dynamic import + ssr:false 필수
// @MX:REASON: lightweight-charts는 window/document에 직접 접근하여 SSR 환경에서 실행 불가

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  createChart,
  ColorType,
  LineSeries,
} from 'lightweight-charts'

interface MiniChartProps {
  // 차트에 표시할 시계열 데이터
  data: { time: string | number; value: number }[]
  // 라인 색상
  color: string
  // 차트 높이 (기본값: 120px)
  height?: number
}

/**
 * lightweight-charts를 사용한 미니 라인 차트 컴포넌트
 * - 툴바, 크로스헤어, 그리드라인 없는 클린 미니 차트
 * - autoSize: true로 컨테이너 너비에 맞게 자동 조정
 */
function MiniChartInner({ data, color, height = 120 }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    // 미니 차트 인스턴스 생성 - 툴바 및 레이블 없는 최소화 UI
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        // 크로스헤어 비활성화
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    // 라인 시리즈 추가
    const lineSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    // 데이터 설정
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lineSeries.setData(data as any)
    chart.timeScale().fitContent()

    return () => {
      chart.remove()
    }
  }, [data, color, height])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: `${height}px` }}
      aria-hidden="true"
    />
  )
}

// SSR 비활성화 - lightweight-charts는 브라우저 전용
export const MiniChart = dynamic(
  () => Promise.resolve(MiniChartInner),
  { ssr: false }
)
