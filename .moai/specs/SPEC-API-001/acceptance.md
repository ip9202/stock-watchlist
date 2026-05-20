---
id: SPEC-API-001
title: 키움증권 REST API 완전 전환 - 인수 기준
version: 1.0.0
status: Planned
created: 2026-03-10
updated: 2026-03-10
author: 강력쇠주먹
tags: [api-migration, kiwoom, rest-api, acceptance-criteria]
---

# SPEC-API-001: 인수 기준 (Acceptance Criteria)

## ACC-001: 토큰 관리 및 인증

### 시나리오 1: 정상 토큰 발급

```gherkin
Given 유효한 KIWOOM_APP_KEY와 KIWOOM_SECRET_KEY가 환경변수에 설정되어 있을 때
When 토큰 관리 모듈이 접근토큰을 요청하면
Then 키움 REST API에서 Bearer 토큰이 정상 발급되어야 한다
And 발급된 토큰은 캐시되어 이후 요청에 재사용되어야 한다
And 중복 토큰 발급 요청이 발생하지 않아야 한다
```

### 시나리오 2: 토큰 자동 갱신

```gherkin
Given 캐시된 토큰의 만료 시간이 임박했을 때 (만료 5분 전)
When 새로운 API 호출이 발생하면
Then 토큰 관리 모듈이 자동으로 새 토큰을 발급받아야 한다
And 새 토큰으로 기존 캐시를 갱신해야 한다
And API 호출이 중단 없이 진행되어야 한다
```

### 시나리오 3: 토큰 발급 실패 및 재시도

```gherkin
Given 키움 API 서버가 일시적으로 응답하지 않을 때
When 토큰 발급을 시도하면
Then 최대 3회까지 재시도해야 한다
And 재시도 간격은 지수 백오프(1초, 2초, 4초)를 적용해야 한다
And 3회 모두 실패 시 명확한 에러 메시지를 반환해야 한다
And 에러 메시지에 API 키 또는 시크릿 키가 노출되지 않아야 한다
```

---

## ACC-002: 종목 검색 (키움 REST API 기반)

### 시나리오 1: 종목 검색 정상 동작

```gherkin
Given 키움 REST API 기반 종목 리스트가 캐시되어 있을 때
When 사용자가 "/api/stocks?q=삼성" 으로 검색 요청을 보내면
Then 응답 형식은 { success: true, data: StockSearchResult[] } 이어야 한다
And 결과에 "삼성전자", "삼성SDI" 등 "삼성"을 포함하는 종목이 포함되어야 한다
And 각 결과에 symbol, name, market 필드가 포함되어야 한다
And 검색 결과는 관련도 점수 순으로 정렬되어야 한다
```

### 시나리오 2: 캐시 만료 시 자동 갱신

```gherkin
Given 종목 리스트 캐시가 7일 이상 경과했을 때
When 종목 검색 요청이 발생하면
Then 키움 REST API에서 최신 종목 리스트를 조회해야 한다
And 조회 결과를 새 캐시 파일에 저장해야 한다
And 캐시 파일에 timestamp가 기록되어야 한다
And source 필드가 "kiwoom_rest_api"로 표시되어야 한다
```

### 시나리오 3: 종목코드 직접 검색

```gherkin
Given 키움 REST API 기반 종목 리스트가 존재할 때
When 사용자가 "/api/stocks?q=005930" 으로 종목코드를 검색하면
Then 삼성전자(005930)가 최상위 결과로 반환되어야 한다
And 응답 시간이 2초 이내여야 한다 (캐시 적중 시)
```

### 시나리오 4: PyKRX 의존성 제거 확인

```gherkin
Given 마이그레이션이 완료된 환경에서
When fetch_all_stocks_kiwoom.py 스크립트를 실행하면
Then PyKRX 라이브러리를 import하지 않아야 한다
And requirements.txt에 pykrx가 포함되지 않아야 한다
And 종목 검색이 키움 REST API만으로 정상 동작해야 한다
```

---

## ACC-003: 개별 종목 시세 조회

### 시나리오 1: 완전한 시세 데이터 반환

```gherkin
Given 유효한 키움 REST API 토큰이 있을 때
When 사용자가 "/api/stocks/005930" (삼성전자)을 요청하면
Then 응답 형식은 { success: true, data: StockInfo } 이어야 한다
And StockInfo의 다음 필드가 0이 아닌 실제 값으로 채워져야 한다:
  | 필드명           | 설명              |
  | price            | 현재가            |
  | changeAmount     | 전일 대비 금액    |
  | changePercent    | 전일 대비 등락률  |
  | volume           | 누적 거래량       |
  | marketCap        | 시가총액          |
  | tradingValue     | 거래대금          |
  | sharesOutstanding| 상장주식수        |
  | high             | 고가              |
  | low              | 저가              |
  | open             | 시가              |
  | previousClose    | 전일 종가         |
  | high52w          | 52주 최고가       |
  | low52w           | 52주 최저가       |
And timestamp 필드가 현재 시각 근처여야 한다
```

### 시나리오 2: WebSocket 의존성 제거 확인

```gherkin
Given 마이그레이션이 완료된 환경에서
When fetch_stock_data_kiwoom.py 스크립트를 실행하면
Then WebSocket 연결을 시도하지 않아야 한다
And websockets 라이브러리를 import하지 않아야 한다
And REST API HTTP 요청만 사용해야 한다
```

### 시나리오 3: 30초 TTL 캐시 동작

```gherkin
Given 사용자가 "/api/stocks/005930"을 처음 요청했을 때
When 동일한 요청이 30초 이내에 다시 발생하면
Then 캐시된 데이터를 반환해야 한다 (Cache HIT)
And 키움 REST API에 추가 요청을 보내지 않아야 한다

Given 30초가 경과한 후
When 동일한 요청이 다시 발생하면
Then 키움 REST API에서 새로운 데이터를 조회해야 한다 (Cache MISS)
```

---

## ACC-004: 에러 처리 및 안정성

### 시나리오 1: API 서버 장애 시 에러 응답

```gherkin
Given 키움 REST API 서버가 응답하지 않을 때
When 사용자가 종목 시세를 요청하면
Then 응답은 { success: false, error: "설명 메시지" } 형식이어야 한다
And HTTP 상태 코드는 500이어야 한다
And 에러 메시지에 KIWOOM_APP_KEY 또는 KIWOOM_SECRET_KEY가 포함되지 않아야 한다
```

### 시나리오 2: 잘못된 종목 코드

```gherkin
Given 유효한 API 연결이 있을 때
When 사용자가 "/api/stocks/999999" (존재하지 않는 종목)을 요청하면
Then 응답은 { success: false, error: "..." } 형식이어야 한다
And 애플리케이션이 크래시하지 않아야 한다
```

### 시나리오 3: 환경변수 누락

```gherkin
Given KIWOOM_APP_KEY 환경변수가 설정되지 않았을 때
When 종목 검색 또는 시세 조회를 시도하면
Then 명확한 에러 메시지("API 키가 설정되지 않았습니다")를 반환해야 한다
And 스택 트레이스가 사용자에게 노출되지 않아야 한다
```

---

## 성능 기준 (Performance Criteria)

### 응답 시간

| 시나리오 | 목표 응답 시간 | 조건 |
|----------|---------------|------|
| 종목 검색 (캐시 적중) | 500ms 이내 | 캐시된 종목 리스트에서 검색 |
| 종목 검색 (캐시 미적중) | 10초 이내 | REST API 조회 + 캐시 저장 + 검색 |
| 개별 시세 (캐시 적중) | 100ms 이내 | 인메모리 캐시 반환 |
| 개별 시세 (캐시 미적중) | 3초 이내 | REST API 조회 + 캐시 저장 |
| 토큰 발급 | 5초 이내 | OAuth2 토큰 발급 |

### 안정성

| 지표 | 기준 |
|------|------|
| API 가용성 | 키움 API 정상 시 99% 이상 성공률 |
| 에러 복구 | 토큰 만료 시 자동 갱신, 사용자 개입 불필요 |
| 메모리 사용 | 캐시로 인한 메모리 사용량 100MB 이내 |

---

## 완료 정의 (Definition of Done)

- [ ] 모든 API 호출이 키움 REST API만 사용 (PyKRX, WebSocket 제거)
- [ ] StockInfo 인터페이스의 모든 필드가 실제 데이터로 채워짐 (0 또는 placeholder 없음)
- [ ] `/api/stocks?q=` 엔드포인트의 응답 형식이 기존과 동일
- [ ] `/api/stocks/[symbol]` 엔드포인트의 응답 형식이 기존과 동일
- [ ] 프론트엔드 코드 변경 없이 정상 동작
- [ ] 토큰 관리 모듈이 자동 갱신 및 캐시를 수행
- [ ] 에러 시 구조화된 에러 응답 반환
- [ ] API 키가 에러 응답에 노출되지 않음
- [ ] `requirements.txt`에서 `pykrx` 제거
- [ ] `requirements.txt`에서 `websockets` 제거 (시세 전용인 경우)
- [ ] Docker 빌드 정상 동작
- [ ] 성능 기준 충족 (위 표 참조)

---

## 검증 방법 (Verification Methods)

### 수동 테스트

1. 로컬 개발 환경에서 전체 API 동작 확인
2. Docker 환경에서 빌드 및 실행 검증
3. Railway 배포 후 프로덕션 환경 검증

### 자동화 테스트 (권장)

1. 토큰 관리 모듈 단위 테스트 (mock API 사용)
2. REST API 응답 파싱 테스트
3. 캐시 동작 테스트 (TTL 만료, 갱신)
4. 에러 처리 테스트 (네트워크 실패, 잘못된 응답)

### 회귀 테스트

1. 기존 프론트엔드 기능이 변경 없이 동작하는지 확인
2. 뉴스 및 공시 API가 영향 없이 동작하는지 확인
3. 종목 검색 결과가 기존과 동등한 품질인지 확인
