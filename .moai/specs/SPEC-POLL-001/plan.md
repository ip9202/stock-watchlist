# SPEC-POLL-001 구현 계획: 주기적 데이터 폴링 시스템

## 접근 방식: 프론트엔드 SWR 폴링 + 장시간 감지

### 선택 이유
- 개인/소수 사용자 대상 관심종목 대시보드
- 서버 스케줄링(additional infra) 없이 구현 가능
- 키움 API 100회/분 한도 내 안전 운영
- 기존 SWR 사용 패턴과 일관성

### 아키텍처 개요

```
┌─────────────────────────────────────────────┐
│  Frontend (SWR + market-hours)              │
│  - 데이터 유형별 refreshInterval            │
│  - 장시간 감지 → 동적 인터벌 조정           │
│  - 배치 조회로 API 호출 최적화              │
└──────────────┬──────────────────────────────┘
               │ fetch (SWR)
               ▼
┌─────────────────────────────────────────────┐
│  API Routes (Next.js)                       │
│  - 서버 캐시 TTL ≤ 클라이언트 인터벌        │
│  - 배치 종목 조회 엔드포인트                │
└──────────────┬──────────────────────────────┘
               │ REST
               ▼
┌─────────────────────────────────────────────┐
│  Kiwoom API (100회/분 제한)                 │
└─────────────────────────────────────────────┘
```

---

## 작업 분해

### Task 1: 장시간 감지 유틸리티 (NEW)
**파일**: `src/lib/market-hours.ts`
- `getMarketState()`: 장 상태 반환 (open/pre-market/post-market/closed)
- `getPollingInterval(dataType)`: 장 상태 기반 동적 인터벌 반환
- 주말/공휴일 감지
- 테스트: 장시간별 인터벌 반환 검증

### Task 2: 폴링 설정 상수 (MODIFY)
**파일**: `src/lib/cache.ts`
- 서버 캐시 TTL 조정 (클라이언트 인터벌과 정합성)
- 주가 TTL: 30초 → 15초
- 지수 TTL: 60초 → 30초
- 장시간 기반 TTL 동적 반환 함수 추가

### Task 3: 배치 종목 조회 API (NEW)
**파일**: `src/app/api/stocks/batch/route.ts`
- POST: 심볼 배열 → 일괄 주가 조회
- 키움 API ka10099 (종목별현재가) 활용 또는 병렬 개별 조회
- 배치 결과 캐싱
- 테스트: 배치 조회, 캐시 동작

### Task 4: SWR 폴링 훅 (NEW)
**파일**: `src/hooks/usePollingData.ts`
- `usePollingData(dataType, fetcher)` 커스텀 훅
- 장시간 감지 + 데이터 유형별 동적 인터벌
- SWR refreshInterval과 통합
- 장외 시간 폴링 일시정지/재개
- 테스트: 인터벌 변화, 폴링 정지/재개

### Task 5: 기존 컴포넌트 폴링 전환 (MODIFY)
**파일**: `src/components/dashboard/StockCard.tsx`
- setInterval → usePollingData 훅으로 전환
**파일**: `src/components/dashboard/MarketIndicators.tsx`
- SWR refreshInterval 추가 (usePollingData 활용)
**파일**: 차트 컴포넌트들
- 차트 타입별 동적 인터벌 적용

### Task 6: 폴링 설정 UI (OPTIONAL)
**파일**: `src/components/dashboard/PollingSettings.tsx`
- 폴링 활성/비활성 토글
- 장 상태 표시 (개장/폐장)
- 수동 새로고침 버튼

---

## 데이터 유형별 최종 폴링 인터벌

| 데이터 | 장중 | 장외 | 주말 | 서버 TTL |
|--------|------|------|------|----------|
| 주가 현재가 | 15초 | 5분 | 중지 | 15초 |
| 시장 지수 | 30초 | 5분 | 중지 | 30초 |
| 분봉 차트 | 1분 | 30분 | 중지 | 5분 |
| 일봉 차트 | 5분 | 1시간 | 12시간 | 1시간 |
| 주/월봉 | 12시간 | 12시간 | 24시간 | 1일 |
| 환율 | 1시간 | 4시간 | 12시간 | 1시간 |
| 뉴스/공시 | 15분 | 1시간 | 1시간 | - |

---

## 키움 API 호출 한도 분석 (관심종목 20개 기준)

**개별 조회 방식 (기존)**:
- 주가 15초 = 80회/분 → 한도 100회 초과 위험

**배치 조회 방식 (개선)**:
- 배치 주가 15초 = 4회/분 (20종목 1회 요청)
- 지수 30초 = 2회/분
- 분봉 1분 = 1회/분
- **합계: ~7회/분** → 한도 내 안전

→ Task 3 (배치 조회)가 핵심 최적화

---

## 기술 스택
- SWR v2 (이미 설치됨)
- Next.js 15 API Routes
- 기존 키움 REST API 클라이언트

## 제외 항목 (What NOT to Build)
- WebSocket 실시간 연결 (과도한 엔지니어링)
- Redis 등 분산 캐시 (소규모에 불필요)
- node-cron 서버 스케줄링 (Phase 2 고려)
- 프로그레시브 웹 앱 푸시 알림
- 한국 공휴일 API 연동 (초기 버전에서는 주말만 감지)
