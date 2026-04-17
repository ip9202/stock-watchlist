'use client'

import { Discovery } from '@/lib/stock-auto/client'

interface DiscoveryCardProps {
  discovery: Discovery
}

/**
 * 등급별 색상 맵
 */
const GRADE_COLORS = {
  S: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

/**
 * Sentiment 라벨 맵
 */
const SENTIMENT_LABELS = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정',
} as const

/**
 * Sentiment 색상 맵
 */
const SENTIMENT_COLORS = {
  positive: 'text-green-600',
  neutral: 'text-gray-600',
  negative: 'text-red-600',
} as const

/**
 * 발견 카드 컴포넌트
 * 종목 발견 정보를 표시
 */
export function DiscoveryCard({ discovery }: DiscoveryCardProps) {
  const { stock_code, stock_name, discovery_score, grade, sentiment, reason, created_at } = discovery

  // Sentiment 라벨 결정
  const getSentimentLabel = (value: number): keyof typeof SENTIMENT_LABELS => {
    if (value > 0.1) return 'positive'
    if (value < -0.1) return 'negative'
    return 'neutral'
  }

  const sentimentKey = getSentimentLabel(sentiment)
  const sentimentLabel = SENTIMENT_LABELS[sentimentKey]
  const sentimentColor = SENTIMENT_COLORS[sentimentKey]

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

  // 관심종목 추가 핸들러
  const handleAddToWatchlist = () => {
    console.log('add to watchlist', stock_code)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더: 종목명 + 등급 배지 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stock_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stock_code}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${GRADE_COLORS[grade]}`}>
          {grade}
        </span>
      </div>

      {/* 발견 점수 바 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            발견 점수
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {discovery_score}점
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${discovery_score}%` }}
          />
        </div>
      </div>

      {/* Sentiment 표시 */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            감정 분석
          </span>
          <span className={`text-sm font-medium ${sentimentColor}`}>
            {sentimentLabel} ({sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)})
          </span>
        </div>
      </div>

      {/* 발견 사유 */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {reason}
        </p>
      </div>

      {/* 생성 시간 + 관심종목 추가 버튼 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getRelativeTime(created_at)}
        </span>
        <button
          onClick={handleAddToWatchlist}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
        >
          관심종목 추가
        </button>
      </div>
    </div>
  )
}
