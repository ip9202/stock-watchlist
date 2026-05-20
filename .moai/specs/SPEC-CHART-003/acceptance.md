# SPEC-CHART-003 Acceptance Criteria

## AC1: 1일 버튼 클릭 시 분봉 라인차트 표시

**Given** 사용자가 종목 차트 페이지에 있고
**When** 1일 기간 버튼을 클릭하면
**Then** 분봉 데이터 기반 라인차트가 표시되고 X축에 시간(HH:MM)이 보인다

## AC2: minute API 호출 시 ka10080 사용

**Given** 프론트엔드가 period=minute 파라미터로 API를 호출하면
**When** route handler가 요청을 처리하면
**Then** api-id: ka10080 헤더로 키움 API가 호출되고 tic_scope가 body에 포함된다

## AC3: 분봉 캐시 TTL 5분

**Given** 분봉 데이터가 캐시에 저장되면
**When** 5분이 경과하면
**Then** 캐시가 만료되어 다음 요청 시 API를 다시 호출한다

## AC4: 시간 데이터 변환

**Given** 키움 API가 시간 포함 dt 필드를 반환하면
**When** chart-data-utils가 데이터를 변환하면
**Then** lightweight-charts 호환 시간 형식으로 변환되어 차트에 시간이 표시된다

## AC5: 기존 테스트 호환

**Given** SPEC-CHART-003 구현 완료 시
**When** 전체 테스트 실행 시
**Then** 기존 83개 테스트 + 신규 분봉 테스트 모두 통과한다

## 에지 케이스

### E1: 장 마감 후 1일 차트
**Given** 장 마감 후 사용자가 1일 차트를 요청하면
**When** 당일 분봉 데이터가 존재하면
**Then** 마감 시점까지의 가격 변동을 표시한다

### E2: 유효하지 않은 tic_scope
**Given** tic_scope=999 등 유효하지 않은 값이 전달되면
**When** route handler가 처리하면
**Then** 400 에러를 반환한다

### E3: 분봉 데이터 중복
**Given** 페이지네이션 경계에서 중복 시간 데이터가 발생하면
**When** chart-data-utils가 변환하면
**Then** Map 기반 중복 제거로 고유 시간 데이터만 남는다
