---
id: SPEC-API-001
title: 키움증권 REST API 완전 전환 - 구현 계획
version: 1.0.0
status: Planned
created: 2026-03-10
updated: 2026-03-10
author: 강력쇠주먹
tags: [api-migration, kiwoom, rest-api, implementation-plan]
---

# SPEC-API-001: 구현 계획

## 파일 영향 분석 (File Impact Analysis)

### 수정 대상 파일

| 파일 경로 | 변경 유형 | 설명 |
|-----------|-----------|------|
| `scripts/fetch_stock_data_kiwoom.py` | **대규모 수정** | WebSocket -> REST API 전환 |
| `scripts/fetch_all_stocks_kiwoom.py` | **대규모 수정** | PyKRX -> Kiwoom REST API 전환 |
| `src/app/api/stocks/[symbol]/route.ts` | **중규모 수정** | Python 스크립트 호출 방식 변경 또는 직접 HTTP 호출 |
| `src/app/api/stocks/route.ts` | **중규모 수정** | Python 스크립트 호출 방식 변경 또는 직접 HTTP 호출 |
| `src/lib/python-executor.ts` | **소규모 수정** | 새 스크립트 경로 반영 (Python 방식 유지 시) |
| `requirements.txt` | **소규모 수정** | `pykrx` 제거, `websockets` 제거 가능 |
| `Dockerfile` | **소규모 수정** | Python 패키지 변경 반영 |

### 신규 생성 대상 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/lib/kiwoom-api.ts` (선택) | TypeScript Kiwoom REST API 클라이언트 (Python 제거 시) |
| `scripts/kiwoom_token.py` (선택) | 공용 토큰 관리 모듈 (Python 유지 시) |

### 삭제 또는 비활성화 대상 파일

| 파일 경로 | 설명 |
|-----------|------|
| `scripts/fetch_stocks_kiwoom_rest.py` | 기존 부분 구현 -> 통합 후 삭제 |
| PyKRX 캐시 파일 (`all_stocks_kiwoom_cache.json`) | 새 캐시 구조로 교체 |

### 변경 없음 (확인 완료)

| 파일 경로 | 사유 |
|-----------|------|
| `scripts/fetch_stock_news.py` | Naver News API 사용 - 변경 불필요 |
| `scripts/fetch_disclosure.py` | DART API 사용 - 변경 불필요 |
| `src/components/**` | 프론트엔드 - API 응답 형식 동일 |
| `prisma/schema.prisma` | DB 스키마 변경 없음 |

---

## 구현 접근 방식 결정

### 방식 A: Python 스크립트 유지 (점진적 전환)

- Python 스크립트 내부에서 WebSocket/PyKRX -> REST API HTTP 호출로만 변경
- `child_process` 호출 구조 유지
- **장점**: 최소 변경, 기존 구조 유지, 안전한 전환
- **단점**: Python 프로세스 생성 오버헤드 유지

### 방식 B: TypeScript 직접 구현 (완전 전환)

- TypeScript에서 `fetch`로 키움 REST API를 직접 호출
- Python `child_process` 제거
- **장점**: 프로세스 생성 오버헤드 제거, 단일 언어, 더 나은 에러 처리
- **단점**: 변경 범위 큼, 검색 로직 TypeScript 재구현 필요

### 권장 결정: 방식 A (Python 스크립트 유지)

- 이유: 검색 로직이 이미 Python으로 잘 구현되어 있고, 변경 범위를 최소화하여 안정성 확보
- 향후 방식 B로의 전환은 별도 SPEC으로 계획 가능

---

## 마일스톤별 작업 분해

### Primary Goal: 토큰 관리 모듈 구현

**대상 요구사항**: REQ-001

**작업 목록**:

1. `scripts/kiwoom_token.py` 공용 토큰 관리 모듈 생성
   - `POST https://api.kiwoom.com/oauth2/token` 호출
   - 토큰 캐시 (파일 기반 또는 메모리)
   - 토큰 만료 전 자동 갱신
   - 에러 시 재시도 (최대 3회, 지수 백오프)
2. 기존 스크립트의 중복 토큰 발급 코드를 공용 모듈로 통합
3. 환경변수 `KIWOOM_APP_KEY`, `KIWOOM_SECRET_KEY` 검증 로직 추가

**완료 조건**: 토큰 발급, 캐시, 자동 갱신이 동작하고 모든 스크립트에서 공용으로 사용 가능

---

### Secondary Goal: 종목 리스트 조회 전환 (PyKRX -> REST API)

**대상 요구사항**: REQ-002, REQ-005, REQ-007

**작업 목록**:

1. 키움 REST API에서 전체 종목 리스트를 제공하는 엔드포인트 확인
   - `/api/dostk/stkbasic` 또는 `/api/dostk/caf07010` 등 후보 검증
   - openapi.kiwoom.com 공식 가이드에서 TR 코드 및 파라미터 확인
2. `scripts/fetch_all_stocks_kiwoom.py` 수정
   - `get_all_stocks_pykrx()` -> `get_all_stocks_kiwoom_rest()` 전환
   - PyKRX import 제거
   - REST API 호출로 KOSPI/KOSDAQ 종목 리스트 조회
   - 기존 응답 형식 유지: `{ symbol, name, market, search_keywords }`
3. 검색 로직 (`search_stocks()`) 유지 - 변경 불필요
4. 캐시 전략 유지: 7일 TTL, JSON 파일 캐시
5. `requirements.txt`에서 `pykrx` 제거

**API 엔드포인트 매핑**:

| 현재 (PyKRX) | 전환 후 (Kiwoom REST) |
|--------------|----------------------|
| `stock.get_market_ticker_list("KOSPI")` | `GET /api/dostk/stkbasic` 또는 해당 TR |
| `stock.get_market_ticker_name(ticker)` | 위 API 응답의 `name` 필드 |

**완료 조건**: `/api/stocks?q=삼성` 호출 시 키움 REST API 기반으로 검색 결과 반환, PyKRX 의존성 제거

---

### Tertiary Goal: 개별 종목 시세 전환 (WebSocket -> REST API)

**대상 요구사항**: REQ-003, REQ-004, REQ-005, REQ-007

**작업 목록**:

1. 키움 REST API 시세 엔드포인트 확인 및 응답 필드 매핑
   - `/api/dostk/mdstock` (ka10001: 주식현재가시세) 응답 구조 분석
   - StockInfo 인터페이스 필드와 REST API 응답 필드 1:1 매핑 작성
2. `scripts/fetch_stock_data_kiwoom.py` 전면 재작성
   - WebSocket 연결 코드 전체 제거
   - REST API `requests.get()` 호출로 대체
   - `parse_websocket_data()` -> `parse_rest_data()` 전환
   - 모든 StockInfo 필드를 실제 데이터로 채움 (0 반환 제거)
3. 52주 최고가/최저가 데이터 확보
   - 주식현재가시세에 포함되지 않는 경우 `/api/dostk/stkbasic` 등 추가 API 호출
4. `requirements.txt`에서 `websockets` 의존성 제거 (시세 조회에만 사용한 경우)

**API 엔드포인트 매핑**:

| 현재 (WebSocket) | 전환 후 (REST API) |
|------------------|-------------------|
| `wss://api.kiwoom.com:10000/api/dostk/websocket` (LOGIN -> REG -> 데이터 수신) | `GET /api/dostk/mdstock?tr_id=ka10001&stk_cd={symbol}` |
| WebSocket `output.price` | REST `output.stk_prpr` (현재가) |
| WebSocket `output.change` | REST `output.prdy_vrss` (전일 대비) |
| WebSocket `output.change_rate` | REST `output.prdy_ctrt` (전일 대비율) |
| WebSocket `output.volume` | REST `output.acml_vol` (누적 거래량) |
| (0 반환) marketCap | REST API에서 확인 필요 |
| (0 반환) high52w / low52w | REST 종목정보 API에서 확인 필요 |

**완료 조건**: `/api/stocks/005930` 호출 시 모든 StockInfo 필드가 실제 데이터로 채워져 반환

---

### Final Goal: 통합 및 정리

**대상 요구사항**: REQ-006, REQ-007

**작업 목록**:

1. `src/app/api/stocks/route.ts` 업데이트
   - 새 Python 스크립트 경로 반영
   - 에러 처리 통일
2. `src/app/api/stocks/[symbol]/route.ts` 업데이트
   - 새 Python 스크립트 경로 반영
   - 에러 처리 통일
3. `scripts/fetch_stocks_kiwoom_rest.py` 삭제 (통합 완료 후)
4. `Dockerfile` 업데이트 (Python 패키지 변경 반영)
5. `docker-compose.yml` 검증
6. 환경변수 문서화 업데이트

**완료 조건**: 전체 API가 키움 REST API만으로 동작, 불필요한 파일 및 의존성 제거 완료

---

## 리스크 분석

### 리스크 1: 키움 REST API 종목 리스트 엔드포인트 부재

- **위험도**: 중간
- **설명**: 키움 REST API에 전체 종목 리스트를 한 번에 조회하는 엔드포인트가 없을 수 있음
- **대응**: API 가이드에서 확인 후, 없는 경우 업종별 종목 조회 API를 반복 호출하거나 PyKRX를 fallback으로 유지

### 리스크 2: REST API 응답 필드 불완전

- **위험도**: 중간
- **설명**: 단일 REST API 호출로 StockInfo의 모든 필드를 채울 수 없을 수 있음
- **대응**: 2개 이상의 REST API 엔드포인트를 조합하여 데이터 보완 (예: 시세 + 종목정보)

### 리스크 3: API Rate Limit

- **위험도**: 낮음
- **설명**: 키움 REST API의 호출 제한에 도달할 수 있음
- **대응**: 기존 캐시 전략 유지 (30초 TTL)로 호출 최소화, Rate Limit 초과 시 429 에러 처리

### 리스크 4: 모의투자/실전투자 URL 분기

- **위험도**: 낮음
- **설명**: 개발환경에서는 `mockapi.kiwoom.com`을, 프로덕션에서는 `api.kiwoom.com`을 사용해야 함
- **대응**: 환경변수 `KIWOOM_API_MODE=mock|live`로 분기, 기본값 `live`

### 리스크 5: Python child_process 안정성

- **위험도**: 낮음
- **설명**: REST API로 전환해도 Python child_process 구조는 유지되므로 프로세스 생성 오버헤드 존재
- **대응**: 현재 SPEC 범위에서는 허용, 향후 TypeScript 직접 호출 SPEC으로 해결

---

## API 엔드포인트 참고 (키움 OpenAPI) ✅ 실제 테스트 검증 완료 (2026-03-10)

### 인증 ✅ 확인됨

```
POST https://api.kiwoom.com/oauth2/token
Content-Type: application/json;charset=UTF-8

{
  "grant_type": "client_credentials",
  "appkey": "{KIWOOM_APP_KEY}",
  "secretkey": "{KIWOOM_SECRET_KEY}"
}

Response: { "return_code": 0, "token": "...", "token_type": "bearer", "expires_dt": "..." }
```

### 전체 종목 리스트 ✅ 테스트 완료 (ka10099)

```
POST https://api.kiwoom.com/api/dostk/stkinfo
Authorization: Bearer {token}
Content-Type: application/json;charset=UTF-8
api-id: ka10099

Body:
  { "mrkt_tp": "0" }   # "0"=KOSPI(2,417종목), "10"=KOSDAQ(1,820종목)

Response:
{
  "return_code": 0,
  "return_msg": "정상적으로 처리되었습니다",
  "list": [
    {
      "code": "005930",        # 종목코드 → symbol
      "name": "삼성전자",       # 종목명 → name
      "listCount": "...",      # 상장주식수 (0-padded 문자열)
      "lastPrice": "00188400", # 전일 종가 (0-padded)
      "marketCode": "0",       # 시장구분 (0=거래소/KOSPI, 10=코스닥)
      "marketName": "거래소",
      "upName": "전기·전자",   # 업종명
      "kind": "A"              # 종목구분 (A=보통주)
    }, ...
  ]
}

헤더 응답:
  cont-yn: "N"   # 연속 조회 여부 (N=마지막 페이지)
```

> ✅ 단일 호출로 KOSPI 전체(2,417개), KOSDAQ 전체(1,820개) 반환 - 페이징 불필요

### 현재가 시세 ✅ 테스트 완료 (ka10001)

```
POST https://api.kiwoom.com/api/dostk/stkinfo
Authorization: Bearer {token}
Content-Type: application/json;charset=UTF-8
api-id: ka10001

Body:
  { "stk_cd": "005930" }

Response 필드 매핑 (StockInfo):
  stk_cd       → symbol          (종목코드)
  stk_nm       → name            (종목명)
  cur_prc      → price           (현재가, 부호+값: "+188400" → 188400)
  pred_pre     → changeAmount    (전일대비, "+14900" → 14900)
  flu_rt       → changePercent   (등락률, "+8.59" → 8.59)
  trde_qty     → volume          (누적거래량)
  mac          → marketCap       (시가총액, 단위: 백만원)
  flo_stk      → sharesOutstanding (유동주식수, 단위: 천주)
  open_pric    → open            (시가, 부호+값)
  high_pric    → high            (고가, 부호+값)
  low_pric     → low             (저가, 부호+값)
  base_pric    → previousClose   (기준가/전일종가, 부호없음)
  oyr_hgst     → high52w         (52주최고가, 부호+값 → 절대값)
  oyr_lwst     → low52w          (52주최저가, 부호+값 → 절대값)
  trde_pre     → volumeRatio     (거래량 전일비율, 30일 평균비가 아닌 전일대비%)

# ⚠️ tradingValue (거래대금) 필드 없음 → trde_qty × abs(cur_prc) 로 계산
# ⚠️ 부호 처리: "+188400" → int("+188400") = 188400 (Python int() 지원)
# ⚠️ sharesOutstanding: flo_stk는 유동주식수(floating), listCount(ka10099)가 상장주식수

부가 정보 필드:
  per, pbr, eps, roe, bps, ev → extra_info로 저장
  250hgst, 250lwst           → extra_info (250일 최고/최저)
  for_exh_rt                 → extra_info (외국인 보유율)
```

### 이미 구현된 참고 코드

`scripts/fetch_stocks_kiwoom_rest.py` - 구조는 유사하나 잘못된 엔드포인트(caf07010) 사용 → **전면 교체 필요**

> **구현 시 주의사항**:
> 1. 종목 리스트 엔드포인트: `caf07010` (기존 코드) → `stkinfo + ka10099` (검증됨) 로 교체
> 2. 현재가 엔드포인트: WebSocket → `stkinfo + ka10001` (검증됨) 로 교체
> 3. 모든 가격 필드에서 부호 제거: `+188400` → `188400`, `-52500` → `52500`
> 4. `tradingValue`는 `trde_qty × abs(cur_prc)` 로 계산 (직접 필드 없음)
