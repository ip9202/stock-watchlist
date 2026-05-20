# Stock Watchlist 프로젝트 메모리

## 프로젝트 개요
한국 주식 시장의 실시간 정보를 추적하고 관리하는 웹 애플리케이션

## 기술 스택
- Frontend: Next.js 15.5.2, React 19, TypeScript
- Backend: Next.js API Routes, Prisma 6.15.0
- Database: PostgreSQL 15
- Python: 3.12
- 데이터 소스: 키움 OpenAPI WebSocket (진행 중), PyKRX

## 최근 세션 (2026-02-26)
### 키움 OpenAPI WebSocket 연동
- **상태**: 진행 중
- **완료**: API 키 설정, 접근토큰 발급, WebSocket 연결 성공
- **문제**: 실시간 타입 코드 `0`이 사용하지 않는 타입이라 에러 발생
- **다음**: 올바른 타입 코드 확인 필요

### API 키 정보
- AppKey: `scripts/keys/appkey.txt`
- SecretKey: `scripts/keys/secretkey.txt`
- 환경변수: `.env.local`에도 설정

### 주요 파일
- `scripts/fetch_stock_data_kiwoom.py`: WebSocket 개별 종목 조회
- `scripts/fetch_all_stocks_kiwoom.py`: PyKRX 종목 검색
- `requirements.txt`: `websockets>=12.0` 추가

## 참고 URL
- 키움 OpenAPI: https://openapi.kiwoom.com
- 프로젝트: /Users/ip9202/develop/vibe/stock_watchlist
