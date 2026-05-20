# SPEC-CHART-001 Acceptance Criteria

```yaml
spec-id: SPEC-CHART-001
format: gherkin
coverage-target: 85%
tags: [chart, kiwoom-api, frontend, lightweight-charts]
```

---

## AC-CHART-01: 일봉 차트 데이터 조회

### Scenario: 일봉 차트 데이터 정상 조회

```gherkin
Given 유효한 종목 심볼 "005930" (삼성전자)이 존재하고
  And 키움 REST API 토큰이 유효한 상태일 때
When GET /api/stocks/005930/chart?period=daily&from=20260201&to=20260310 요청을 보내면
Then 응답 상태 코드는 200이어야 하고
  And 응답 body.data.symbol은 "005930"이어야 하고
  And 응답 body.data.period는 "daily"이어야 하고
  And 응답 body.data.candles 배열의 각 항목은 date, open, high, low, close, volume 필드를 포함해야 하고
  And 각 candle의 date는 YYYY-MM-DD 형식이어야 하고
  And 각 candle의 가격 필드(open, high, low, close)는 양수여야 한다
```

### Scenario: 존재하지 않는 종목 조회

```gherkin
Given 존재하지 않는 종목 심볼 "999999"로
When GET /api/stocks/999999/chart?period=daily 요청을 보내면
Then 응답 상태 코드는 400 또는 404이어야 하고
  And 에러 메시지가 포함되어야 한다
```

---

## AC-CHART-02: 주봉 차트 데이터 조회

### Scenario: 5Y 기간 주봉 데이터 조회

```gherkin
Given 유효한 종목 심볼 "005930"이 존재하고
When GET /api/stocks/005930/chart?period=weekly&from=20210310&to=20260310 요청을 보내면
Then 응답 상태 코드는 200이어야 하고
  And 응답 body.data.period는 "weekly"이어야 하고
  And 응답 body.data.candles 배열은 최소 200개 이상의 데이터 포인트를 포함해야 한다
```

---

## AC-CHART-03: 페이지네이션 및 캐싱

### Scenario: 서버사이드 자동 페이지네이션

```gherkin
Given 키움 API가 첫 응답에서 cont-yn: Y 헤더를 반환하고
  And next-key 헤더에 다음 페이지 키가 포함될 때
When 차트 데이터를 조회하면
Then 시스템은 자동으로 다음 페이지를 요청해야 하고
  And 모든 페이지의 데이터를 단일 candles 배열로 누적하여 반환해야 한다
```

### Scenario: 페이지네이션 최대 5회 제한

```gherkin
Given 키움 API가 매 응답마다 cont-yn: Y를 반환할 때
When 차트 데이터를 조회하면
Then 시스템은 최대 5회까지만 페이지네이션 요청을 수행해야 하고
  And 5회 이후에는 누적된 데이터만으로 응답해야 한다
```

### Scenario: 캐시 히트

```gherkin
Given 동일한 차트 데이터가 이전에 조회되어 캐시에 저장된 상태일 때
When 동일한 심볼/기간/날짜 범위로 다시 요청하면
Then 키움 API 호출 없이 캐시된 데이터를 반환해야 하고
  And 응답 시간은 100ms 이내여야 한다
```

---

## AC-CHART-04: 차트 기본 표시

### Scenario: 종목 상세 페이지 진입 시 기본 차트 표시

```gherkin
Given 사용자가 종목 상세 페이지(/stock/005930)에 접속할 때
When 페이지가 로드되면
Then 1개월(1M) 일봉 캔들스틱 차트가 자동으로 표시되어야 하고
  And ChartToolbar에서 "1M" 버튼이 활성화 상태여야 하고
  And "캔들스틱" 차트 유형이 기본 선택되어야 한다
```

---

## AC-CHART-05: 시간프레임 전환

### Scenario: 기간 선택 변경

```gherkin
Given 1M 차트가 표시된 상태에서
When 사용자가 "1Y" 버튼을 클릭하면
Then 로딩 UI가 표시되어야 하고
  And 1년치 일봉 데이터로 차트가 갱신되어야 하고
  And "1Y" 버튼이 활성화 상태로 변경되어야 한다
```

### Scenario: 5Y 선택 시 주봉 자동 전환

```gherkin
Given 일봉 차트가 표시된 상태에서
When 사용자가 "5Y" 버튼을 클릭하면
Then 시스템은 자동으로 weekly period로 API를 호출해야 하고
  And 5년치 주봉 데이터로 차트가 표시되어야 한다
```

---

## AC-CHART-06: 차트 유형 전환

### Scenario: 캔들스틱에서 라인 차트로 전환

```gherkin
Given 캔들스틱 차트가 데이터와 함께 표시된 상태에서
When 사용자가 "라인" 차트 유형 버튼을 클릭하면
Then 동일한 데이터로 라인 차트가 즉시 표시되어야 하고
  And API 재호출이 발생하지 않아야 하고
  And 전환 시간은 500ms 이내여야 한다
```

---

## AC-CHART-07: 에러 처리

### Scenario: API 호출 실패 시 에러 표시

```gherkin
Given 키움 REST API가 일시적으로 응답 불가 상태일 때
When 차트 데이터를 로드하면
Then 차트 영역에 에러 메시지가 표시되어야 하고
  And "다시 시도" 버튼이 함께 표시되어야 한다
```

### Scenario: 재시도 버튼 동작

```gherkin
Given 에러 메시지와 "다시 시도" 버튼이 표시된 상태에서
When 사용자가 "다시 시도" 버튼을 클릭하면
Then 로딩 UI가 표시되고 차트 데이터를 다시 요청해야 한다
```

---

## AC-CHART-08: 반응형 및 접근성 (Optional)

### Scenario: 모바일 반응형 차트

```gherkin
Given 사용자가 모바일 기기(뷰포트 너비 < 768px)로 접속할 때
When 차트가 표시되면
Then 차트는 화면 풀 너비로 렌더링되어야 하고
  And ChartToolbar 버튼은 터치 가능한 크기(최소 44px)여야 한다
```

---

## AC-CHART-09: 성능 기준

### Scenario: 차트 초기 로드 성능

```gherkin
Given 네트워크가 정상 상태일 때
When 종목 상세 페이지에서 차트가 처음 로드되면
Then 차트 데이터 API 응답은 2초 이내여야 하고
  And lightweight-charts 렌더링은 500ms 이내여야 한다
```

### Scenario: lightweight-charts 번들 크기

```gherkin
Given 프로덕션 빌드가 완료된 상태에서
When lightweight-charts 청크 크기를 확인하면
Then 개별 청크 크기는 50KB 이하여야 한다
```

---

## 엣지 케이스

### Scenario: 빈 차트 데이터 (비거래일 또는 신규 상장)

```gherkin
Given 조회 기간 내 거래 데이터가 없는 종목일 때
When 차트 데이터를 조회하면
Then 빈 candles 배열([])을 반환해야 하고
  And 프론트엔드에서 "해당 기간 데이터 없음" 메시지를 표시해야 한다
```

### Scenario: 키움 API 토큰 만료 중 차트 조회

```gherkin
Given 키움 API 토큰이 만료된 상태에서
When 차트 데이터를 조회하면
Then KiwoomTokenManager가 자동으로 토큰을 갱신하고
  And 차트 데이터를 정상적으로 반환해야 한다
```

---

## Quality Gate 기준

### TDD 준수
- 모든 백엔드 로직(fetchChart, route handler)에 대해 테스트 선작성 (RED 단계)
- 구현 후 테스트 통과 확인 (GREEN 단계)
- 리팩토링 후 테스트 재검증 (REFACTOR 단계)

### 커버리지
- 커밋당 최소 80% 커버리지
- 전체 프로젝트 85%+ 커버리지 유지
- 차트 관련 신규 코드 90%+ 커버리지 목표

### LSP Quality Gate
- 타입 에러: 0개
- Lint 에러: 0개
- 보안 경고: 0개

### Definition of Done
- [ ] Phase 0: API 테스트 스크립트 실행, 응답 필드 확인 완료
- [ ] Phase 1: 모든 백엔드 테스트 통과 (fetchChart, route, 캐시, 페이지네이션)
- [ ] Phase 2: 차트 컴포넌트 렌더링 및 상호작용 정상 동작
- [ ] Phase 3: 종목 상세 페이지 통합 완료
- [ ] 전체 테스트 스위트 통과 (기존 36개 + 신규)
- [ ] 85%+ 커버리지 달성
- [ ] `npm run build` 성공 (타입 에러 없음)
- [ ] lightweight-charts 번들 크기 50KB 이하 확인
