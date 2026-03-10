/**
 * 키움증권 REST API 토큰 관리자 테스트
 * REQ-001: 토큰 관리 (Ubiquitous)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { KiwoomTokenManager } from '../kiwoom-token-manager'

// Mock axios for HTTP requests
vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}))

import axios from 'axios'

describe('KiwoomTokenManager', () => {
  let tokenManager: KiwoomTokenManager
  const mockAppKey = 'test-app-key'
  const mockSecretKey = 'test-secret-key'
  const mockAccessToken = 'test-access-token'

  beforeEach(() => {
    // 환경변수 설정
    process.env.KIWOOM_APP_KEY = mockAppKey
    process.env.KIWOOM_SECRET_KEY = mockSecretKey

    // 싱글톤 인스턴스 리셋 (테스트 격리)
    ;(KiwoomTokenManager as any).instance = null

    // 모듈 내 캐시 초기화를 위해 싱글톤 인스턴스 재설정
    tokenManager = KiwoomTokenManager.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.KIWOOM_APP_KEY
    delete process.env.KIWOOM_SECRET_KEY
    // 싱글톤 인스턴스 리셋
    ;(KiwoomTokenManager as any).instance = null
  })

  describe('토큰 발급 (getAccessToken)', () => {
    it('성공적으로 접근 토큰을 발급받아야 한다', async () => {
      // Arrange: Mock axios response
      const mockResponse = {
        data: {
          return_code: 0,
          token: mockAccessToken
        }
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      // Act: 토큰 요청
      const token = await tokenManager.getAccessToken()

      // Assert: 유효한 토큰 반환 확인
      expect(token).toBe(mockAccessToken)
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.kiwoom.com/oauth2/token',
        {
          grant_type: 'client_credentials',
          appkey: mockAppKey,
          secretkey: mockSecretKey
        },
        {
          headers: { 'Content-Type': 'application/json;charset=UTF-8' },
          timeout: 10000
        }
      )
    })

    it('토큰 발급 실패 시 에러를 던져야 한다', async () => {
      // Arrange: Mock error response (return_code != 0)
      const mockErrorResponse = {
        data: {
          return_code: -1,
          return_msg: 'Invalid appkey'
        }
      }
      // 모든 재시도에 대해 동일한 응답 반환
      vi.mocked(axios.post).mockResolvedValue(mockErrorResponse as any)

      // Act & Assert: 에러 발생 확인
      await expect(tokenManager.getAccessToken()).rejects.toThrow('토큰 발급 실패: Invalid appkey')
    })

    it('네트워크 오류 시 에러를 던져야 한다', async () => {
      // Arrange: Mock network error - 모든 재시도에 대해 동일한 에러 반환
      const networkError = new Error('Network error')
      vi.mocked(axios.post).mockRejectedValue(networkError)

      // Act & Assert: 에러 발생 확인
      await expect(tokenManager.getAccessToken()).rejects.toThrow('Network error')
    })
  })

  describe('토큰 캐싱 (Token Caching)', () => {
    it('첫 번째 요청 후 토큰을 캐시해야 한다', async () => {
      // Arrange: Mock successful response
      const mockResponse = {
        data: {
          return_code: 0,
          token: mockAccessToken
        }
      }
      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      // Act: 토큰 요청 두 번
      await tokenManager.getAccessToken()
      await tokenManager.getAccessToken()

      // Assert: axios.post가 한 번만 호출되어야 함 (캐시 적중)
      expect(axios.post).toHaveBeenCalledTimes(1)
    })

    it('토큰 만료 시 자동으로 갱신해야 한다', async () => {
      // Arrange: Mock successful response
      const mockResponse = {
        data: {
          return_code: 0,
          token: mockAccessToken,
          expires_in: 3600 // 1시간
        }
      }
      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      // Act: 토큰 요청
      await tokenManager.getAccessToken()

      // 토큰 만료 시뮬레이션 (내부 캐시 무효화)
      tokenManager.invalidateToken()

      const secondToken = await tokenManager.getAccessToken()

      // Assert: 새로운 토큰 요청 확인
      expect(axios.post).toHaveBeenCalledTimes(2)
      expect(secondToken).toBe(mockAccessToken)
    })
  })

  describe('토큰 상태 확인 (Token Status)', () => {
    it('유효한 토큰이 있으면 true를 반환해야 한다', async () => {
      // Arrange: Mock successful response
      const mockResponse = {
        data: {
          return_code: 0,
          token: mockAccessToken
        }
      }
      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      // Act: 토큰 발급 후 상태 확인
      await tokenManager.getAccessToken()
      const hasValidToken = tokenManager.hasValidToken()

      // Assert: 유효한 토큰 상태 확인
      expect(hasValidToken).toBe(true)
    })

    it('토큰이 없으면 false를 반환해야 한다', () => {
      // Act: 토큰 발급 없이 상태 확인
      const hasValidToken = tokenManager.hasValidToken()

      // Assert: 유효하지 않은 토큰 상태 확인
      expect(hasValidToken).toBe(false)
    })
  })

  describe('환경변수 검증 (Environment Validation)', () => {
    it('KIWOOM_APP_KEY가 없으면 에러를 던져야 한다', () => {
      // Arrange: 환경변수 삭제
      delete process.env.KIWOOM_APP_KEY
      delete process.env.KIWOOM_SECRET_KEY

      // Reset singleton instance
      ;(KiwoomTokenManager as any).instance = null

      // Act & Assert: 인스턴스 생성 시 에러 확인
      expect(() => KiwoomTokenManager.getInstance()).toThrow('KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY 환경변수가 필요합니다')

      // Cleanup: 환경변수 복구
      process.env.KIWOOM_APP_KEY = mockAppKey
      process.env.KIWOOM_SECRET_KEY = mockSecretKey
    })
  })

  describe('토큰 재시도 로직 (Retry Logic)', () => {
    it('토큰 발급 실패 시 최대 3번 재시도해야 한다', async () => {
      // Arrange: 첫 두 번은 실패, 세 번째는 성공
      vi.mocked(axios.post)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          data: {
            return_code: 0,
            token: mockAccessToken
          }
        })

      // Act: 토큰 요청
      const token = await tokenManager.getAccessToken()

      // Assert: 3번 시도 후 성공 확인
      expect(token).toBe(mockAccessToken)
      expect(axios.post).toHaveBeenCalledTimes(3)
    })

    it('3번 실패 시 최종 에러를 던져야 한다', async () => {
      // Arrange: 모든 요청 실패
      vi.mocked(axios.post).mockRejectedValue(new Error('Persistent failure'))

      // Act & Assert: 재시도 후 최종 에러 확인
      await expect(tokenManager.getAccessToken()).rejects.toThrow('Persistent failure')
      expect(axios.post).toHaveBeenCalledTimes(3)
    })
  })
})
