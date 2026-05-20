# Session: 뉴스/공시 API Python→Node.js 전환 (2026-03-12)

## 문제
- 최근뉴스 카드와 공시 카드에서 데이터 로딩 실패 (500 에러)
- 원인: Python `requests` 모듈 미설치 + conda 미설치 → executeScript 실패
- 프론트엔드 catch 블록에서 loading state 미리셋 → 무한 스켈레톤

## 해결
1. `src/app/api/stocks/[symbol]/news/route.ts` — Python 제거, Node.js fetch로 네이버 뉴스 API 직접 호출 + 샘플 데이터 fallback
2. `src/app/api/stocks/[symbol]/disclosure/route.ts` — Python 제거, Node.js fetch로 DART API 직접 호출 + 빈 배열 fallback
3. `src/app/stock/[symbol]/page.tsx` — catch 블록에 setNewsLoading(false), setDisclosureLoading(false) 추가
4. `src/lib/api.ts` — apiUrl, apiFetch 헬퍼 추가 (basePath 지원)

## 커밋 & 배포
- Commit: 47b1eb6 `fix: 뉴스/공시 API를 Python에서 Node.js로 전환`
- 배포: `./deploy/deploy.sh` → ip9202.site/stocks 배포 완료
- 110 tests passed, tsc clean

## 핵심 교훈
- Python 스크립트 의존 API는 환경 문제에 취약 → Node.js native fetch가 안정적
- 프론트엔드 비동기 catch 블록에서 반드시 loading state 리셋 필요
