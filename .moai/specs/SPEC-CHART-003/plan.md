# SPEC-CHART-003 Implementation Plan

## 태스크 분해

### Task 1: 타입 확장 (src/types/stock.ts)
- ChartData.period에 'minute' 추가
- 영향: route.ts, kiwoom-stock-api.ts의 period 타입

### Task 2: 키움 API 분봉 지원 (src/lib/kiwoom-stock-api.ts)
- fetchChart()에 tic_scope 파라미터 지원
  - options에 tic_scope 추가: `{ from?, to?, reqCnt?, ticScope? }`
  - requestBody에 조건부 포함: `if (ticScope) body.tic_scope = ticScope`
- period 매핑 확장: ka10080 → 'minute'
- transformChartCandle(): dt 시간 파싱 분기
  - 일봉: YYYYMMDD → YYYY-MM-DD
  - 분봉: YYYYMMDDHHMMSS → YYYY-MM-DDTHH:MM:SS (또는 Unix timestamp)
- RED: 분봉 파라미터 전달 테스트, 시간 파싱 테스트

### Task 3: Route handler 분봉 지원 (src/app/api/stocks/[symbol]/chart/route.ts)
- PERIOD_TO_API_ID에 minute: 'ka10080' 추가
- tic_scope 쿼리 파라미터 읽기 및 전달
- 분봉 캐시 TTL: 5분 (CACHE_TTL_MINUTE = 300000)
- period 검증 에러 메시지에 'minute' 추가
- RED: minute API 호출 테스트, tic_scope 전달 테스트, 캐시 TTL 테스트

### Task 4: 프론트엔드 1D 모드 전환 (src/components/chart/StockChart.tsx)
- getApiParams(): 1D 모드에서 apiPeriod를 'minute'로 변경
- API URL에 tic_scope=1 추가
- fromDate는 당일 날짜

### Task 5: 시간 데이터 변환 (src/components/chart/chart-data-utils.ts)
- toLineData(): 분봉 시간 → UTCTimestamp 변환
  - 날짜 형식 감지: YYYY-MM-DD (일봉) vs 시간 포함 (분봉)
  - 시간 포함 시 UTCTimestamp 반환
- toCandlestickData(): 동일 로직 (분봉 캔들 표시 대비)
- RED: 시간 변환 테스트

## 구현 순서

Task 1 → Task 2 (+ 테스트) → Task 3 (+ 테스트) → Task 5 (+ 테스트) → Task 4

## 리스크

1. **dt 필드 형식 불확실**: API 테스트로 확인 후 파싱 로직 결정
   - 대응: 두 형식(YYYYMMDDHHMMSS, HHMMSS) 모두 처리하는 파서 작성
2. **장 마감 후 데이터 부재**: 분봉 데이터가 없을 수 있음
   - 대응: 빈 데이터 시 "데이터 없음" 표시 (기존 로직 활용)
3. **lightweight-charts 시간 형식**: BusinessDay vs UTCTimestamp 호환
   - 대응: 분봉은 UTCTimestamp, 일봉은 기존 BusinessDay 유지
