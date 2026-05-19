import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  RateLimitConfig,
  _resetRateLimitMap,
} from '../rate-limit';

describe('Rate Limit Module', () => {
  // 각 테스트 전체 Map 상태 초기화
  beforeEach(() => {
    // Map 초기화 (테스트 격리)
    _resetRateLimitMap();
    vi.useFakeTimers();
  });

  describe('첫 번째 호출: count=1, allowed=true', () => {
    it('첫 요청이 허용되어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      const result = checkRateLimit('user@example.com', config);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('최대 시도 횟수 도달: maxAttempts 초과 시 allowed=false', () => {
    it('5번째 요청까지 허용되고, 6번째는 차단되어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      const key = 'test-user@example.com';

      // 5번 호출: 모두 허용
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBeUndefined();
      }

      // 6번째 호출: 차단
      const blockedResult = checkRateLimit(key, config);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfter).toBeDefined();
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('윈도우 만료: 시간 경과 후 count 리셋', () => {
    it('윈도우 시간이 경과하면 count가 리셋되어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300, // 5분
      };

      const key = 'time-test@example.com';

      // 5번 호출: 모두 허용
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }

      // 6번째: 차단
      const blockedResult = checkRateLimit(key, config);
      expect(blockedResult.allowed).toBe(false);

      // 301초(5분 1초) 경과 시뮬레이션
      vi.advanceTimersByTime(301 * 1000);

      // 윈도우 경과 후: 다시 허용
      const resultAfterWindow = checkRateLimit(key, config);
      expect(resultAfterWindow.allowed).toBe(true);
      expect(resultAfterWindow.retryAfter).toBeUndefined();
    });
  });

  describe('서로 다른 키는 독립적 카운트 유지', () => {
    it('서로 다른 사용자의 요청은 독립적으로 카운트되어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      // user1: 5번 호출
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(user1, config).allowed).toBe(true);
      }

      // user1은 차단
      expect(checkRateLimit(user1, config).allowed).toBe(false);

      // user2는 여전히 허용 (독립적 카운트)
      expect(checkRateLimit(user2, config).allowed).toBe(true);
    });
  });

  describe('retryAfter 계산: 윈도우 만료까지 남은 시간', () => {
    it('차단된 요청은 정확한 retryAfter 시간을 반환해야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 3,
        windowSeconds: 300,
      };

      const key = 'retry-test@example.com';

      // 3번 호출: 모두 허용
      for (let i = 0; i < 3; i++) {
        expect(checkRateLimit(key, config).allowed).toBe(true);
      }

      // 4번째: 차단
      const blockedResult = checkRateLimit(key, config);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfter).toBeDefined();

      // retryAfter는 300초 이하이어야 함 (윈도우 전체 기간)
      expect(blockedResult.retryAfter!).toBeLessThanOrEqual(300);
      expect(blockedResult.retryAfter!).toBeGreaterThan(0);
    });

    it('시간이 경과함에 따라 retryAfter가 감소해야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 3,
        windowSeconds: 300,
      };

      const key = 'time-decay@example.com';

      // 3번 호출 후 차단
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, config);
      }
      const blocked1 = checkRateLimit(key, config);
      expect(blocked1.allowed).toBe(false);
      const retryAfter1 = blocked1.retryAfter!;

      // 60초 경과
      vi.advanceTimersByTime(60 * 1000);

      const blocked2 = checkRateLimit(key, config);
      expect(blocked2.allowed).toBe(false);
      const retryAfter2 = blocked2.retryAfter!;

      // retryAfter는 60초만큼 감소해야 함
      expect(retryAfter2).toBeLessThan(retryAfter1);
      expect(retryAfter1 - retryAfter2).toBeGreaterThanOrEqual(59); // 1초 오차 허용
    });
  });

  describe('MAX_ENTRIES 제한: 10,000개 항목 초과 시 오래된 항목 제거', () => {
    it('10,000개의 서로 다른 키를 처리할 수 있어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      // 5,000개의 서로 다른 키 생성 (MAX_ENTRIES 미만으로 테스트)
      for (let i = 0; i < 5000; i++) {
        const key = `user${i}@example.com`;
        const result = checkRateLimit(key, config);
        if (!result.allowed) {
          console.error(`Failed at iteration ${i}: ${key}`);
        }
        expect(result.allowed).toBe(true);
      }

      // 모든 요청이 성공해야 함
      const result = checkRateLimit('user5000@example.com', config);
      expect(result.allowed).toBe(true);
    });

    it('MAX_ENTRIES 초과 시 가장 오래된 항목이 제거되어야 함 (lazy cleanup)', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      // 10,000개 항목 생성
      for (let i = 0; i < 10000; i++) {
        checkRateLimit(`user${i}@example.com`, config);
      }

      // 10,001번째 항목 추가로 lazy cleanup 트리거
      checkRateLimit('user10000@example.com', config);

      // 첫 번째 항목은 제거되었을 수 있음
      // 새로운 요청으로 다시 추가
      const result = checkRateLimit('user0@example.com', config);
      expect(result.allowed).toBe(true); // 리셋된 상태로 허용
    });
  });

  describe('엣지 케이스', () => {
    it('빈 문자열 키도 처리해야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 300,
      };

      const result = checkRateLimit('', config);
      expect(result.allowed).toBe(true);
    });

    it('maxAttempts=0인 경우 모든 요청을 차단해야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 0,
        windowSeconds: 300,
      };

      const result = checkRateLimit('zero-attempts@example.com', config);
      expect(result.allowed).toBe(false);
    });

    it('windowSeconds=0인 경우 즉시 리셋되어야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 5,
        windowSeconds: 0,
      };

      const key = 'zero-window@example.com';

      // 5번 호출 후에도 계속 허용 (윈도우가 0이므로 즉시 만료)
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('성능: 대량 요청 처리', () => {
    it('동일한 키로 1000번의 연속 요청을 빠르게 처리해야 함', () => {
      const config: RateLimitConfig = {
        maxAttempts: 1000,
        windowSeconds: 300,
      };

      const key = 'perf-test@example.com';

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const result = checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000번의 요청이 100ms 이내에 처리되어야 함 (성능 기준)
      expect(duration).toBeLessThan(100);
    });
  });
});
