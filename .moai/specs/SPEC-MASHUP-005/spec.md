# SPEC-MASHUP-005: 관심종목 동기화 (stock_watchlist ↔ stock_auto)

**상태**: 구현 대기
**우선순위**: P1
**Wave**: 1 (SPEC-002 완료 후, SPEC-003/004와 병렬 실행)
**에이전트**: expert-backend 1명
**프로젝트**: stock_watchlist (`/Users/ip9202/develop/vibe/stock_watchlist/`) 주력, stock_auto API 호출
**선행조건**: SPEC-MASHUP-002 (CORS + 동기화 수신 API)
**예상 컨텍스트**: ~70K tokens

---

## 목표

stock_watchlist에서 관심종목 추가/삭제 시 stock_auto에 자동 동기화한다.

---

## 전제조건 (SPEC-002 완료 후 보장됨)

stock_auto FastAPI (14.49.182.30:8080)에서:
- `POST /api/mashup/sync/watchlist` → 관심종목 동기화 수신
- `DELETE /api/mashup/sync/watchlist/{stock_code}` → 관심종목 제거 수신

---

## REQ-001: 동기화 클라이언트

**EARS**: When 관심종목이 변경될 때, stock_auto 동기화 API를 호출해야 한다.

**구현 내용:**
- `src/lib/stock-auto/sync-client.ts` 신규 생성
```typescript
export async function syncWatchlistAdd(stockCode: string, stockName: string, market: string): Promise<boolean>
export async function syncWatchlistRemove(stockCode: string): Promise<boolean>
```
- 비차단 (fire-and-forget 기본, 실패해도 UI 동작에 영향 없음)
- 재시도 로직: 1회 재시도 후 실패 시 콘솔 경고만
- 타임아웃: 3초

**검증**: 함수 호출 시 stock_auto API 요청 전송

---

## REQ-002: 관심종목 추가 시 동기화

**EARS**: When 사용자가 관심종목을 추가할 때, stock_auto에도 동기화되어야 한다.

**구현 내용:**
- 기존 `src/app/api/watchlist/route.ts` (POST) 수정
- 기존 Prisma DB 저장 후, stock_auto 동기화 API 호출
- 동기화 실패 시: 기존 로컬 저장은 유지, 에러 로깅만
- source 필드: "stock_watchlist"로 설정

**검증**: watchlist 추가 후 stock_auto DB에도 종목 존재

---

## REQ-003: 관심종목 삭제 시 동기화

**EARS**: When 사용자가 관심종목을 삭제할 때, stock_auto에도 반영되어야 한다.

**구현 내용:**
- 기존 `src/app/api/watchlist/[id]/route.ts` (DELETE) 수정
- 기존 Prisma DB 삭제 후, stock_auto 동기화 API 호출
- 동기화 실패 시: 기존 로컬 삭제는 유지, 에러 로깅만

**검증**: watchlist 삭제 후 stock_auto DB에서도 종목 제거

---

## REQ-004: 동기화 상태 표시 (선택)

**EARS**: When 동기화가 실패할 때, 사용자에게 상태를 표시할 수 있어야 한다.

**구현 내용:**
- 동기화 실패 시 토스트 알림 표시 (선택적)
- "stock_auto 동기화 실패. AI 분석이 업데이트되지 않을 수 있습니다."
- 성공 시에는 알림 없음 (조용한 동기화)

**검증**: 동기화 실패 시 토스트 표시

---

## REQ-005: 초기 동기화 (부트스트랩)

**EARS**: When 시스템이 처음 연결될 때, 기존 관심종목을 stock_auto에 동기화할 수 있어야 한다.

**구현 내용:**
- `src/scripts/sync-watchlist.ts` 신규 (수동 실행 스크립트)
- stock_watchlist DB의 전체 관심종목을 stock_auto에 POST
- 중복 무시 (stock_auto unique 제약)
- 실행: `npx tsx src/scripts/sync-watchlist.ts`

**검증**: 스크립트 실행 후 stock_auto DB에 종목 반영

---

## 파일 소유권

| 파일 | 작업 | 소유권 |
|------|------|--------|
| `src/lib/stock-auto/sync-client.ts` | 신규 | 이 SPEC |
| `src/app/api/watchlist/route.ts` | 수정 | 이 SPEC |
| `src/app/api/watchlist/[id]/route.ts` | 수정 | 이 SPEC |
| `src/scripts/sync-watchlist.ts` | 신규 | 이 SPEC |

## 인수 기준

- [ ] 관심종목 추가 시 stock_auto 자동 동기화
- [ ] 관심종목 삭제 시 stock_auto 자동 동기화
- [ ] 동기화 실패 시 기존 기능 정상 동작
- [ ] 부트스트랩 스크립트로 초기 동기화 가능
- [ ] 기존 watchlist 기능 영향 없음
- [ ] Vitest 테스트 통과

---

## stock_auto 동기화 API 참조

```typescript
// POST /api/mashup/sync/watchlist 요청
interface WatchlistSyncRequest {
  stock_code: string;
  stock_name: string;
  market: string;
  source: string;  // "stock_watchlist"
}

// DELETE /api/mashup/sync/watchlist/{stock_code}
// 응답: { "success": true }
```
