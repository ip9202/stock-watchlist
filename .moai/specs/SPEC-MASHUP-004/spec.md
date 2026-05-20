# SPEC-MASHUP-004: stock_watchlist 발굴 프록시 API + UI 패널

**상태**: 구현 대기
**우선순위**: P1
**Wave**: 1 (SPEC-002 완료 후, SPEC-003/005와 병렬 실행)
**에이전트**: expert-frontend 1명
**프로젝트**: stock_watchlist (`/Users/ip9202/develop/vibe/stock_watchlist/`)
**선행조건**: SPEC-MASHUP-002 (CORS + API 스키마)
**예상 컨텍스트**: ~80K tokens

---

## 목표

stock_watchlist에 stock_auto의 AI 종목 발굴 결과를 표시하는 기능을 추가한다.

---

## 전제조건 (SPEC-002 완료 후 보장됨)

stock_auto FastAPI (14.49.182.30:8080)에서:
- `GET /api/mashup/discoveries` → `MashupDiscoveryResponse` 반환
- `GET /api/mashup/discoveries/{stock_code}` → 개별 종목 발굴
- CORS로 ip9202.site 허용됨

---

## REQ-001: 발굴 API 클라이언트

**EARS**: When stock_watchlist가 발굴 데이터를 요청할 때, stock_auto API를 호출해야 한다.

**구현 내용:**
- `src/lib/stock-auto/client.ts`에 발굴 API 함수 추가 (SPEC-003에서 생성한 파일)
```typescript
export async function fetchDiscoveries() { ... }
export async function fetchDiscoveryByCode(stockCode: string) { ... }
```
- SPEC-003과 파일 공유: `src/lib/stock-auto/client.ts`
- **의존성**: SPEC-003의 REQ-001이 먼저 파일 생성해야 할 수 있음
- **해결**: 이 SPEC에서 client.ts를 생성하고, SPEC-003에서도 같이 사용
- **주의**: 병렬 실행 시 client.ts 충돌 가능 → 파일 소유권: SPEC-003이 client.ts 소유

**대체 방안**: SPEC-003이 client.ts 생성, 이 SPEC은 별도 `src/lib/stock-auto/discovery-client.ts` 사용 후 나중에 병합

**검증**: 발굴 API 호출 정상

---

## REQ-002: 발굴 프록시 API Route

**EARS**: When 프론트엔드가 `/api/discoveries`를 호출할 때, 서버 사이드에서 stock_auto API를 프록시해야 한다.

**구현 내용:**
- `src/app/api/discoveries/route.ts` 신규 생성
- `GET /api/discoveries` → stock_auto `/api/mashup/discoveries` 프록시
- `GET /api/discoveries/[stockCode]/route.ts` → 개별 종목 프록시
- 에러 시 빈 배열 반환

**검증**: `curl http://localhost:3000/api/discoveries` 정상 응답

---

## REQ-003: 발굴 카드 컴포넌트

**EARS**: When 사용자가 발굴 패널을 볼 때, AI 발굴 종목 카드를 확인할 수 있어야 한다.

**구현 내용:**
- `src/components/discovery/DiscoveryCard.tsx` 신규 생성
- 표시 정보: 종목명, 종목코드, 발굴 점수, 등급(S/A/B/C), 센티먼트, 발굴 사유
- 등급 색상: S=금색, A=초록, B=파랑, C=회색
- "관심종목 추가" 버튼 (기존 WatchlistManager 연동)

**검증**: 발굴 데이터로 카드 렌더링

---

## REQ-004: 발굴 리스트 컴포넌트

**EARS**: When 발굴 패널이 표시될 때, 발굴 카드 리스트를 볼 수 있어야 한다.

**구현 내용:**
- `src/components/discovery/DiscoveryPanel.tsx` 신규 생성
- 발굴 카드 리스트 + 등급별 필터 탭 (전체/S/A/B/C)
- 로딩 스켈레톤
- 빈 상태 ("아직 발굴된 종목이 없습니다")
- 정렬: 발굴 점수 내림차순

**검증**: 목 데이터로 패널 렌더링

---

## REQ-005: 대시보드 통합

**EARS**: When 사용자가 메인 대시보드를 볼 때, 발굴 패널이 표시되어야 한다.

**구현 내용:**
- 기존 대시보드 페이지에 DiscoveryPanel 추가
- **주의**: SPEC-003도 대시보드를 수정 → 병렬 실행 시 충돌 가능
- **해결**: 별도 페이지 `/stocks/discovery`로 분리 (병렬 실행 안전)
- 또는: 대시보드 수정은 마지막에 순차 적용

**검증**: 발굴 페이지 또는 패널에서 발굴 종목 표시

---

## 파일 소유권

| 파일 | 작업 | 소유권 |
|------|------|--------|
| `src/lib/stock-auto/discovery-client.ts` | 신규 | 이 SPEC |
| `src/app/api/discoveries/route.ts` | 신규 | 이 SPEC |
| `src/app/api/discoveries/[stockCode]/route.ts` | 신규 | 이 SPEC |
| `src/components/discovery/DiscoveryCard.tsx` | 신규 | 이 SPEC |
| `src/components/discovery/DiscoveryPanel.tsx` | 신규 | 이 SPEC |

## 인수 기준

- [ ] 프록시 API로 발굴 데이터 조회 가능
- [ ] 발굴 카드에 종목명/등급/점수/센티먼트/사유 표시
- [ ] 등급별 필터링 동작
- [ ] "관심종목 추가" 버튼 동작
- [ ] stock_auto 장애 시 Graceful Fallback
- [ ] Vitest 테스트 통과

---

## stock_auto API 응답 참조

```typescript
// GET /api/mashup/discoveries 응답
interface MashupDiscoveryResponse {
  discoveries: {
    stock_code: string;
    stock_name: string;
    discovery_score: number;  // 0~100
    grade: "S" | "A" | "B" | "C";
    sentiment: number;        // -1.0~1.0
    reason: string;
    created_at: string;       // ISO 8601
  }[];
  count: number;
}
```
