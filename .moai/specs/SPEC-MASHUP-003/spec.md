# SPEC-MASHUP-003: stock_watchlist 시그널 프록시 API + UI 패널

**상태**: 구현 대기
**우선순위**: P1
**Wave**: 1 (SPEC-002 완료 후, SPEC-004/005와 병렬 실행)
**에이전트**: expert-frontend 1명
**프로젝트**: stock_watchlist (`/Users/ip9202/develop/vibe/stock_watchlist/`)
**선행조건**: SPEC-MASHUP-002 (CORS + API 스키마)
**예상 컨텍스트**: ~80K tokens

---

## 목표

stock_watchlist에 stock_auto의 AI 시그널을 표시하는 기능을 추가한다.

---

## 전제조건 (SPEC-002 완료 후 보장됨)

stock_auto FastAPI (14.49.182.30:8080)에서:
- `GET /api/mashup/signals` → `MashupSignalResponse` 반환
- `GET /api/mashup/signals/{stock_code}` → 개별 종목 시그널
- CORS로 ip9202.site 허용됨

---

## REQ-001: API 클라이언트 모듈

**EARS**: When stock_watchlist가 stock_auto API를 호출할 때, 공통 HTTP 클라이언트를 통해 요청해야 한다.

**구현 내용:**
- `src/lib/stock-auto/client.ts` 신규 생성
```typescript
const STOCK_AUTO_API_URL = process.env.STOCK_AUTO_API_URL || 'http://14.49.182.30:8080';

export async function fetchSignals() { ... }
export async function fetchSignalByCode(stockCode: string) { ... }
```
- 환경변수: `STOCK_AUTO_API_URL`
- 에러 핸들링: stock_auto 장애 시 null 반환 (Graceful Fallback)
- 타임아웃: 5초

**검증**: `fetchSignals()` 호출 시 정상 응답

---

## REQ-002: 시그널 프록시 API Route

**EARS**: When 프론트엔드가 `/api/signals`를 호출할 때, 서버 사이드에서 stock_auto API를 프록시해야 한다.

**구현 내용:**
- `src/app/api/signals/route.ts` 신규 생성
- `GET /api/signals` → stock_auto `/api/mashup/signals` 프록시
- `GET /api/signals/[stockCode]/route.ts` → 개별 종목 프록시
- 서버 사이드 렌더링 (API Key 숨김)
- 에러 시 빈 배열 반환

**검증**: `curl http://localhost:3000/api/signals` 정상 응답

---

## REQ-003: 시그널 카드 컴포넌트

**EARS**: When 사용자가 대시보드를 볼 때, AI 시그널 카드를 확인할 수 있어야 한다.

**구현 내용:**
- `src/components/signals/SignalCard.tsx` 신규 생성
- 표시 정보: 종목명, 종목코드, 시그널 타입(BUY/SELL/HOLD), 종합 점수, 주요 지표
- 디자인: 기존 stock_watchlist UI 스타일 매칭 (Tailwind)
- BUY=초록, SELL=빨강, HOLD=회색 색상 구분

**검증**: 시그널 데이터로 카드 렌더링

---

## REQ-004: 시그널 리스트 컴포넌트

**EARS**: When 시그널 패널이 표시될 때, 시그널 카드 리스트를 볼 수 있어야 한다.

**구현 내용:**
- `src/components/signals/SignalPanel.tsx` 신규 생성
- 시그널 카드 리스트 + 로딩 스켈레톤
- 빈 상태 ("아직 생성된 시그널이 없습니다")
- 에러 상태 (stock_auto 연결 실패 안내)
- 새로고침 버튼

**검증**: 목 데이터로 패널 렌더링

---

## REQ-005: 대시보드 통합

**EARS**: When 사용자가 메인 대시보드를 볼 때, 시그널 패널이 관심종목 옆에 표시되어야 한다.

**구현 내용:**
- 기존 대시보드 페이지에 SignalPanel 추가
- 레이아웃: 관심종목 패널 우측 또는 하단에 배치
- 반응형: 모바일에서는 하단으로 이동

**검증**: 대시보드에서 시그널 패널 표시

---

## 파일 소유권

| 파일 | 작업 | 위치 |
|------|------|------|
| `src/lib/stock-auto/client.ts` | 신규 | stock_watchlist |
| `src/app/api/signals/route.ts` | 신규 | stock_watchlist |
| `src/app/api/signals/[stockCode]/route.ts` | 신규 | stock_watchlist |
| `src/components/signals/SignalCard.tsx` | 신규 | stock_watchlist |
| `src/components/signals/SignalPanel.tsx` | 신규 | stock_watchlist |
| 대시보드 페이지 | 수정 | stock_watchlist |

## 인수 기준

- [ ] 프록시 API로 시그널 데이터 조회 가능
- [ ] 시그널 카드에 종목명/타입/점수/지표 표시
- [ ] stock_auto 장애 시 Graceful Fallback 동작
- [ ] 기존 관심종목/차트 기능 영향 없음
- [ ] Vitest 테스트 통과

---

## stock_auto API 응답 참조

```typescript
// GET /api/mashup/signals 응답
interface MashupSignalResponse {
  signals: {
    stock_code: string;
    stock_name: string;
    signal_type: "BUY" | "SELL" | "HOLD";
    score: number;         // 0.0~1.0
    indicators: {
      supertrend?: string;
      rsi?: number;
      macd?: string;
      divergence?: string;
      bollinger_bands?: string;
      atr?: number;
    };
    created_at: string;    // ISO 8601
  }[];
  count: number;
  generated_at: string;    // ISO 8601
}
```
