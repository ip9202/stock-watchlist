/**
 * Password Validator Module
 *
 * 비밀번호 길이, 복잡성, 강도 검증 기능
 * zxcvbn-ts 라이브러리 사용하여 비밀번호 강도 평가
 *
 * @MX:NOTE MIN_PASSWORD_LENGTH=12: 최소 비밀번호 길이 (12자)
 * @MX:NOTE REQUIRED_CHAR_TYPES=3: 필수 문자 유형 개수 (3가지)
 */

import { zxcvbn, ZxcvbnResult } from '@zxcvbn-ts/core';

// 상수 정의
export const MIN_PASSWORD_LENGTH = 12;
export const REQUIRED_CHAR_TYPES = 3;

/**
 * 비밀번호 길이 검증
 *
 * @param password - 검증할 비밀번호
 * @param minLength - 최소 길이 (기본값: 12)
 * @returns 길이가 충분하면 true, 아니면 false
 */
export function validatePasswordLength(
  password: string,
  minLength: number = MIN_PASSWORD_LENGTH
): boolean {
  return password.length >= minLength;
}

/**
 * 비밀번호 복잡성 검증 결과
 */
export interface ComplexityResult {
  valid: boolean; // 복잡성 기준 충족 여부
  missing: string[]; // 누락된 문자 유형 목록
}

/**
 * 비밀번호 복잡성 검증
 *
 * 4가지 문자 유형 중 최소 3가지 포함:
 * - 대문자 (A-Z)
 * - 소문자 (a-z)
 * - 숫자 (0-9)
 * - 특수문자 (!@#$%^&* 등)
 *
 * @param password - 검증할 비밀번호
 * @returns 복잡성 검증 결과
 */
export function validatePasswordComplexity(
  password: string
): ComplexityResult {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const presentCount = [hasUppercase, hasLowercase, hasDigit, hasSpecial]
    .filter(Boolean)
    .length;

  const valid = presentCount >= REQUIRED_CHAR_TYPES;

  // 유효하면 missing 배열 비어있게
  if (valid) {
    return { valid, missing: [] };
  }

  // 유효하지 않으면 missing 목록 제공
  const missing: string[] = [];
  if (!hasUppercase) missing.push('대문자');
  if (!hasLowercase) missing.push('소문자');
  if (!hasDigit) missing.push('숫자');
  if (!hasSpecial) missing.push('특수문자');

  return { valid, missing };
}

/**
 * 비밀번호 강도 평가 결과
 */
export interface StrengthResult {
  score: number; // 강도 점수 (0-4, 4가 최상)
  feedback: string; // 피드백 메시지
}

/**
 * zxcvbn을 사용한 비밀번호 강도 평가
 *
 * @param password - 평가할 비밀번호
 * @returns 강도 평가 결과
 */
export function evaluatePasswordStrength(
  password: string
): StrengthResult {
  // 빈 비밀번호 처리
  if (password.length === 0) {
    return {
      score: 0,
      feedback: '비밀번호를 입력해주세요.',
    };
  }

  // zxcvbn 실행 (기본 설정 사용)
  const result: ZxcvbnResult = zxcvbn(password);

  // 점수는 0-4 범위
  const score = Math.min(Math.max(result.score, 0), 4);

  // 피드백 메시지 생성
  let feedback = '';
  if (score <= 1) {
    feedback = '비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.';
  } else if (score === 2) {
    feedback = '비밀번호가 약합니다. 숫자, 특수문자를 조합해보세요.';
  } else if (score === 3) {
    feedback = '비밀번호가 적당합니다.';
  } else {
    feedback = '강력한 비밀번호입니다.';
  }

  // zxcvbn 피드백이 있으면 추가
  if (result.feedback.warning && result.feedback.warning.length > 0) {
    feedback += ` ${result.feedback.warning}`;
  }
  if (result.feedback.suggestions && result.feedback.suggestions.length > 0) {
    feedback += ` ${result.feedback.suggestions[0]}`;
  }

  return { score, feedback: feedback.trim() };
}

/**
 * 통합 비밀번호 검증
 *
 * 길이, 복잡성, 강도를 모두 검증하여 종합 결과 반환
 *
 * @param password - 검증할 비밀번호
 * @returns 종합 검증 결과
 */
export interface ValidationResult {
  lengthValid: boolean;
  complexityValid: boolean;
  strengthScore: number;
  strengthFeedback: string;
  overallValid: boolean;
}

export function validatePassword(password: string): ValidationResult {
  const lengthValid = validatePasswordLength(password);
  const complexityResult = validatePasswordComplexity(password);
  const strengthResult = evaluatePasswordStrength(password);

  const overallValid =
    lengthValid && complexityResult.valid && strengthResult.score >= 2;

  return {
    lengthValid,
    complexityValid: complexityResult.valid,
    strengthScore: strengthResult.score,
    strengthFeedback: strengthResult.feedback,
    overallValid,
  };
}
