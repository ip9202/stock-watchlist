# Acceptance Criteria: SPEC-POLL-001

## AC-001: 장시간 감지 정확성

### Given: 평일 오전 10:00 (정규장)
- **When**: `getMarketState()` 호출
- **Then**: `'open'` 반환

### Given: 평일 오전 08:45 (장전)
- **When**: `getMarketState()` 호출
- **Then**: `'pre-market'` 반환

### Given: 토요일 오후 14:00
- **When**: `getMarketState()` 호출
- **Then**: `'closed'` 반환

### Given: 평일 오후 15:35 (장후)
- **When**: `getMarketState()` 호출
- **Then**: `'post-market'` 반환

---

## AC-002: 동적 폴링 인터벌

### Given: 장중 (open) + stock-price 타입
- **When**: `getPollingInterval('stock-price', 'open')` 호출
- **Then**: 15000ms 반환

### Given: 폐장 (closed) + stock-price 타입
- **When**: `getPollingInterval('stock-price', 'closed')` 호출
- **Then**: 3600000ms (1시간) 반환

### Given: 주말 (closed) + minute-chart 타입
- **When**: `getPollingInterval('minute-chart', 'closed')` 호출
- **Then**: 0ms (폴링 중지) 반환

---

## AC-003: 배치 종목 조회 API

### Given: 유효한 심볼 배열 ['005930', '000660']
- **When**: `POST /api/stocks/batch` 요청
- **Then**: 두 종목 데이터 포함 응답 (200)

### Given: 빈 심볼 배열
- **When**: `POST /api/stocks/batch` 요청
- **Then**: 400 에러 반환

### Given: 31개 심볼 배열
- **When**: `POST /api/stocks/batch` 요청
- **Then**: 400 에러 반환 ("Maximum 30 symbols")

### Given: 캐시에 이미 있는 종목 데이터
- **When**: `POST /api/stocks/batch` 요청
- **Then**: 캐시 히트 데이터 반환 (키움 API 호출 없음)

---

## AC-004: usePollingData 훅

### Given: 장중 + stock-price 타입
- **When**: `usePollingData('stock-price', fetcher, 'stock-price')` 사용
- **Then**: 15초마다 fetcher 자동 호출

### Given: 주말 + stock-price 타입
- **When**: `usePollingData` 사용
- **Then**: `isPolling === false`, 초기 로드만 수행

### Given: 장중 → 폐장 전환
- **When**: 시간이 15:30을 넘어감
- **Then**: 폴링 인터벌이 자동으로 장외 인터벌로 변경

---

## AC-005: 서버 캐시 TTL 정합성

### Given: 주가 상세 캐시 TTL
- **When**: `CACHE_TTL_STOCK_DETAIL` 확인
- **Then**: 15초 (클라이언트 폴링 인터벌 15초와 동일)

### Given: 시장 지수 캐시 TTL
- **When**: `CACHE_TTL_INDEX` 확인
- **Then**: 30초 (클라이언트 폴링 인터벌 30초와 동일)

---

## AC-006: 기존 기능 무영향

### Given: 수동 새로고침 버튼
- **When**: 사용자가 새로고침 클릭
- **Then**: 정상적으로 데이터 갱신 (폴링과 독립적)

### Given: 주식 검색
- **When**: 검색어 입력
- **Then**: 기존과 동일하게 검색 결과 표시

### Given: 차트 타입 전환
- **When**: 일봉 → 분봉 전환
- **Then**: 정상적으로 차트 데이터 로드

---

## AC-007: API 호출 빈도 제한 준수

### Given: 관심종목 20개 + 장중
- **When**: 1분간 폴링
- **Then**: 키움 API 호출 ≤ 10회/분 (배치 조회 활용)

### Given: 장외 시간
- **When**: 1시간 경과
- **Then**: 실시간 데이터 API 호출 0회 (폴링 중지 또는 최소화)
