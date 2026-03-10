'use client'

import { CandleInterval, LinePeriod, ChartMode } from '@/types/stock'

// 캔들 간격 옵션 (봉 타입 → 캔들차트)
const CANDLE_OPTIONS: { value: CandleInterval; label: string }[] = [
  { value: 'daily', label: '일봉' },
  { value: 'weekly', label: '주봉' },
  { value: 'monthly', label: '월봉' },
]

// 라인 기간 옵션 (기간 → 라인차트)
const LINE_OPTIONS: { value: LinePeriod; label: string }[] = [
  { value: '1D', label: '1일' },
  { value: '3M', label: '3개월' },
  { value: '1Y', label: '1년' },
  { value: '3Y', label: '3년' },
  { value: '10Y', label: '10년' },
]

interface ChartToolbarProps {
  // 현재 차트 모드 (봉 타입 or 기간)
  mode: ChartMode
  // 모드 변경 핸들러
  onModeChange: (mode: ChartMode) => void
}

/**
 * 차트 모드 선택 툴바 (SPEC-CHART-002)
 * - 일봉/주봉/월봉: 캔들차트 (상호 배타적)
 * - 1일/3개월/1년/3년/10년: 라인차트 (상호 배타적)
 * - 두 그룹은 상호 배타적 — 하나만 활성화됨
 */
export function ChartToolbar({ mode, onModeChange }: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mb-3">
      {/* 봉 타입 버튼 (캔들차트) */}
      {CANDLE_OPTIONS.map(({ value, label }) => {
        const isActive = mode.type === 'candle' && mode.interval === value
        return (
          <button
            key={value}
            onClick={() => onModeChange({ type: 'candle', interval: value })}
            className={`
              min-h-[44px] px-3 py-2 text-sm font-medium rounded-full transition-colors
              ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            aria-label={`${label} 캔들차트 선택`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        )
      })}

      {/* 구분선 */}
      <div className="h-6 w-px bg-gray-300 mx-1" aria-hidden="true" />

      {/* 기간 버튼 (라인차트) */}
      {LINE_OPTIONS.map(({ value, label }) => {
        const isActive = mode.type === 'line' && mode.period === value
        return (
          <button
            key={value}
            onClick={() => onModeChange({ type: 'line', period: value })}
            className={`
              min-h-[44px] px-3 py-2 text-sm font-medium rounded-full transition-colors
              ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            aria-label={`${label} 라인차트 선택`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
