'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { getMarketState, getPollingInterval, type DataType } from '@/lib/market-hours'
import { apiFetch } from '@/lib/api'

interface UsePollingDataResult<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isPolling: boolean
}

/**
 * 동적 폴링 커스텀 훅 (SPEC-POLL-001, REQ-POLL-003)
 *
 * SWR을 래핑하여 장 상태에 따라 동적으로 폴링 인터벌을 조절합니다
 * - 장중: 짧은 인터벌로 실시간에 가까운 갱신
 * - 폐장: 긴 인터벌 또는 폴링 중지 (0ms)
 * - 장 상태를 60초마다 재계산하여 자동 전환
 *
 * @param dataType - 데이터 타입 (stock-price, index, minute-chart 등)
 * @param url - API URL (/api/...)
 * @returns { data, error, isLoading, isPolling }
 */
export default function usePollingData<T = any>(
  dataType: DataType,
  url: string
): UsePollingDataResult<T> {
  const [marketState, setMarketState] = useState(() => getMarketState())

  // 장 상태를 60초마다 재계산
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = getMarketState()
      if (newState !== marketState) {
        setMarketState(newState)
      }
    }, 60000) // 60초마다 재계산

    return () => clearInterval(interval)
  }, [marketState])

  // 현재 장 상태에 따른 폴링 인터벌 계산
  const refreshInterval = getPollingInterval(dataType, marketState)

  // apiFetch 래퍼 (basePath 자동 적용)
  const fetcher = useCallback(async (url: string) => {
    const response = await apiFetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }, [])

  // SWR 호출
  const { data, error, isLoading } = useSWR<T>(
    url,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      errorRetryCount: 2,
      dedupingInterval: 1000 // 1초 이내 중복 요청 방지
    }
  )

  // 폴링 활성 상태 계산
  // - refreshInterval > 0 이고
  // - 로딩 중이 아니면 폴링 중으로 간주
  const isPolling = refreshInterval > 0 && !isLoading

  return {
    data: data ?? null,
    error: error ?? null,
    isLoading,
    isPolling
  }
}
