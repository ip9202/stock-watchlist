# SPEC-AUTH-002: 구현 계획

## 개요

SPEC-AUTH-001 인증 시스템에 대한 3가지 보안 강화를 단계적으로 구현한다. 각 단계는 독립적으로 배포 가능하며, 기존 220개 테스트의 회귀를 방지한다.

---

## 단계별 구현 전략

### 1단계: Rate Limiting (Priority: High)

**목표**: 로그인 및 회원가입 엔드포인트에 시도 횟수 제한 적용

**신규 파일**:
- `src/lib/rate-limit.ts` - Rate Limiting 유틸리티 모듈

**수정 파일**:
- `src/app/api/auth/signup/route.ts` - Rate Limit 체크 추가
- `src/lib/auth.ts` - `authorizeCredentials`에 Rate Limit 체크 추가
- `src/components/auth/LoginForm.tsx` - 429 응답 처리
- `src/components/auth/SignupForm.tsx` - 429 응답 처리

**테스트 파일**:
- `src/lib/__tests__/rate-limit.test.ts` - Rate Limiter 단위 테스트
- `src/lib/__tests__/auth.test.ts` - 기존 테스트에 Rate Limit 시나리오 추가
- `src/app/api/auth/signup/__tests__/route.test.ts` - Rate Limit 통합 테스트 추가

**기술 접근**:
- In-memory `Map<string, RateLimitEntry>` 구조
- 슬라이딩 윈도우 방식 (고정 윈도우 아님)
- `RateLimitEntry = { count: number, resetAt: number }`
- 키 전략: 로그인 = `login:{ip}:{email}`, 회원가입 = `signup:{ip}`
- 만료 엔트리 정리: 60초 간격 `setInterval`
- 최대 엔트리: 10,000개 (메모리 보호)

**IP 주소 획득**:
- Next.js API Route: `request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'`
- NextAuth authorize: `credentials` 객체에 IP 정보를 전달할 수 없으므로, Rate Limit 체크를 API 라우트 레벨에서 수행
- 대안: NextAuth 커스텀 authorize 래퍼에서 Request 객체 활용

**주의사항**:
- NextAuth Credentials Provider의 `authorize()` 함수는 Request 객체에 직접 접근할 수 없음
- Rate Limit 체크는 `src/app/api/auth/[...nextauth]/route.ts`의 핸들러 또는 미들웨어에서 수행해야 함
- 미들웨어에서 세밀한 Rate Limiting이 가능 (IP 접근 가능)

**구현 전략 수정**:
로그인 Rate Limit은 미들웨어(`src/middleware.ts`)에서 POST `/api/auth/callback/credentials` 요청을 가로채서 적용. 회원가입 Rate Limit은 signup route 핸들러에서 직접 적용.

---

### 2단계: 비밀번호 복잡성 강화 (Priority: High)

**목표**: 최소 12자, 3종류 문자 조합, zxcvbn 실시간 강도 평가

**신규 파일**:
- `src/lib/password-validator.ts` - 비밀번호 검증 모듈
- `src/components/auth/PasswordStrengthIndicator.tsx` - 강도 시각화 컴포넌트

**수정 파일**:
- `src/app/api/auth/signup/route.ts` - [DELTA] 8자→12자, 복잡성 검증 추가
- `src/components/auth/SignupForm.tsx` - [DELTA] 12자 placeholder, 강도 표시 컴포넌트 추가

**테스트 파일**:
- `src/lib/__tests__/password-validator.test.ts` - 비밀번호 검증 단위 테스트
- `src/components/auth/__tests__/PasswordStrengthIndicator.test.tsx` - UI 컴포넌트 테스트
- `src/app/api/auth/signup/__tests__/route.test.ts` - 복잡성 검증 통합 테스트 추가

**의존성 추가**:
```
npm install @zxcvbn-ts/core @zxcvbn-ts/language-common @zxcvbn-ts/language-en
```

**검증 규칙**:
1. 길이: `password.length >= 12`
2. 문자 종류 카운트:
   - 대문자: `/[A-Z]/` 테스트
   - 소문자: `/[a-z]/` 테스트
   - 숫자: `/[0-9]/` 테스트
   - 특수문자: `/[^A-Za-z0-9]/` 테스트
   - 종류 카운트 >= 3 필요
3. zxcvbn 점수: 0-4 스케일, 표시 목적 (차단 기준 아님)

---

### 3단계: 이메일 열거 방지 (Priority: High)

**목표**: 회원가입 시 중복 이메일 응답을 409→200으로 변경

**수정 파일**:
- `src/app/api/auth/signup/route.ts` - [DELTA] 409 응답 경로를 200 OK로 변경

**테스트 파일**:
- `src/app/api/auth/signup/__tests__/route.test.ts` - [DELTA] 기존 409 테스트를 200 테스트로 변경

**동작 변경 상세**:

기존 (SPEC-AUTH-001):
```
중복 이메일 → 409 Conflict → "이미 사용 중인 이메일입니다."
```

변경 (SPEC-AUTH-002):
```
중복 이메일 → 200 OK → { success: true, data: { email: "***@***.***" } }
→ 실제 계정 생성하지 않음
→ 서버 로그에 보안 이벤트 기록
→ 자동 로그인은 수행하지 않음 (클라이언트에서 signIn 호출 실패)
```

**클라이언트 영향**:
- SignupForm은 정상 응답을 받으므로 `signIn()` 호출 시도
- 하지만 실제 계정이 생성되지 않았으므로 로그인 실패
- "회원가입은 완료됐지만 로그인에 실패했습니다" 메시지 표시
- 또는 서버에서 마스킹된 응답으로 signIn 호출을 생략하도록 변경

**대안 검토**:
더 나은 UX를 위해 서버에서 "가입 완료" 응답만 보내고, 클라이언트는 항상 로그인 페이지로 이동하도록 변경. 중복 이메일이든 신규 가입이든 동일한 플로우: "가입이 완료되었습니다. 로그인해 주세요."

---

## 마일스톤

| 마일스톤 | 내용 | 우선순위 | 선행 조건 |
|----------|------|----------|-----------|
| M1 | Rate Limiting 유틸리티 구현 + 테스트 | High | 없음 |
| M2 | Rate Limiting 로그인/회원가입 적용 | High | M1 |
| M3 | 비밀번호 검증 모듈 구현 + 테스트 | High | 없음 (M1과 병렬 가능) |
| M4 | zxcvbn 통합 + UI 강도 표시 | High | M3 |
| M5 | 이메일 열거 방지 구현 + 테스트 | High | 없음 (M1, M3와 병렬 가능) |
| M6 | 전체 회귀 테스트 + 최종 검증 | High | M2, M4, M5 |

---

## 영향 받는 파일 상세 분석

### src/app/api/auth/signup/route.ts (3단계 모두 영향)

현재 구조:
```
POST handler
  ├─ 이메일 검증
  ├─ 비밀번호 길이 검증 (8자)
  ├─ 중복 이메일 체크 → 409 Conflict
  ├─ bcrypt 해싱
  └─ User 생성 → 201 Created
```

변경 후 구조:
```
POST handler
  ├─ [NEW] Rate Limit 체크 (IP 기반)
  ├─ 이메일 검증
  ├─ [DELTA] 비밀번호 길이 검증 (12자)
  ├─ [NEW] 비밀번호 복잡성 검증 (3/4 종류)
  ├─ [DELTA] 중복 이메일 체크 → 200 OK (기존: 409 Conflict)
  │   └─ 서버 로그 기록
  ├─ bcrypt 해싱
  └─ User 생성 → 201 Created
```

### src/middleware.ts (Rate Limit 로그인)

현재 구조:
```
middleware
  ├─ 공개 경로 판별
  ├─ 인증 사용자 → 공개 경로 접근 시 홈 리다이렉트
  └─ 미인증 사용자 → 보호 경로 접근 시 로그인 리다이렉트
```

변경 후 구조:
```
middleware
  ├─ [NEW] POST /api/auth/callback/credentials → 로그인 Rate Limit 체크
  ├─ 공개 경로 판별
  ├─ 인증 사용자 → 공개 경로 접근 시 홈 리다이렉트
  └─ 미인증 사용자 → 보호 경로 접근 시 로그인 리다이렉트
```

### src/components/auth/SignupForm.tsx (비밀번호 강도)

현재 구조:
```
SignupForm
  ├─ email, password, confirmPassword 상태
  ├─ 비밀번호 불일치 실시간 감지
  ├─ fetch POST /api/auth/signup
  └─ 자동 로그인 signIn()
```

변경 후 구조:
```
SignupForm
  ├─ email, password, confirmPassword 상태
  ├─ 비밀번호 불일치 실시간 감지
  ├─ [NEW] PasswordStrengthIndicator 컴포넌트 (zxcvbn)
  ├─ [DELTA] placeholder "비밀번호 입력 (12자 이상)"
  ├─ fetch POST /api/auth/signup
  ├─ [NEW] 429 응답 처리 (Rate Limit)
  └─ 자동 로그인 signIn()
```

### src/components/auth/LoginForm.tsx (Rate Limit)

현재 구조:
```
LoginForm
  ├─ email, password 상태
  ├─ signIn('credentials', { redirect: false })
  └─ 에러 메시지 표시
```

변경 후 구조:
```
LoginForm
  ├─ email, password 상태
  ├─ signIn('credentials', { redirect: false })
  ├─ [NEW] 429 응답 감지 (Rate Limit 초과 메시지)
  └─ 에러 메시지 표시
```

---

## 위험 및 완화 전략

### 위험 1: NextAuth authorize 함수에서 IP 접근 불가

**문제**: NextAuth v5 Credentials Provider의 `authorize()` 콜백은 Request 객체에 직접 접근할 수 없어 IP 기반 Rate Limiting을 적용할 수 없음.

**완화**: 로그인 Rate Limit 체크를 미들웨어(`src/middleware.ts`)에서 수행. POST `/api/auth/callback/credentials` 요청을 가로채서 IP 기반 카운터 체크 후 차단.

**대안**: NextAuth route handler(`src/app/api/auth/[...nextauth]/route.ts`)에서 커스텀 래퍼로 감싸서 Rate Limit 적용.

### 위험 2: 동일 NAT 뒤 다수 사용자

**문제**: 회사/학교 네트워크에서 동일 IP를 공유하는 사용자가 Rate Limit에 걸릴 수 있음.

**완화**: 로그인은 `IP+email` 조합으로 구분하므로 이메일이 다르면 영향 없음. 회원가입은 IP만 사용하므로 동시 가입 시 제한될 수 있으나, 3회/1시간은 합리적 한계.

### 위험 3: 이메일 열거 방지 UX

**문제**: 중복 이메일로 가입 시 200 응답 후 자동 로그인이 실패하면 사용자가 혼란스러울 수 있음.

**완화**: 서버에서 항상 "가입 처리 중" 응답을 보내고, 클라이언트를 로그인 페이지로 유도. 성공/중복 모두 동일한 UX 플로우 제공.

### 위험 4: Rate Limit 상태 손실 (PM2 재시작)

**문제**: PM2 재시작 또는 프로세스 충돌 시 in-memory Rate Limit 상태가 초기화됨.

**완화**: 단일 인스턴스 환경에서 재시작 빈도가 낮음. 재시작 직후 Rate Limit이 초기화되더라도 보안에 미치는 영향은 제한적 (공격자도 재시작 타이밍을 알기 어려움). 향후 Redis 기반으로 확장 가능한 인터페이스 설계.

---

## 테스트 전략

### 신규 테스트

| 모듈 | 테스트 케이스 수 | 주요 시나리오 |
|------|------------------|---------------|
| rate-limit.ts | ~15 | 카운터 증분, 한계 도달, 만료 정리, 최대 엔트리, 동시 요청 |
| password-validator.ts | ~15 | 길이 검증, 종류 카운트, 경계값, zxcvbn 점수 |
| PasswordStrengthIndicator.tsx | ~5 | 렌더링, 강도 레벨별 표시 |
| signup route (추가) | ~8 | Rate Limit, 200 응답, 복잡성 거부 |
| auth (추가) | ~4 | 미들웨어 Rate Limit 통합 |

**예상 신규 테스트**: ~47개
**예상 전체 테스트**: ~267개 (기존 220 + 신규 47)

### 회귀 테스트

- 기존 220개 테스트 전부 통과 필수
- 특히 auth.test.ts, signup route.test.ts, LoginForm.test.tsx, SignupForm.test.tsx 변경에 주의

---

## 배포 고려사항

1. **의존성 설치**: zxcvbn-ts 패키지 3개 추가 필요
2. **마이그레이션 없음**: Prisma 스키마 변경 없음
3. **환경 변수 없음**: Rate Limit 설정은 코드 내 상수로 관리
4. **빌드 영향**: 클라이언트 번들에 zxcvbn 추가 (약 50KB gzipped)
5. **배포 명령**: `./deploy/deploy.sh` (일반 배포, DB 마이그레이션 불필요)
