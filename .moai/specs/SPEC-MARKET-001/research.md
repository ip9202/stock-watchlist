# SPEC-MARKET-001: 사전 조사 결과

## 키움 REST API — 업종(지수) 지원

### 확인된 TR 코드
| TR | 이름 | 용도 |
|----|------|------|
| ka20001 | 업종현재가요청 | 코스피/코스닥 현재 지수값 |
| ka20003 | 전업종지수요청 | 전체 업종 일괄 조회 |
| ka20004 | 업종틱차트 | 틱 차트 |
| ka20005 | 업종분봉차트 | 인트라데이 분봉 |
| ka20006 | 업종일봉차트 | 일봉 차트 |
| ka20009 | 업종현재가일별요청 | 일별 시세 |

### 업종코드
- 코스피: `'0001'`
- 코스닥: `'1001'`
- KOSPI200: `'0002'`

### 엔드포인트
- 차트: POST /api/dostk/chart (기존과 동일, api-id만 변경)
- 현재가: POST /api/dostk/stkpc 또는 별도 경로 (확인 필요)

## Frankfurter API — USD/KRW 환율

### 검증 완료
- 현재 환율: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW`
  - 응답: `{"amount":1.0,"base":"USD","date":"2026-03-16","rates":{"KRW":1490.75}}`
- 히스토리: `GET https://api.frankfurter.dev/v1/2026-02-15..2026-03-16?base=USD&symbols=KRW`
- API 키: 불필요
- Rate Limit: 없음
- 업데이트: ECB 기준 평일 1일 1회

## 기존 인프라 재사용 가능 항목
- KiwoomTokenManager (OAuth2 토큰)
- KiwoomStockAPI.requestWithTokenRetry (재시도 로직)
- cache.ts (in-memory 캐시)
- ChartContainer / chart-data-utils (lightweight-charts)
- SWR 패턴 (데이터 페칭)
- apiUrl / apiFetch (basePath 처리)
