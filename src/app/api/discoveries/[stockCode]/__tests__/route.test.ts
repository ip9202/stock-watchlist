/**
 * Discovery By Code API Routes 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { fetchDiscoveryByCode } from '@/lib/stock-auto/client'
import { NextRequest } from 'next/server'

// mock 설정
vi.mock('@/lib/stock-auto/client', () => ({
  fetchDiscoveryByCode: vi.fn(),
}))

describe('Discovery By Code API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/discoveries/[stockCode]', () => {
    it('성공적으로 종목 발견을 반환해야 한다', async () => {
      // Arrange
      const mockDiscovery = {
        stock_code: '005930',
        stock_name: '삼성전자',
        discovery_score: 85,
        grade: 'S' as const,
        sentiment: 0.8,
        reason: '강력한 상승 모멘텀',
        created_at: '2026-04-17T10:00:00Z',
      }

      vi.mocked(fetchDiscoveryByCode).mockResolvedValueOnce(mockDiscovery)

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries/005930')
      const mockParams = Promise.resolve({ stockCode: '005930' })

      // Act
      const response = await GET(mockRequest, { params: mockParams })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: mockDiscovery,
      })
      expect(fetchDiscoveryByCode).toHaveBeenCalledWith('005930')
    })

    it('발견이 없으면 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(fetchDiscoveryByCode).mockResolvedValueOnce(null)

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries/005930')
      const mockParams = Promise.resolve({ stockCode: '005930' })

      // Act
      const response = await GET(mockRequest, { params: mockParams })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: null,
      })
      expect(fetchDiscoveryByCode).toHaveBeenCalledWith('005930')
    })

    it('에러 발생 시 null을 반환해야 한다', async () => {
      // Arrange
      vi.mocked(fetchDiscoveryByCode).mockRejectedValueOnce(new Error('Network error'))

      const mockRequest = new NextRequest('http://localhost:3000/api/discoveries/005930')
      const mockParams = Promise.resolve({ stockCode: '005930' })

      // Act
      const response = await GET(mockRequest, { params: mockParams })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        data: null,
      })
      expect(fetchDiscoveryByCode).toHaveBeenCalledWith('005930')
    })
  })
})
