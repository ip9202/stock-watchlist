# SPEC-MASHUP-003 Implementation Plan

**Status**: Planning Complete
**Date**: 2026-04-17
**Methodology**: TDD (RED-GREEN-REFACTOR)
**Mode**: Solo (sub-agent)
**Estimated Context**: ~80K tokens
**Complexity Score**: 4/10 (Medium-Low)

---

## 1. Plan Summary

stock_auto FastAPI(14.49.182.30:8080)에서 제공하는 AI 매매 시그널을 stock_watchlist 대시보드에 표시하는 기능을 추가한다. 기존 프로젝트 패턴(Frankfurter API 클라이언트, MarketIndicators 컴포넌트, SWR 폴링)을 그대로 따라 일관성을 유지하며, 서버 사이드 프록시를 통해 외부 API를 호출하고 클라이언트는 basePath를 고려한 apiFetch()로 내부 프록시에 접근하는 구조다.

**핵심 접근**: Balanced Alternative (캐시 + 폴링 + 완전한 UI)
- 서버 사이드 프록시에 짧은 TTL 캐시 적용 (30초, market 패턴과 동일)
- SignalPanel은 SWR 기반 자동 갱신 (수동 새로고침 버튼 포함)
- 기존 StockCard/MarketIndicators UI 스타일 매칭
- 관심종목 패널 우측 배치 (모바일에서는 하단 이동)

---

## 2. Requirements Analysis

### REQ-001: API Client Module [P1 - MUST]
- **EARS**: When stock_watchlist가 stock_auto API를 호출할 때, 공통 HTTP 클라이언트를 통해 요청해야 한다.
- **File**: `src/lib/stock-auto/client.ts` (NEW)
- **Dependencies**: None
- **Key Decisions**:
  - env var `STOCK_AUTO_API_URL` (default: http://14.49.182.30:8080)
  - `fetchWithTimeout()` 패턴 (frankfurter-api.ts와 동일)
  - Graceful fallback: 에러 시 null 반환
  - 타임아웃: 5초 (AbortController)

### REQ-002: Signal Proxy API Routes [P1 - MUST]
- **EARS**: When 프론트엔드가 `/api/signals`를 호출할 때, 서버 사이드에서 stock_auto API를 프록시해야 한다.
- **Files**:
  - `src/app/api/signals/route.ts` (NEW) - 전체 시그널
  - `src/app/api/signals/[stockCode]/route.ts` (NEW) - 개별 종목
- **Dependencies**: REQ-001
- **Key Decisions**:
  - 서버 사이드이므로 native fetch() 직접 사용 (apiFetch 불필요)
  - 캐시 TTL: 30초 (시장 지수와 동일한 갱신 주기)
  - 에러 시 빈 배열 반환 (프론트엔드에서 empty state 처리)
  - ApiResponse 래퍼 사용 (기존 routes와 일관성)

### REQ-003: Signal Card Component [P1 - MUST]
- **EARS**: When 사용자가 대시보드를 볼 때, AI 시그널 카드를 확인할 수 있어야 한다.
- **File**: `src/components/signals/SignalCard.tsx` (NEW)
- **Dependencies**: REQ-001 (types only)
- **Key Decisions**:
  - BUY=초록(#22c55e), SELL=빨강(#ef4444), HOLD=회색(#6b7280) - 한국 주식 색상 규칙과 다름 (AI 시그널은 국제 표준)
  - Score를 시각적 게이지로 표시 (0.0~1.0, 색상 그라데이션)
  - 주요 지표를 badge 형태로 표시 (supertrend, rsi, macd)
  - StockCard와 유사한 Card 레이아웃 (tailwind class 재사용)

### REQ-004: Signal Panel Component [P1 - MUST]
- **EARS**: When 시그널 패널이 표시될 때, 시그널 카드 리스트를 볼 수 있어야 한다.
- **File**: `src/components/signals/SignalPanel.tsx` (NEW)
- **Dependencies**: REQ-003
- **Key Decisions**:
  - SWR + refreshInterval로 자동 갱신 (60초 간격)
  - Loading skeleton (MarketIndicators 패턴과 동일)
  - Empty state: "아직 생성된 시그널이 없습니다"
  - Error state: "AI 시그널 서비스에 연결할 수 없습니다"
  - 수동 새로고침 버튼 (RefreshCw 아이콘)

### REQ-005: Dashboard Integration [P1 - MUST]
- **EARS**: When 사용자가 메인 대시보드를 볼 때, 시그널 패널이 관심종목 옆에 표시되어야 한다.
- **File**: `src/app/page.tsx` (MODIFY)
- **Dependencies**: REQ-004
- **Key Decisions**:
  - MarketIndicators 하단, 검색 섹션 상단에 배치
  - desktop: 전체 폭 카드 (시그널 리스트는 가로 스크롤 또는 grid)
  - mobile: 전체 폭, 세로 스택
  - 기존 레이아웃 변경 최소화

### Non-Functional Requirements:
- **NFR-001**: stock_auto 장애 시 기존 기능 영향 없음
- **NFR-002**: 5초 타임아웃으로 대시보드 로딩 지연 방지
- **NFR-003**: 캐시로 중복 API 호출 방지
- **NFR-004**: Vitest 테스트 85%+ 커버리지

---

## 3. Success Criteria

| # | Criteria | Verification Method |
|---|----------|-------------------|
| 1 | `GET /api/signals` 응답 성공 | curl 또는 Vitest 테스트 |
| 2 | `GET /api/signals/005930` 개별 종목 응답 성공 | curl 또는 Vitest 테스트 |
| 3 | SignalCard에 종목명/타입/점수/지표 표시 | 컴포넌트 렌더링 테스트 |
| 4 | BUY=초록, SELL=빨강, HOLD=회색 색상 | CSS class 검증 테스트 |
| 5 | stock_auto 장애 시 빈 응답 + 에러 상태 UI | Mock 에러 테스트 |
| 6 | 기존 133개 테스트 모두 통과 | `npm run test:run` |
| 7 | 새 테스트 커버리지 85%+ | `npm run test:coverage` |
| 8 | 모바일 반응형 레이아웃 동작 | 브라우저 확인 |
| 9 | 대시보드 로딩 시간 5초 이내 | 런타임 측정 |

---

## 4. TAG Chain Design

```
TAG-1: Types & Client (REQ-001)
  │
  ├──→ TAG-2: Proxy Routes (REQ-002) [서버 사이드]
  │
  └──→ TAG-3: SignalCard Component (REQ-003) [UI]
         │
         └──→ TAG-4: SignalPanel Component (REQ-004) [UI]
                │
                └──→ TAG-5: Dashboard Integration (REQ-005) [레이아웃]
```

**병렬 가능 지점**: TAG-2와 TAG-3은 TAG-1에만 의존하므로 병렬 실행 가능.

**완료 기준 (per TAG)**:
- TAG-1: fetchSignals/fetchSignalByCode 단위 테스트 통과
- TAG-2: 프록시 라우트 통합 테스트 통과
- TAG-3: SignalCard 스냅샷/렌더링 테스트 통과
- TAG-4: SignalPanel 상태별 렌더링 테스트 통과
- TAG-5: 전체 대시보드 렌더링 + 기존 테스트 회귀 없음

---

## 5. Task Decomposition

### Task 1: Types + API Client Module
- **ID**: T1
- **REQ**: REQ-001
- **Dependencies**: None
- **Files**:
  - NEW: `src/lib/stock-auto/client.ts`
  - NEW: `src/lib/stock-auto/__tests__/client.test.ts`
- **TDD Cycle**:
  - RED: fetchSignals 성공/실패/타임아웃 테스트 작성
  - GREEN: client.ts 구현 (fetchWithTimeout, env var, null fallback)
  - REFACTOR: 타임아웃 상수 추출, 타입 정의 정리
- **Acceptance**: fetchSignals() mock 테스트 3개 통과

### Task 2: Proxy API Route - List
- **ID**: T2
- **REQ**: REQ-002 (list)
- **Dependencies**: T1
- **Files**:
  - NEW: `src/app/api/signals/route.ts`
  - NEW: `src/app/api/signals/__tests__/route.test.ts`
- **TDD Cycle**:
  - RED: GET /api/signals 성공/에러/캐시 히트 테스트
  - GREEN: route.ts 구현 (fetchSignals 호출, 캐시, 에러 핸들링)
  - REFACTOR: 응답 포맷 공통화
- **Acceptance**: 라우트 테스트 3개 통과

### Task 3: Proxy API Route - Individual
- **ID**: T3
- **REQ**: REQ-002 (individual)
- **Dependencies**: T1
- **Files**:
  - NEW: `src/app/api/signals/[stockCode]/route.ts`
- **TDD Cycle**:
  - RED: GET /api/signals/005930 성공/에러 테스트
  - GREEN: [stockCode] 라우트 구현
  - REFACTOR: list 라우트와 응답 포맷 통일
- **Acceptance**: 개별 종목 라우트 테스트 2개 통과

### Task 4: SignalCard Component
- **ID**: T4
- **REQ**: REQ-003
- **Dependencies**: T1 (types)
- **Files**:
  - NEW: `src/components/signals/SignalCard.tsx`
- **TDD Cycle**:
  - RED: BUY/SELL/HOLD 카드 렌더링 + 색상 검증 테스트
  - GREEN: SignalCard 구현 (signal_type 색상 매핑, score 게이지, indicator badges)
  - REFACTOR: 색상 매핑 유틸 분리 검토
- **Acceptance**: BUY=초록, SELL=빨강, HOLD=회색 렌더링 확인

### Task 5: SignalPanel Component
- **ID**: T5
- **REQ**: REQ-004
- **Dependencies**: T4
- **Files**:
  - NEW: `src/components/signals/SignalPanel.tsx`
- **TDD Cycle**:
  - RED: loading/empty/error/data 상태 렌더링 테스트
  - GREEN: SignalPanel 구현 (SWR fetch, 상태별 UI, 새로고침 버튼)
  - REFACTOR: 조건부 렌더링 정리
- **Acceptance**: 4가지 상태 렌더링 테스트 통과

### Task 6: Dashboard Integration
- **ID**: T6
- **REQ**: REQ-005
- **Dependencies**: T5
- **Files**:
  - MODIFY: `src/app/page.tsx`
- **TDD Cycle**:
  - RED: SignalPanel이 대시보드에 포함되는지 확인
  - GREEN: SignalPanel import 및 레이아웃 추가
  - REFACTOR: 간격 및 반응형 조정
- **Acceptance**: 대시보드 렌더링 + 기존 133개 테스트 회귀 없음

---

## 6. Planned Files

| File | Action | Type | Est. LOC |
|------|--------|------|----------|
| `src/lib/stock-auto/client.ts` | NEW | API Client | ~60 |
| `src/lib/stock-auto/__tests__/client.test.ts` | NEW | Test | ~80 |
| `src/app/api/signals/route.ts` | NEW | API Route | ~50 |
| `src/app/api/signals/__tests__/route.test.ts` | NEW | Test | ~70 |
| `src/app/api/signals/[stockCode]/route.ts` | NEW | API Route | ~45 |
| `src/components/signals/SignalCard.tsx` | NEW | Component | ~120 |
| `src/components/signals/SignalPanel.tsx` | NEW | Component | ~100 |
| `src/app/page.tsx` | MODIFY | Page | ~10 changes |
| **Total** | | | **~535** |

---

## 7. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| HTTP Client | Native fetch + AbortController | frankfurter-api.ts 패턴과 동일 |
| Timeout | AbortController (5초) | 기존 fetchWithTimeout 패턴 재사용 |
| Cache | In-memory cache (src/lib/cache.ts) | 기존 캐시 인프라 재사용, TTL 30초 |
| Client Data Fetching | SWR (useSWR) | MarketIndicators 패턴과 동일 |
| UI Framework | Tailwind CSS + shadcn/ui Card | 기존 StockCard/MarketIndicators와 일치 |
| Testing | Vitest + vi.mock | 기존 테스트 인프라 |
| Types | TypeScript strict | 프로젝트 표준 |

**새로운 라이브러리 불필요** - 모든 기존 의존성으로 구현 가능.

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| stock_auto API 응답 불가 | MEDIUM | LOW | TDD with mocks; graceful fallback |
| API 응답 스키마 불일치 | LOW-MEDIUM | MEDIUM | optional chaining; 런타임 검증 |
| 대시보드 레이아웃 깨짐 | LOW | MEDIUM | 반응형 grid; 기존 테스트로 회귀 방지 |
| 캐시로 인한 stale data | LOW | LOW | 30초 TTL; 수동 새로고침 버튼 |
| 네트워크 타임아웃 | MEDIUM | LOW | 5초 AbortController; null fallback |

---

## 9. Approval Points

구현 시작 전 사용자 확인이 필요한 결정 사항:

1. **시그널 색상**: BUY=초록, SELL=빨강 (국제 표준) vs 한국 주식 색상 (상승=빨강, 하락=파랑)
2. **레이아웃 위치**: MarketIndicators 하단 vs WatchlistManager 하단
3. **자동 폴링**: 60초 간격 자동 갱신 vs 수동 새로고침만
4. **캐시 TTL**: 30초 (시장 지수와 동일) vs 다른 값

---

## 10. Handover Notes

구현 담당자(manager-tdd)에게 전달할 핵심 정보:

- **참조 파일**: frankfurter-api.ts (클라이언트), market/route.ts (라우트), MarketIndicators.tsx (SWR+UI)
- **basePath 주의**: 클라이언트 컴포넌트에서는 반드시 apiFetch() 사용, 서버 라우트에서는 native fetch()
- **캐시 모듈**: src/lib/cache.ts의 get/set 메서드 사용 (TTL 초 단위)
- **응답 래퍼**: ApiResponse 타입 (src/types/api.ts) 사용
- **테스트 패턴**: vi.mock으로 클라이언트 모듈 모킹 → route handler 직접 호출
- **환경변수**: STOCK_AUTO_API_URL을 .env.local에 추가 필요 (선택)
