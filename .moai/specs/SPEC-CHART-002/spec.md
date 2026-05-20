# SPEC-CHART-002: 차트 툴바 UI 개편 (봉 타입 + 기간 분리)

## 요약

차트 툴바를 스크린샷 레퍼런스 기반으로 개편한다. 봉 타입(일봉/주봉/월봉)과 기간(1일/3개월/1년/3년/10년)을 독립적으로 선택할 수 있는 2단 구조로 변경한다.

## 레퍼런스 UI

```
[일봉] [주봉] [월봉]    [1일] [3개월] [1년] [3년] [10년]
```

- 왼쪽 그룹: 봉 타입 선택 (배타적)
- 오른쪽 그룹: 조회 기간 선택 (배타적)
- 캔들/라인 토글: 유지 (오른쪽 끝)

## 현재 상태

- 기간 버튼: 1M, 3M, 6M, 1Y, 5Y
- 봉 타입: 자동 결정 (5Y일 때만 주봉, 나머지 일봉)
- API: daily(ka10081), weekly(ka10082)만 지원
- 월봉(ka10083) 미구현

## 요구사항 (EARS 형식)

### R1: 봉 타입 선택 UI
WHEN 사용자가 차트 툴바를 보면
THE SYSTEM SHALL 일봉, 주봉, 월봉 3개의 봉 타입 버튼을 표시한다.
기본값: 일봉

### R2: 기간 선택 UI
WHEN 사용자가 차트 툴바를 보면
THE SYSTEM SHALL 1일, 3개월, 1년, 3년, 10년 5개의 기간 버튼을 표시한다.
기본값: 3개월

### R3: 독립적 선택
WHEN 사용자가 봉 타입을 변경하면
THE SYSTEM SHALL 현재 선택된 기간은 유지하고 봉 타입만 변경하여 차트를 갱신한다.

### R4: 월봉 API 지원
WHEN API가 period=monthly 파라미터를 받으면
THE SYSTEM SHALL ka10083 TR 코드로 키움 API를 호출하여 월봉 데이터를 반환한다.
캐시 TTL: 1일 (주봉과 동일)

### R5: 1일 기간 처리
WHEN 사용자가 1일 기간을 선택하면
THE SYSTEM SHALL 오늘 날짜 기준 1영업일 데이터를 요청한다.
NOTE: 일봉 기준 1일은 캔들 1개뿐이므로, 일봉+1일 조합 시 최근 5영업일 데이터를 fallback으로 표시한다.

### R6: 캔들/라인 토글 유지
THE SYSTEM SHALL 기존 캔들/라인 차트 타입 토글을 유지한다.

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/stock.ts` | CandleInterval 타입 추가, ChartPeriod 변경 |
| `src/components/chart/ChartToolbar.tsx` | 봉 타입 버튼 그룹 추가, 기간 옵션 변경 |
| `src/components/chart/StockChart.tsx` | interval 상태 추가, getPeriodParams 수정 |
| `src/app/api/stocks/[symbol]/chart/route.ts` | monthly 매핑 추가, period 검증 확장 |
| 테스트 파일들 | 월봉 API, 새 기간 옵션 테스트 |

## 타입 변경

```typescript
// 새로 추가
export type CandleInterval = 'daily' | 'weekly' | 'monthly'

// 변경
export type ChartPeriod = '1D' | '3M' | '1Y' | '3Y' | '10Y'
```

## API 변경

```
GET /api/stocks/{symbol}/chart?period=daily|weekly|monthly&from=YYYYMMDD
```

TR 매핑:
- daily → ka10081 (일봉)
- weekly → ka10082 (주봉)
- monthly → ka10083 (월봉) ← 신규

## 인수 조건

- [x] AC1: 일봉/주봉/월봉 3개 버튼이 표시되고 클릭 시 차트 갱신
- [x] AC2: 1일/3개월/1년/3년/10년 5개 기간 버튼이 표시되고 클릭 시 차트 갱신
- [x] AC3: 봉 타입과 기간이 독립적으로 동작 (3개월+주봉, 1년+월봉 등)
- [x] AC4: monthly API 호출 시 ka10083 TR 코드 사용
- [x] AC5: 월봉 캐시 TTL 1일 적용
- [x] AC6: 캔들/라인 토글 → ChartMode discriminated union으로 자동 결정
- [x] AC7: 104개 테스트 통과 (기존 72 + CHART-002 11 + CHART-003 21)

## 비고

- `fetchChart()`는 이미 apiId를 직접 받으므로 ka10083도 즉시 사용 가능
- ChartPeriod 타입 변경은 breaking change — 기존 '1M', '6M', '5Y' 제거
- chart-data-utils.ts는 변경 불필요 (봉 타입에 무관한 순수 데이터 변환)
