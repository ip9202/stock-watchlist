/**
 * 키움증권 REST API 토큰 관리자
 * REQ-001: 토큰 관리 (Ubiquitous)
 *
 * OAuth2 Bearer Token 발급, 캐싱, 자동 갱신 담당
 */

import axios from 'axios'

// @MX:ANCHOR: 토큰 관리 싱글톤 인스턴스 - 모든 API 호출에서 공유 사용
// @MX:REASON: REQ-001 - 단일 공유 토큰 인스턴스 요구사항

// 상수 정의
const TOKEN_REFRESH_MARGIN = 5 * 60 * 1000 // 5분 (토큰 만료 전 갱신 마진)
const DEFAULT_TOKEN_EXPIRY = 86400 // 24시간 (초)
const REQUEST_TIMEOUT = 10000 // 10초
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000 // 1초

export interface TokenResponse {
  return_code: number
  token?: string
  return_msg?: string
  expires_in?: number
}

export class KiwoomTokenManager {
  private static instance: KiwoomTokenManager | null = null
  private accessToken: string | null = null
  private tokenExpiresAt: number | null = null
  private readonly appKey: string
  private readonly secretKey: string
  private readonly tokenUrl = 'https://api.kiwoom.com/oauth2/token'

  private constructor() {
    // 환경변수 검증
    this.appKey = process.env.KIWOOM_APP_KEY || ''
    this.secretKey = process.env.KIWOOM_SECRET_KEY || ''

    if (!this.appKey || !this.secretKey) {
      throw new Error('KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY 환경변수가 필요합니다')
    }
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): KiwoomTokenManager {
    if (!KiwoomTokenManager.instance) {
      KiwoomTokenManager.instance = new KiwoomTokenManager()
    }
    return KiwoomTokenManager.instance
  }

  /**
   * 접근 토큰 발급 (REQ-001)
   * 캐시된 토큰이 있으면 재사용, 만료되었으면 갱신
   */
  async getAccessToken(): Promise<string> {
    // 캐시된 토큰이 유효한지 확인
    if (this.isTokenValid()) {
      return this.accessToken!
    }

    // 새 토큰 발급 (재시도 로직 포함)
    return this.fetchTokenWithRetry()
  }

  /**
   * 토큰 유효성 확인
   */
  hasValidToken(): boolean {
    return this.isTokenValid()
  }

  /**
   * 토큰 무효화 (테스트용)
   */
  invalidateToken(): void {
    this.accessToken = null
    this.tokenExpiresAt = null
  }

  /**
   * 캐시된 토큰이 유효한지 확인
   */
  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false
    }

    // 현재 시간이 만료 시간 이전인지 확인 (마진 추가)
    const now = Date.now()
    const expiryWithMargin = this.tokenExpiresAt - TOKEN_REFRESH_MARGIN
    return now < expiryWithMargin
  }

  /**
   * 재시도 로직과 함께 토큰 발급
   */
  private async fetchTokenWithRetry(retryCount = 0): Promise<string> {
    try {
      const token = await this.fetchToken()
      return token
    } catch (error) {
      // 최대 재시도 횟수 확인
      if (retryCount < MAX_RETRIES - 1) {
        // 지연 후 재시도 (지수 백오프)
        await this.delay(BASE_RETRY_DELAY * (retryCount + 1))
        return this.fetchTokenWithRetry(retryCount + 1)
      }

      // 최종 실패 시 에러 전파
      if (error instanceof Error) {
        throw error
      }
      throw new Error('알 수 없는 에러가 발생했습니다')
    }
  }

  /**
   * 키움 REST API에서 토큰 발급
   */
  private async fetchToken(): Promise<string> {
    try {
      const response = await axios.post<TokenResponse>(
        this.tokenUrl,
        {
          grant_type: 'client_credentials',
          appkey: this.appKey,
          secretkey: this.secretKey
        },
        {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8'
          },
          timeout: REQUEST_TIMEOUT
        }
      )

      const result = response.data

      // 응답 코드 확인
      if (result.return_code !== 0) {
        throw new Error(`토큰 발급 실패: ${result.return_msg || '알 수 없는 에러'}`)
      }

      // 토큰 저장
      if (!result.token) {
        throw new Error('토큰 응답에 token 필드가 없습니다')
      }

      this.accessToken = result.token

      // 만료 시간 설정 (expires_in이 없으면 기본값 사용)
      const expiresIn = result.expires_in ?? DEFAULT_TOKEN_EXPIRY
      this.tokenExpiresAt = Date.now() + expiresIn * 1000

      return this.accessToken
    } catch (error) {
      // 에러 전파
      if (error instanceof Error) {
        throw error
      }
      throw new Error('알 수 없는 에러가 발생했습니다')
    }
  }

  /**
   * 지연 함수 (재시도용)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 싱글톤 인스턴스 내보내기 (lazy initialization)
export default KiwoomTokenManager
