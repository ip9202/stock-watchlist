# SPEC-MARKET-001: 구현 계획

## 팀 모드 실행 계획

### Phase 1: 병렬 백엔드 (Task 1 + Task 2 동시 실행)

#### Task 1: 업종 지수 API (backend coder)
1. `src/types/stock.ts`에 `MarketIndex` 인터페이스 추가
2. `src/lib/kiwoom-stock-api.ts`에 업종 메서드 추가
   - `fetchIndexInfo(indsCd: string)`: 현재가, 등락률
   - `fetchIndexChart(indsCd, period, from, to)`: 차트 데이터
3. `src/app/api/market/route.ts` 생성
   - GET: 코스피+코스닥 현재가 동시 조회
   - 캐시: 1분 TTL
4. `src/app/api/market/chart/route.ts` 생성
   - GET: ?index=kospi|kosdaq&period=minute|daily
   - 기존 차트 API 패턴 따름

#### Task 2: 환율 API (backend coder)
1. `src/types/stock.ts`에 `ExchangeRate` 인터페이스 추가
2. `src/lib/frankfurter-api.ts` 생성
   - `getLatestRate()`: 현재 USD/KRW
   - `getHistory(from, to)`: 기간별 환율
3. `src/app/api/market/exchange/route.ts` 생성
   - GET: 현재 환율 + 30일 히스토리
   - 캐시: 1시간 TTL

### Phase 2: 프론트엔드 (Task 3, Phase 1 완료 후)

#### Task 3: MarketIndicators 컴포넌트 (frontend coder)
1. `src/components/dashboard/MiniChart.tsx` 생성
   - lightweight-charts 미니 라인 차트 (높이 120px)
   - dynamic import + ssr: false
   - 상승/하락 색상 자동 결정
2. `src/components/dashboard/MarketIndicators.tsx` 생성
   - 3개 MiniChart 카드 (코스피, 코스닥, 환율)
   - SWR 데이터 페칭
   - 반응형 그리드 (md:grid-cols-3)
   - 독립 에러/로딩 상태

### Phase 3: 통합 (Task 4, Phase 2 완료 후)

#### Task 4: 메인 페이지 통합
1. `src/app/page.tsx`에 MarketIndicators import
2. 종목 검색 섹션 위에 배치

### Phase 4: 테스트 (Task 5, Phase 1 완료 후 병렬 가능)

#### Task 5: 테스트 작성
1. `src/lib/__tests__/frankfurter-api.test.ts`
2. `src/app/api/market/__tests__/route.test.ts`
3. `src/app/api/market/exchange/__tests__/route.test.ts`

## 파일 변경 목록

### 새로 생성
- `src/lib/frankfurter-api.ts`
- `src/app/api/market/route.ts`
- `src/app/api/market/chart/route.ts`
- `src/app/api/market/exchange/route.ts`
- `src/components/dashboard/MiniChart.tsx`
- `src/components/dashboard/MarketIndicators.tsx`
- `src/lib/__tests__/frankfurter-api.test.ts`
- `src/app/api/market/__tests__/route.test.ts`
- `src/app/api/market/exchange/__tests__/route.test.ts`

### 수정
- `src/types/stock.ts` (MarketIndex, ExchangeRate 타입 추가)
- `src/lib/kiwoom-stock-api.ts` (업종 메서드 추가)
- `src/app/page.tsx` (MarketIndicators 추가)

## 키움 업종 API 참고

### ka20001 (업종현재가)
- 엔드포인트: POST /api/dostk/stkpc (추정, 실제 확인 필요)
- 파라미터: `inds_cd` (업종코드)
- 응답: 현재가, 전일대비, 등락률 등

### ka20005 (업종분봉차트)
- 엔드포인트: POST /api/dostk/chart
- api-id: ka20005
- 파라미터: `inds_cd`, `tic_scope`, `base_dt`

### ka20006 (업종일봉차트)
- 엔드포인트: POST /api/dostk/chart
- api-id: ka20006
- 파라미터: `inds_cd`, `base_dt`

## 리스크

1. **키움 업종 API 파라미터 불확실**: ka20001/ka20005의 정확한 파라미터명이 확인 안 됨 → 구현 시 시행착오 가능
2. **Frankfurter API 안정성**: ECB 기반 무료 서비스로 SLA 없음 → 실패 시 graceful degradation
3. **키움 API 호출 제한**: 지수 + 환율 추가 호출로 토큰 재발급 빈도 증가 가능
