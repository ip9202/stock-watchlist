# SPEC-CHART-001 Research: 키움 REST API 차트 기능

## 1. 코드베이스 분석 (Researcher)

### 현재 API 패턴
- **엔드포인트**: POST `https://api.kiwoom.com/api/dostk/stkinfo` (시세 정보)
- **차트 엔드포인트**: POST `https://api.kiwoom.com/api/dostk/chart` (신규)
- **헤더 구분**: `api-id` 헤더로 TR 구분 (ka10001, ka10099 등)
- **인증**: Bearer token + appkey + appsecret

### 핵심 파일 참조
| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `src/lib/kiwoom-stock-api.ts` | REST 클라이언트 | L81-323, createHeaders(L285), parseSignedNumber(L299) |
| `src/lib/kiwoom-token-manager.ts` | OAuth2 토큰 관리 | 싱글톤, 자동갱신, 3회 재시도 |
| `src/lib/cache.ts` | 인메모리 캐시 | TTL 기반, 5분마다 정리 |
| `src/app/api/stocks/[symbol]/route.ts` | API 라우트 패턴 | cache → miss → API → cache → 응답 |
| `src/app/stock/[symbol]/page.tsx` | 종목 상세 페이지 | L418-441: 외부 차트 링크 영역 (교체 대상) |
| `src/types/stock.ts` | 타입 정의 | StockDetail, StockInfo 인터페이스 |

### 숫자 파싱 유틸리티 (재사용 가능)
- `parseSignedNumber("+190000")` → 190000 (부호 포함, 절대값 반환)
- `parseNumber("173500")` → 173500 (부호 없음)

### 차트 API 페이지네이션
- `cont-yn` 헤더: Y/N으로 연속 조회 여부 표시
- `next-key` 헤더: 다음 페이지 키
- 기존 코드에 페이지네이션 패턴 없음 → 신규 구현 필요

### 프론트엔드 현황
- 차트 라이브러리 미설치 (package.json 확인)
- 종목 상세 페이지에 외부 차트 링크(네이버, 다음) 존재 → 인앱 차트로 대체
- SWR 2.3.6으로 데이터 페칭, Tailwind CSS v4, lucide-react 아이콘

### 테스트 현황
- Vitest 3.2.4, 36개 테스트, ~90% 커버리지
- vi.mock() 패턴으로 외부 의존성 모킹
- 최소 요구: 커밋당 80%, 전체 85%

---

## 2. 요구사항 분석 (Analyst)

### 사용자 스토리
- US-CHART-001: 종목 상세 페이지에서 가격 추이 차트 보기
- US-CHART-002: 1M/3M/6M/1Y/5Y 시간프레임 선택
- US-CHART-003: 캔들스틱/라인 차트 전환
- US-CHART-004: 기간별 차트 API 자동 매핑 (일봉/주봉)

### EARS 형식 수용 기준
- **When** 종목 상세 페이지 진입 → 1개월 일봉 차트 자동 표시 (< 2초)
- **When** 시간프레임 전환 → 해당 구간 데이터 재로드 (< 2초)
- **When** 캔들/라인 전환 → 동일 데이터 즉시 재렌더링 (< 500ms, API 재호출 없음)
- **If** API 실패 → 오류 메시지 + 재시도 버튼
- **Where** 모바일 → 풀 너비 반응형 차트

### 시간프레임 → API 매핑
| 시간프레임 | api-id | 데이터 포인트 (약) |
|-----------|--------|-------------------|
| 1M | ka10081 (일봉) | ~22 |
| 3M | ka10081 (일봉) | ~66 |
| 6M | ka10081 (일봉) | ~132 |
| 1Y | ka10081 (일봉) | ~252 |
| 5Y | ka10082 (주봉) | ~260 |

### MoSCoW 우선순위
- **Must**: 일봉 차트, 1M/3M/6M/1Y, 5Y 주봉, 캔들/라인 전환, 로딩/에러 처리
- **Should**: 차트 캐싱 (5분 TTL), 반응형 모바일, 접근성
- **Could**: 분봉, 거래량 바, 이동평균선
- **Won't**: 실시간 WebSocket, 기술적 지표(MACD/RSI), 틱 차트

### 핵심 리스크
- **R-001 (HIGH)**: ka10081 응답 필드명 미확인 → API 테스트 스크립트로 사전 확인 필요
- **R-002 (MEDIUM)**: 차트 라이브러리 번들 크기 → lightweight-charts 45KB 권장
- **R-003 (MEDIUM)**: 키움 API Rate Limit 미확인
- **R-004 (LOW)**: 모바일 대용량 캔들스틱 렌더링 성능

---

## 3. 기술 설계 (Architect)

### 백엔드 설계

**권장: KiwoomStockAPI 클래스 확장**
- createHeaders(), parseSignedNumber() 등 유틸 재사용
- 새 엔드포인트 상수: `CHART_ENDPOINT = /api/dostk/chart`
- fetchChart() 메서드 추가

**API Route**: `GET /api/stocks/[symbol]/chart?period=daily&from=20240101&to=20241231`
- period: daily (ka10081) | weekly (ka10082) | monthly (ka10083)
- 기존 캐시 패턴 재사용

**페이지네이션**: 서버사이드 투명 누적 (최대 5회 자동 요청)

**캐시 TTL**:
| 기간 | TTL |
|------|-----|
| 일봉 | 1시간 |
| 주봉 | 1일 |
| 월봉 | 1일 |

### 프론트엔드 설계

**차트 라이브러리: lightweight-charts (TradingView)**
| 항목 | lightweight-charts | recharts | chart.js |
|------|-------------------|----------|----------|
| 번들 | ~45KB | ~150KB | ~70KB |
| 캔들스틱 | 네이티브 | 별도 구현 | 플러그인 |
| 성능 | WebGL 기반 | React 재렌더링 | Canvas |

**컴포넌트 구조**:
```
src/components/chart/
├── StockChart.tsx        # SWR 데이터 페칭 + dynamic import
├── ChartContainer.tsx    # lightweight-charts 렌더링 (client-only)
├── ChartToolbar.tsx      # 기간 선택 UI
└── index.ts
```

**코드 스플리팅**: `dynamic(() => import('./ChartContainer'), { ssr: false })`

### 파일 영향 분석

**신규 파일 (4개)**:
- `src/app/api/stocks/[symbol]/chart/route.ts` - Chart API 엔드포인트
- `src/components/chart/StockChart.tsx` - 차트 컨테이너
- `src/components/chart/ChartContainer.tsx` - lightweight-charts 렌더링
- `src/components/chart/ChartToolbar.tsx` - 기간 선택 UI

**수정 파일 (3개)**:
- `src/lib/kiwoom-stock-api.ts` - fetchChart() 추가
- `src/types/stock.ts` - ChartCandle, ChartData 타입 추가
- `src/app/stock/[symbol]/page.tsx` - StockChart 컴포넌트 삽입

**테스트 파일 (2개)**:
- `src/lib/__tests__/kiwoom-chart-api.test.ts`
- `src/app/api/stocks/[symbol]/chart/__tests__/route.test.ts`

### 데이터 플로우
```
ChartToolbar (기간 선택) → StockChart (SWR fetch)
→ GET /api/stocks/[symbol]/chart?period=daily&from=...
→ cache.get() → MISS → KiwoomStockAPI.fetchChart()
→ POST /api/dostk/chart (api-id: ka10081)
→ 페이지네이션 자동 누적 → OHLCV 변환
→ cache.set() → ApiResponse<ChartData> 반환
→ ChartContainer (lightweight-charts 렌더링)
```

### OHLCV 타입 정의
```typescript
interface ChartCandle {
  date: string      // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartData {
  symbol: string
  period: 'daily' | 'weekly' | 'monthly'
  candles: ChartCandle[]
}
```
