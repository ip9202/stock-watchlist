/**
 * AI 시그널 API Routes 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { cache } from '@/lib/cache'
import type { MashupSignalResponse } from '@/lib/stock-auto/client'

// client 모킹
vi.mock('@/lib/stock-auto/client', () => ({
  fetchSignals: vi.fn(),
}))

// 캐시 모킹
vi.mock('@/lib/cache', () => {
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  return {
    cache: {
      get: mockGet,
      set: mockSet,
      delete: vi.fn(),
      clear: vi.fn(),
      cleanup: vi.fn()
    }
  }
})

import { fetchSignals } from '@/lib/stock-auto/client'

describe('GET /api/signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('성공적으로 시그널 목록을 반환해야 한다', async () => {
    // Arrange
    const mockSignals: MashupSignalResponse = {
      signals: [
        {
          stock_code: '005930',
          stock_name: '삼성전자',
          signal_type: 'BUY',
          score: 0.85,
          indicators: { rsi: 45, supertrend: 'UP' },
          created_at: '2026-04-17T10:00:00Z',
        },
      ],
      count: 1,
      generated_at: '2026-04-17T10:00:00Z',
    }

    vi.mocked(cache.get).mockReturnValue(null)
    vi.mocked(fetchSignals).mockResolvedValue(mockSignals)

    // Act
    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost/api/signals')
    const response = await GET(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual(mockSignals)
    expect(cache.set).toHaveBeenCalledWith('ai_signals_all', mockSignals, 30)
  })

  it('캐시 히트 시 fetchSignals를 호출하지 않아야 한다', async () => {
    // Arrange
    const cachedSignals = {
      signals: [
        {
          stock_code: '005930',
          stock_name: '삼성전자',
          signal_type: 'BUY',
          score: 0.85,
          indicators: { rsi: 45 },
          created_at: '2026-04-17T10:00:00Z',
        },
      ],
      count: 1,
      generated_at: '2026-04-17T10:00:00Z',
    }

    vi.mocked(cache.get).mockReturnValue(cachedSignals)

    // Act
    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost/api/signals')
    const response = await GET(request)
    const json = await response.json()

    // Assert
    expect(json.success).toBe(true)
    expect(json.data).toEqual(cachedSignals)
    expect(fetchSignals).not.toHaveBeenCalled()
  })

  it('API 에러 시 빈 배열을 반환해야 한다', async () => {
    // Arrange
    vi.mocked(cache.get).mockReturnValue(null)
    vi.mocked(fetchSignals).mockResolvedValue(null)

    // Act
    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost/api/signals')
    const response = await GET(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.signals).toEqual([])
    expect(json.data.count).toBe(0)
  })

  it('예외 발생 시 빈 배열을 반환해야 한다', async () => {
    // Arrange
    vi.mocked(cache.get).mockReturnValue(null)
    vi.mocked(fetchSignals).mockRejectedValue(new Error('Network error'))

    // Act
    const { GET } = await import('../route')
    const request = new NextRequest('http://localhost/api/signals')
    const response = await GET(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.signals).toEqual([])
  })
})
