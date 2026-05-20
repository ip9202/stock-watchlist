---
id: SPEC-CHART-003
version: "1.0.0"
status: completed
created: 2026-03-10
updated: 2026-03-10
author: MoAI
priority: P1
---

## HISTORY

| version | date | author | description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-10 | MoAI | 초안 작성 |

# SPEC-CHART-003: 분봉(ka10080) 기반 1일 인트라데이 차트

## 요약

1일 기간 선택 시 분봉(ka10080) API를 호출하여 장중 가격 변동을 라인차트로 표시한다. 현재 daily API로는 캔들 1개만 반환되어 의미 없는 차트가 표시되는 문제를 해결한다.

## 현재 상태

- 1일 라인: daily API(ka10081) → 캔들 1개 (점 1개 표시)
- 분봉 API(ka10080): 미구현
- SPEC-CHART-002에서 식별한 기술 부채

## 요구사항 (EARS 형식)

### R1: 분봉 API 호출
WHEN 프론트엔드가 period=minute 파라미터로 차트 API를 호출하면
THE SYSTEM SHALL ka10080 TR 코드로 키움 API를 호출하여 분봉 데이터를 반환한다.
추가 파라미터: tic_scope (분봉 간격, 기본값 1)

### R2: 1일 라인차트 → 분봉 전환
WHEN 사용자가 1일 기간 버튼을 선택하면
THE SYSTEM SHALL daily API 대신 minute API(tic_scope=1)를 호출하여 당일 장중 가격을 라인차트로 표시한다.

### R3: 분봉 시간 데이터 처리
WHEN 분봉 API 응답의 dt 필드에 시간 정보가 포함되면
THE SYSTEM SHALL 해당 시간을 UTC timestamp로 변환하여 lightweight-charts에 전달한다.
차트 X축에 시간(HH:MM)이 표시되어야 한다.

### R4: 분봉 캐시 TTL
WHEN 분봉 데이터를 캐시에 저장하면
THE SYSTEM SHALL TTL을 5분으로 설정한다.
(daily 1시간, weekly/monthly 1일과 차별화)

### R5: API 파라미터 전달
WHEN route handler가 minute 요청을 받으면
THE SYSTEM SHALL tic_scope 쿼리 파라미터를 키움 API 요청 body에 포함한다.
기본값: "1" (1분봉)

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/stock.ts` | ChartData.period에 'minute' 추가 |
| `src/lib/kiwoom-stock-api.ts` | fetchChart()에 tic_scope 지원, 분봉 시간 파싱 |
| `src/app/api/stocks/[symbol]/chart/route.ts` | minute 매핑, tic_scope 파라미터, 5분 캐시 TTL |
| `src/components/chart/StockChart.tsx` | 1D 모드에서 minute API 호출 |
| `src/components/chart/chart-data-utils.ts` | 시간 포함 데이터 → UTCTimestamp 변환 |
| 테스트 파일들 | 분봉 API, 시간 변환, 1D 모드 테스트 |

## API 변경

```
GET /api/stocks/{symbol}/chart?period=minute&tic_scope=1&from=YYYYMMDD
```

TR 매핑 (기존 + 신규):
- daily → ka10081
- weekly → ka10082
- monthly → ka10083
- minute → ka10080 (신규)

## 타입 변경

```typescript
// ChartData.period 확장
export interface ChartData {
  symbol: string
  period: 'daily' | 'weekly' | 'monthly' | 'minute'
  candles: ChartCandle[]
}
```

## 키움 API 파라미터 (ka10080)

```json
{
  "stk_cd": "005930",
  "tic_scope": "1",
  "upd_stkpc_tp": "1",
  "base_dt": "20260310"
}
```

tic_scope 값: 1(1분), 3(3분), 5(5분), 10(10분), 15(15분), 30(30분), 45(45분), 60(60분)

## 인수 조건

- [x] AC1: 1일 버튼 클릭 시 분봉 데이터로 라인차트 표시 (점 1개가 아닌 장중 가격 변동)
- [x] AC2: 차트 X축에 시간(HH:MM) 표시 (UTCTimestamp 기반)
- [x] AC3: period=minute API 호출 시 ka10080 TR 코드 사용
- [x] AC4: tic_scope 파라미터가 키움 API에 전달됨
- [x] AC5: 분봉 캐시 TTL 5분 적용
- [x] AC6: 104개 테스트 통과 (기존 83 + 신규 21)
- [x] AC7: 분봉 시간 데이터 중복 제거 (Map 기반, toChartTime 헬퍼)

## 불확실 사항 (구현 중 확인)

1. dt 필드 형식: YYYYMMDDHHMMSS vs HHMMSS → 첫 API 호출로 확인 후 파싱 로직 결정
2. 장 마감 후 1일 차트: 당일 데이터만 표시 vs 최근 영업일 표시 → 당일 데이터 우선

## 비고

- fetchChart()는 이미 apiId를 직접 받으므로 ka10080도 즉시 사용 가능
- tic_scope는 분봉 전용 파라미터 → 다른 period에서는 전달하지 않음
- lightweight-charts timeScale에 timeVisible: true 이미 설정됨
