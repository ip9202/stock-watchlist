import { describe, it, expect } from 'vitest';
import {
  validatePasswordLength,
  validatePasswordComplexity,
  evaluatePasswordStrength,
} from '../password-validator';

describe('Password Validator Module', () => {
  describe('validatePasswordLength: 길이 검증', () => {
    it('길이 < 12: 거부되어야 함', () => {
      expect(validatePasswordLength('Short1!')).toBe(false);
      expect(validatePasswordLength('Short11')).toBe(false);
      expect(validatePasswordLength('')).toBe(false);
    });

    it('길이 === 12: 허용되어야 함', () => {
      expect(validatePasswordLength('Password123!')).toBe(true);
      expect(validatePasswordLength('1234567890ab')).toBe(true);
    });

    it('길이 > 12: 허용되어야 함', () => {
      expect(validatePasswordLength('LongPassword123!')).toBe(true);
      expect(validatePasswordLength('a'.repeat(20))).toBe(true);
    });

    it('사용자 정의 minLength 적용', () => {
      expect(validatePasswordLength('Short1!', 8)).toBe(false);  // 7 chars < 8
      expect(validatePasswordLength('Short1!', 10)).toBe(false);  // 7 chars < 10
      expect(validatePasswordLength('Short123!', 8)).toBe(true);  // 9 chars >= 8
    });
  });

  describe('validatePasswordComplexity: 복잡성 검증', () => {
    it('2가지 문자 유형: 거부 (missing 배열 populate)', () => {
      const result = validatePasswordComplexity('password123'); // 소문자 + 숫자
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('대문자');
      expect(result.missing).toContain('특수문자');
    });

    it('3가지 문자 유형: 허용', () => {
      const result1 = validatePasswordComplexity('Password123'); // 대문자 + 소문자 + 숫자
      expect(result1.valid).toBe(true);
      expect(result1.missing).toEqual([]);

      const result2 = validatePasswordComplexity('Password!'); // 대문자 + 소문자 + 특수문자
      expect(result2.valid).toBe(true);
      expect(result2.missing).toEqual([]);
    });

    it('4가지 문자 유형: 허용', () => {
      const result = validatePasswordComplexity('Password123!');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('빈 문자열: 모든 유형 missing', () => {
      const result = validatePasswordComplexity('');
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBe(4);
      expect(result.missing).toContain('대문자');
      expect(result.missing).toContain('소문자');
      expect(result.missing).toContain('숫자');
      expect(result.missing).toContain('특수문자');
    });

    it('한글 유니코드 지원', () => {
      const result = validatePasswordComplexity('Password한글123!');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('공백 포함 허용', () => {
      const result = validatePasswordComplexity('Pass word 123!');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('100자 긴 비밀번호: 복잡성 검증 통과', () => {
      const longPassword = 'A' + 'a'.repeat(48) + '1' + '!' + '0'.repeat(48);
      const result = validatePasswordComplexity(longPassword);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('evaluatePasswordStrength: zxcvbn 기반 강도 평가', () => {
    it('약한 비밀번호 (score 0-1)', () => {
      const weak1 = evaluatePasswordStrength('pass'); // 4자
      expect(weak1.score).toBeLessThanOrEqual(1);

      const weak2 = evaluatePasswordStrength('123456'); // 6자
      expect(weak2.score).toBeLessThanOrEqual(1);

      const weak3 = evaluatePasswordStrength('qwerty'); // 6자
      expect(weak3.score).toBeLessThanOrEqual(1);
    });

    it('강한 비밀번호 (score 3+)', () => {
      const strong = evaluatePasswordStrength('Tr0ub4dor&3');
      expect(strong.score).toBeGreaterThanOrEqual(3);
      expect(strong.feedback).toBeDefined();
    });

    it('매우 강한 비밀번호 (score 4)', () => {
      const veryStrong = evaluatePasswordStrength('Correct-Horse-Battery-Staple-123!');
      expect(veryStrong.score).toBe(4);
      expect(veryStrong.feedback).toBeDefined();
    });

    it('빈 문자열: score 0', () => {
      const result = evaluatePasswordStrength('');
      expect(result.score).toBe(0);
      expect(result.feedback).toBeDefined();
    });

    it('한글 비밀번호: 평가 가능', () => {
      const result = evaluatePasswordStrength('비밀번호1234!');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.feedback).toBeDefined();
    });

    it('긴 비밀번호 (100자): 평가 가능', () => {
      const longPassword = 'A' + 'a'.repeat(48) + '1' + '!' + '0'.repeat(48);
      const result = evaluatePasswordStrength(longPassword);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(4);
    });

    it('feedback 문자열이 meaningful 해야 함', () => {
      const weak = evaluatePasswordStrength('password');
      expect(weak.feedback.length).toBeGreaterThan(0);
      expect(weak.feedback).not.toBe('');
    });
  });

  describe('엣지 케이스', () => {
    it('NULL 문자 포함 (예외처리)', () => {
      const result = validatePasswordComplexity('Pass\x00word123!');
      // null 문자는 특수문자로 간주하지 않아야 함
      expect(result.valid).toBe(true);
    });

    it('이모지 포함 (유니코드)', () => {
      const result = validatePasswordComplexity('Password🔥123!');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('반복되는 문자만 포함', () => {
      const result = evaluatePasswordStrength('aaaaaaaaaaaa');
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('통합 검증: 길이 + 복잡성 + 강도', () => {
    it('좋은 비밀번호 예시', () => {
      const password = 'SecurePassword123!';
      const length = validatePasswordLength(password);
      const complexity = validatePasswordComplexity(password);
      const strength = evaluatePasswordStrength(password);

      expect(length).toBe(true);
      expect(complexity.valid).toBe(true);
      expect(strength.score).toBeGreaterThanOrEqual(3);
    });

    it('나쁜 비밀번호 예시', () => {
      const password = 'pass'; // 4자, 소문자만
      const length = validatePasswordLength(password);
      const complexity = validatePasswordComplexity(password);
      const strength = evaluatePasswordStrength(password);

      expect(length).toBe(false);
      expect(complexity.valid).toBe(false);
      expect(strength.score).toBeLessThanOrEqual(1);
    });
  });
});
