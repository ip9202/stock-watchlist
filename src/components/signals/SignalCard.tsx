'use client'

import { Signal } from '@/lib/stock-auto/client'

interface SignalCardProps {
  signal: Signal
}

/**
 * 시그널 타입별 색상 맵
 */
const SIGNAL_TYPE_COLORS = {
  BUY: 'bg-green-100 text-green-800 border-green-200',
  SELL: 'bg-red-100 text-red-800 border-red-200',
  HOLD: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

/**
 * 시그널 카드 컴포넌트
 * 종목 시그널 정보를 표시
 */
export function SignalCard({ signal }: SignalCardProps) {
  const { stock_code, stock_name, signal_type, score, indicators, created_at } = signal

  // 상대 시간 계산
  const getRelativeTime = (dateString: string): string => {
    const now = new Date()
    const created = new Date(dateString)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}일 전`
  }

  // 점수 바 너비 계산
  const scorePercent = Math.round(score * 100)

  // 주요 지표 추출
  const keyIndicators = [
    indicators.supertrend && `ST: ${indicators.supertrend}`,
    indicators.rsi !== undefined && `RSI: ${indicators.rsi.toFixed(1)}`,
    indicators.macd && `MACD: ${indicators.macd}`,
    indicators.divergence && `Divergence: ${indicators.divergence}`,
  ].filter(Boolean) as string[]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더: 종목명 + 시그널 타입 배지 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stock_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stock_code}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${SIGNAL_TYPE_COLORS[signal_type]}`}>
          {signal_type}
        </span>
      </div>

      {/* 점수 바 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            신뢰도
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {scorePercent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* 주요 지표 칩 */}
      {keyIndicators.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {keyIndicators.map((indicator, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md border border-gray-200 dark:border-gray-600"
            >
              {indicator}
            </span>
          ))}
        </div>
      )}

      {/* 생성 시간 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>생성 시간</span>
        <span>{getRelativeTime(created_at)}</span>
      </div>
    </div>
  )
}
