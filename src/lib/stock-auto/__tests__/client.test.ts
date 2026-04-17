/**
 * Stock Auto API 클라이언트 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchSignals, fetchSignalByCode } from '../client'

describe('StockAutoClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchSignals', () => {
    it('성공적으로 시그널 목록을 반환해야 한다', async () => {
      // Arrange
      const mockSignals = {
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

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignals,
      } as Response)

      // Act
      const result = await fetchSignals()

      // Assert
      expect(result).toEqual(mockSignals)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://14.49.182.30:8080/api/mashup/signals',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('에러 발생 시 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      // Act
      const result = await fetchSignals()

      // Assert
      expect(result).toBeNull()
    })

    it('타임아웃 발생 시 null을 반환해야 한다', async () => {
      // Arrange: AbortController를 사용하여 타임아웃 시뮬레이션
      vi.useFakeTimers()

      vi.mocked(global.fetch).mockImplementationOnce(() => {
        // 즉시 AbortError 발생
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      })

      // Act
      const result = await fetchSignals()

      // Assert
      expect(result).toBeNull()

      vi.useRealTimers()
    })

    it('HTTP 에러 시 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      // Act
      const result = await fetchSignals()

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('fetchSignalByCode', () => {
    it('성공적으로 종목 시그널을 반환해야 한다', async () => {
      // Arrange
      const mockSignal = {
        stock_code: '005930',
        stock_name: '삼성전자',
        signal_type: 'BUY',
        score: 0.85,
        indicators: { rsi: 45, supertrend: 'UP' },
        created_at: '2026-04-17T10:00:00Z',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSignal,
      } as Response)

      // Act
      const result = await fetchSignalByCode('005930')

      // Assert
      expect(result).toEqual(mockSignal)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://14.49.182.30:8080/api/mashup/signals/005930',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('404 시 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      // Act
      const result = await fetchSignalByCode('005930')

      // Assert
      expect(result).toBeNull()
    })

    it('에러 발생 시 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      // Act
      const result = await fetchSignalByCode('005930')

      // Assert
      expect(result).toBeNull()
    })
  })
})
