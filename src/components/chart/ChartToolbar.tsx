'use client'

import { ChartPeriod, ChartType } from '@/types/stock'

// 지원하는 기간 옵션 목록
const PERIOD_OPTIONS: ChartPeriod[] = ['1M', '3M', '6M', '1Y', '5Y']

// 기간 라벨 표시용 맵
const PERIOD_LABELS: Record<ChartPeriod, string> = {
  '1M': '1개월',
  '3M': '3개월',
  '6M': '6개월',
  '1Y': '1년',
  '5Y': '5년',
}

interface ChartToolbarProps {
  // 현재 선택된 기간
  selectedPeriod: ChartPeriod
  // 현재 선택된 차트 타입
  selectedType: ChartType
  // 기간 변경 핸들러
  onPeriodChange: (period: ChartPeriod) => void
  // 차트 타입 변경 핸들러
  onTypeChange: (type: ChartType) => void
}

/**
 * 차트 기간 및 타입을 선택하는 툴바 컴포넌트
 * - 기간: 1M, 3M, 6M, 1Y, 5Y
 * - 타입: 캔들스틱, 라인
 */
export function ChartToolbar({
  selectedPeriod,
  selectedType,
  onPeriodChange,
  onTypeChange,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      {/* 기간 선택 버튼 그룹 */}
      <div className="flex items-center gap-1">
        {PERIOD_OPTIONS.map((period) => (
          <button
            key={period}
            onClick={() => onPeriodChange(period)}
            className={`
              min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            aria-label={`${PERIOD_LABELS[period]} 기간 선택`}
            aria-pressed={selectedPeriod === period}
          >
            {period}
          </button>
        ))}
      </div>

      {/* 차트 타입 토글 버튼 그룹 */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
        <button
          onClick={() => onTypeChange('candlestick')}
          className={`
            min-h-[36px] px-3 py-1.5 text-sm font-medium rounded transition-colors
            ${
              selectedType === 'candlestick'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }
          `}
          aria-label="캔들스틱 차트로 전환"
          aria-pressed={selectedType === 'candlestick'}
        >
          캔들
        </button>
        <button
          onClick={() => onTypeChange('line')}
          className={`
            min-h-[36px] px-3 py-1.5 text-sm font-medium rounded transition-colors
            ${
              selectedType === 'line'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }
          `}
          aria-label="라인 차트로 전환"
          aria-pressed={selectedType === 'line'}
        >
          라인
        </button>
      </div>
    </div>
  )
}
