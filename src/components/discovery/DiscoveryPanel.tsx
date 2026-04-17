'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { DiscoveryCard } from './DiscoveryCard'
import { apiFetch } from '@/lib/api'
import type { MashupDiscoveryResponse, Discovery } from '@/lib/stock-auto/client'

/**
 * 등급 필터 타입
 */
type GradeFilter = 'all' | 'S' | 'A' | 'B' | 'C'

/**
 * 등급 필터 탭
 */
const GRADE_FILTERS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'S', label: 'S' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]

/**
 * AI 발견 패널 컴포넌트
 * SWR을 사용한 자동 갱신 발견 목록 표시
 */
export function DiscoveryPanel() {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all')

  const { data, error, isLoading, mutate } = useSWR<MashupDiscoveryResponse>(
    '/api/discoveries',
    (url) => apiFetch(url).then(res => res.json()).then(res => res.data),
    {
      refreshInterval: 60000, // 1분 갱신
      revalidateOnFocus: false,
    }
  )

  // 필터링된 발견 목록
  const filteredDiscoveries = data?.discoveries
    .filter((discovery: Discovery) => {
      if (gradeFilter === 'all') return true
      return discovery.grade === gradeFilter
    })
    .sort((a: Discovery, b: Discovery) => b.discovery_score - a.discovery_score) || []

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            AI 발견
          </h2>
        </div>
        {/* 스켈레톤 카드 3개 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            AI 발견
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            발견 서버 연결 실패
          </p>
          <button
            onClick={() => mutate()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            재시도
          </button>
        </div>
      </div>
    )
  }

  // 빈 상태
  if (!data || data.discoveries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            AI 발견
          </h2>
          <button
            onClick={() => mutate()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            aria-label="새로고침"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          아직 발견된 종목이 없습니다
        </p>
      </div>
    )
  }

  // 발견 목록
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            AI 발견
          </h2>
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
            {data.count}개
          </span>
        </div>
        <button
          onClick={() => mutate()}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          aria-label="새로고침"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 등급 필터 탭 */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {GRADE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setGradeFilter(filter.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              gradeFilter === filter.value
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {filter.label}
            {gradeFilter === filter.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
            )}
          </button>
        ))}
      </div>

      {/* 발견 카드 목록 */}
      {filteredDiscoveries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            선택한 등급의 발견이 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDiscoveries.map((discovery) => (
            <DiscoveryCard key={discovery.stock_code} discovery={discovery} />
          ))}
        </div>
      )}
    </div>
  )
}
