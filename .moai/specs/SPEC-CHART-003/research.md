# SPEC-CHART-003 Research: 분봉(ka10080) 기반 1일 차트

## 현재 상태

- 1일 라인차트 선택 시 daily API(ka10081)로 캔들 1개만 반환 → 점 1개 표시 (무의미)
- SPEC-CHART-002 구현 시 이미 인지한 제약: "진짜 intraday 라인은 분봉(ka10080) SPEC 필요"

## ka10080 분봉 API 사양 (공식 확인)

### 엔드포인트
- POST https://api.kiwoom.com/api/dostk/chart
- Header: `api-id: ka10080`

### 요청 파라미터
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `stk_cd` | Y | 종목코드 (예: 005930) |
| `tic_scope` | Y | 틱범위: 1(1분), 3(3분), 5(5분), 10(10분), 15(15분), 30(30분), 45(45분), 60(60분) |
| `upd_stkpc_tp` | Y | 수정주가구분: "0" 또는 "1" |
| `base_dt` | Y | 기준일자 YYYYMMDD (분봉에서도 필수) |

### 요청 헤더
| 헤더 | 값 |
|------|-----|
| `Content-Type` | application/json;charset=UTF-8 |
| `authorization` | Bearer {token} |
| `cont-yn` | N (첫 요청), Y (연속조회) |
| `next-key` | 연속조회키 (첫 요청 시 빈값) |
| `api-id` | ka10080 |

### 응답 형식
- 배열 키: `stk_dt_pole_chart_qry` (일봉과 동일)
- 필드: `dt`, `open_pric`, `high_pric`, `low_pric`, `cur_prc`, `trde_qty`
- `dt` 필드: 분봉은 시간 포함 (YYYYMMDDHHMMSS 또는 HHMMSS 형식 - API 테스트로 확인 필요)
- 페이지네이션: `cont-yn` / `next-key` 응답 헤더 (일봉과 동일 패턴)

### 기존 일봉 API와의 비교
| 구분 | 일봉(ka10081) | 분봉(ka10080) |
|------|-------------|-------------|
| api-id | ka10081 | ka10080 |
| 고유 파라미터 | (없음) | `tic_scope` |
| `base_dt` | 필수 | 필수 |
| dt 응답 형식 | YYYYMMDD | 시간 포함 (확인 필요) |
| 데이터 단위 | 1일 1건 | 분 단위 (장중 ~390건/1분봉) |

## 코드 영향 분석

### 수정 대상 파일

1. **`src/types/stock.ts`**
   - ChartData.period에 'minute' 추가
   - ChartCandle.date: 시간 포함 문자열 호환 필요

2. **`src/lib/kiwoom-stock-api.ts`**
   - fetchChart() 또는 새 fetchMinuteChart(): tic_scope 파라미터, dt 시간 파싱
   - period 'minute' → ka10080 매핑

3. **`src/app/api/stocks/[symbol]/chart/route.ts`**
   - PERIOD_TO_API_ID에 minute: 'ka10080' 추가
   - tic_scope 쿼리 파라미터 처리
   - 분봉 캐시 TTL: 5분 (장중 실시간성)

4. **`src/components/chart/StockChart.tsx`**
   - 1D 모드에서 period=minute&tic_scope=1 호출
   - base_dt는 당일 날짜

5. **`src/components/chart/chart-data-utils.ts`**
   - 시간 포함 dt → lightweight-charts UTCTimestamp 변환

6. **`src/components/chart/ChartContainer.tsx`**
   - 분봉 시 timeVisible: true (이미 설정됨)

### 참조 구현 (기존 코드)
- `route.ts:17-21`: PERIOD_TO_API_ID 맵 → minute: 'ka10080' 추가
- `route.ts:24`: LONG_TTL_PERIODS Set → minute 미포함 (짧은 TTL 별도 상수)
- `kiwoom-stock-api.ts:229-289`: fetchChart() → tic_scope 파라미터 추가
- `kiwoom-stock-api.ts:244-249`: requestBody 구성 → tic_scope 조건부 추가
- `kiwoom-stock-api.ts:295-310`: transformChartCandle() → 시간 파싱 분기

### 캐시 전략
- 분봉 TTL: 5분 (장중 데이터 신선도)
- daily(1시간), weekly/monthly(1일)보다 짧음

### lightweight-charts 시간 처리
- 일봉: `YYYY-MM-DD` 문자열 (BusinessDay)
- 분봉: UTCTimestamp (Unix timestamp, 초 단위) 사용
- `timeVisible: true`, `secondsVisible: false` → 이미 ChartContainer에 설정됨
