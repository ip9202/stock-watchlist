/**
 * Discovery API Routes 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { cache } from '@/lib/cache'
import { fetchDiscoveries } from '@/lib/stock-auto/client'
import { NextRequest } from 'next/server'

// mock 설정
vi.mock('@/lib/stock-auto/client', () => ({
  fetchDiscoveries: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

describe('Discovery API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/discoveries', () => {
    it('캐시가 있으면 캐시된 데이터를 반환해야 한다', async () => {
      // Arrange
      const mockCachedData = {
        discoveries: [
          {
            stock_code: '005930',
            stock_name: '삼성전자',
            discovery_score: 85,
            grade: 'S' as const,
            sentiment: 0.8,
            reason: '강력한 상승 모멘텀',
            created_at: '2026-04-17T10:00:00Z',
          },
        ],
        count: 1,
      }

      vi.mocked(cache.get).mockReturnValueOnce(mockCachedData)

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries')

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockCachedData,
      })
      expect(cache.get).toHaveBeenCalledWith('ai_discoveries_all')
      expect(fetchDiscoveries).not.toHaveBeenCalled()
    })

    it('캐시가 없으면 Stock Auto API를 호출하고 캐시에 저장해야 한다', async () => {
      // Arrange
      const mockApiData = {
        discoveries: [
          {
            stock_code: '005930',
            stock_name: '삼성전자',
            discovery_score: 85,
            grade: 'S' as const,
            sentiment: 0.8,
            reason: '강력한 상승 모멘텀',
            created_at: '2026-04-17T10:00:00Z',
          },
        ],
        count: 1,
      }

      vi.mocked(cache.get).mockReturnValueOnce(undefined)
      vi.mocked(fetchDiscoveries).mockResolvedValueOnce(mockApiData)

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries')

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockApiData,
      })
      expect(cache.get).toHaveBeenCalledWith('ai_discoveries_all')
      expect(fetchDiscoveries).toHaveBeenCalled()
      expect(cache.set).toHaveBeenCalledWith('ai_discoveries_all', mockApiData, 30)
    })

    it('Stock Auto API 에러 시 빈 배열을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValueOnce(undefined)
      vi.mocked(fetchDiscoveries).mockResolvedValueOnce(null)

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries')

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: {
          discoveries: [],
          count: 0,
        },
      })
      expect(fetchDiscoveries).toHaveBeenCalled()
      expect(cache.set).not.toHaveBeenCalled()
    })

    it('예외 발생 시 빈 배열을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(cache.get).mockReturnValueOnce(undefined)
      vi.mocked(fetchDiscoveries).mockRejectedValueOnce(new Error('Network error'))

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries')

      // Act
      const response = await GET(mockRequest)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: {
          discoveries: [],
          count: 0,
        },
      })
      expect(fetchDiscoveries).toHaveBeenCalled()
      expect(cache.set).not.toHaveBeenCalled()
    })
  })
})
