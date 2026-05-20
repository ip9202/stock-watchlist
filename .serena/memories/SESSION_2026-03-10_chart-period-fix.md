# Session: Chart Period Bug Fix (2026-03-10)

## Task
차트 기간(period) 구현 버그 수정 및 장기간 라인차트 API 최적화

## Issues Found & Fixed

### Bug 1 (Critical): base_dt 파라미터 오용
- **Problem**: `getApiParams()`의 `fromDate`(과거 날짜)가 키움 API `base_dt`로 전달됨
- **Root cause**: 키움 API `base_dt`는 조회 기준일(이 날짜부터 과거 방향으로 반환)인데, 시작일(from)을 넣어 오래된 데이터만 반환
- **Fix**: `base_dt`를 `to`(오늘)로 변경 (kiwoom-stock-api.ts line 253)

### Bug 2: to 파라미터 미전송
- **Problem**: StockChart.tsx URL에 `from`만 보내고 `to` 미전송
- **Fix**: `getApiParams` 반환값에 `toDate` 추가, URL에 `to` 포함

### Improvement: 장기간 라인차트 해상도 최적화
- 3Y 라인: daily → weekly (750 → 156 포인트)
- 10Y 라인: daily → monthly (2500 → 120 포인트)

### Enhancement: from 기반 페이지네이션 중단 및 필터링
- 페이지네이션 시 from 날짜 이전 데이터 도달하면 조기 중단
- 최종 결과에서 from 이전 데이터 필터링

## Files Modified
- `src/components/chart/StockChart.tsx` - getApiParams + URL 수정
- `src/lib/kiwoom-stock-api.ts` - base_dt, 필터링, 페이지네이션 중단
- `src/components/chart/__tests__/stock-chart-params.test.ts` - 테스트 업데이트

## Test Results
- 109/109 tests passing
- tsc --noEmit clean
