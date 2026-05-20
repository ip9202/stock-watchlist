/**
 * Rate Limit Module
 *
 * 로그인/회원가입 요청에 대한 속도 제한 구현
 * 메모리 내 Map 기반 인메모리 속도 제한 (Redis 없이)
 *
 * @MX:WARN 전역 Map 상태 변이 경고 - 비동기 환경에서 경합 조건 가능성
 * @MX:NOTE LOGIN_MAX_ATTEMPTS=5: 로그인 최대 시도 횟수 (5회)
 * @MX:NOTE LOGIN_WINDOW=300: 로그인 윈도우 기간 (300초 = 5분)
 * @MX:NOTE SIGNUP_MAX_ATTEMPTS=3: 회원가입 최대 시도 횟수 (3회)
 * @MX:NOTE SIGNUP_WINDOW=3600: 회원가입 윈도우 기간 (3600초 = 1시간)
 * @MX:NOTE MAX_ENTRIES=10000: Map 최대 항목 수 (lazy cleanup 트리거)
 */

// 상수 정의
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW = 300; // 5분
export const SIGNUP_MAX_ATTEMPTS = 3;
export const SIGNUP_WINDOW = 3600; // 1시간
export const MAX_ENTRIES = 10000;

/**
 * 속도 제한 설정
 */
export interface RateLimitConfig {
  maxAttempts: number; // 최대 시도 횟수
  windowSeconds: number; // 윈도우 기간 (초)
}

/**
 * 속도 제한 결과
 */
export interface RateLimitResult {
  allowed: boolean; // 요청 허용 여부
  retryAfter?: number; // 재시도 가능까지 남은 시간 (초)
}

/**
 * 속도 제한 항목 상태
 */
interface RateLimitEntry {
  count: number; // 현재 카운트
  windowStart: number; // 윈도우 시작 타임스탬프 (밀리초)
}

// 전역 Map: key -> RateLimitEntry
// @MX:WARN 전역 상태 변이
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Lazy cleanup: MAX_ENTRIES 초과 시 오래된 항목 제거
 *
 * @private
 */
function lazyCleanup(): void {
  if (rateLimitMap.size <= MAX_ENTRIES) {
    return;
  }

  const now = Date.now();
  const entriesToDelete: string[] = [];

  // 만료된 항목 수집 - SIGNUP_WINDOW(3600초)를 상한으로 사용하여 조기 삭제 방지
  const maxWindowMs = SIGNUP_WINDOW * 1000;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.windowStart + maxWindowMs) {
      entriesToDelete.push(key);
    }
  }

  // 만료된 항목 삭제
  for (const key of entriesToDelete) {
    rateLimitMap.delete(key);
  }

  // 여전히 MAX_ENTRIES 초과 시 가장 오래된 항목 제거
  if (rateLimitMap.size > MAX_ENTRIES) {
    const sortedEntries = Array.from(rateLimitMap.entries())
      .sort((a, b) => a[1].windowStart - b[1].windowStart);

    const deleteCount = rateLimitMap.size - MAX_ENTRIES;
    for (let i = 0; i < deleteCount; i++) {
      rateLimitMap.delete(sortedEntries[i][0]);
    }
  }
}

/**
 * 속도 제한 확인
 *
 * @param key - 식별 키 (이메일 등)
 * @param config - 속도 제한 설정
 * @returns 속도 제한 결과
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Lazy cleanup 실행
  lazyCleanup();

  // 엣지 케이스: maxAttempts=0인 경우 항상 차단
  if (config.maxAttempts <= 0) {
    return { allowed: false, retryAfter: 0 };
  }

  // 엣지 케이스: windowSeconds=0인 경우 항상 새 윈도우로 처리
  if (config.windowSeconds <= 0) {
    return { allowed: true };
  }

  // 기존 항목 조회
  const entry = rateLimitMap.get(key);

  // 항목이 없거나 윈도우가 만료된 경우
  if (!entry || now > entry.windowStart + windowMs) {
    // 새 윈도우 시작
    rateLimitMap.set(key, {
      count: 1,
      windowStart: now,
    });

    return { allowed: true };
  }

  // 윈도우 내 카운트 증가
  entry.count++;

  // 최대 시도 횟수 초과 여부 확인
  if (entry.count > config.maxAttempts) {
    // 재시도 가능까지 남은 시간 계산
    const windowEnd = entry.windowStart + windowMs;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);

    return {
      allowed: false,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  return { allowed: true };
}

/**
 * 테스트용 유틸리티: Map 초기화
 * (테스트에서만 사용)
 *
 * @internal
 */
export function _resetRateLimitMap(): void {
  rateLimitMap.clear();
}
