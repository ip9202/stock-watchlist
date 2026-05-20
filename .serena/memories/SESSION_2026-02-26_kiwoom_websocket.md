# 키움 OpenAPI WebSocket 연동 세션

## 날짜
2026-02-26

## 작업 내용
키움증권 OpenAPI WebSocket을 사용한 주식 데이터 조회 시스템 구축

## 완료된 작업
1. **API 키 설정 완료**
   - AppKey: `drdExBmXY0S8siLGH0IqQgsMsoxJdSojpuCQuGqLOrc`
   - SecretKey: `OS9emePxrKQSshyRiV-FsAonQOJfQdlx3JHR42NLkds`
   - 위치: `scripts/keys/`, `.env.local`

2. **접근토큰 발급 성공**
   - URL: `https://api.kiwoom.com/oauth2/token`
   - 방식: Client Credentials Grant
   - 파라미터: `appkey`, `secretkey`, `grant_type=client_credentials`

3. **WebSocket 연결 성공**
   - URL: `wss://api.kiwoom.com:10000/api/dostk/websocket`
   - 로그인 패킷: `{"trnm": "LOGIN", "token": "..."}`
   - 로그인 성공 확인

## 현재 문제점
**실시간 타입 코드 오류**
- 사용한 타입: `type: ['0']`
- 에러 메시지: "사용하지 않은 실시간 타입이 포함되어 있어서 실시간 등록에 실패했습니다. (사용하지 않는 실시간 타입=0)"
- 필요: 올바른 실시간 타입 코드

## 파일 변경 사항
- `scripts/fetch_stock_data_kiwoom.py`: WebSocket 방식으로 재작성
- `scripts/fetch_all_stocks_kiwoom.py`: PyKRX 방식 유지 (종목 검색)
- `requirements.txt`: `websockets>=12.0` 추가
- `.env.local`: 키움 API 키 추가

## 다음 단계
1. API 가이드에서 올바른 실시간 타입 코드 확인
2. 타입 코드 수정 후 재테스트

## 참고 URL
- 키움 OpenAPI: https://openapi.kiwoom.com
- API 가이드: https://openapi.kiwoom.com/guide/apiguide
