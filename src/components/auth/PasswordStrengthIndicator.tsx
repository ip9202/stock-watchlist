'use client';

import { evaluatePasswordStrength } from '@/lib/password-validator';

/**
 * 비밀번호 강도 표시기 컴포넌트
 *
 * zxcvbn 기반 실시간 강도 평가 결과를 시각화
 *
 * @param password - 평가할 비밀번호 문자열
 * @returns 비밀번호가 비어있으면 null, 아니면 강도 표시 UI
 */
interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps): React.ReactElement | null {
  // 빈 비밀번호면 아무것도 렌더링하지 않음
  if (!password) {
    return null;
  }

  const { score } = evaluatePasswordStrength(password);

  // 점수에 따른 텍스트, 색상, 너비 매핑
  const getStrengthConfig = (score: number) => {
    switch (score) {
      case 0:
        return {
          text: '매우 약함',
          colorClass: 'text-red-600',
          barColorClass: 'bg-red-600',
          width: '20%',
        };
      case 1:
        return {
          text: '약함',
          colorClass: 'text-red-500',
          barColorClass: 'bg-red-500',
          width: '40%',
        };
      case 2:
        return {
          text: '보통',
          colorClass: 'text-yellow-500',
          barColorClass: 'bg-yellow-500',
          width: '60%',
        };
      case 3:
        return {
          text: '강함',
          colorClass: 'text-green-500',
          barColorClass: 'bg-green-500',
          width: '80%',
        };
      case 4:
        return {
          text: '매우 강함',
          colorClass: 'text-green-600',
          barColorClass: 'bg-green-600',
          width: '100%',
        };
      default:
        return {
          text: '알 수 없음',
          colorClass: 'text-gray-500',
          barColorClass: 'bg-gray-500',
          width: '0%',
        };
    }
  };

  const config = getStrengthConfig(score);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">암호 강도:</span>
        <span className={`font-semibold ${config.colorClass}`}>{config.text}</span>
      </div>

      {/* 강도 바 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          data-testid="strength-bar"
          className={`${config.barColorClass} h-2 rounded-full transition-all duration-300`}
          style={{ width: config.width }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-label={`비밀번호 강도: ${config.text}`}
        />
      </div>
    </div>
  );
}
