# 키움증권 REST API 문제 해결 가이드

## 문제 현상

토큰 발급(`POST /oauth2/token`)은 성공하지만, 모든 데이터 조회 엔드포인트가 500 에러 반환.

## 확인 사항

### ✅ 작동하는 것
- OAuth2 토큰 발급: `https://api.kiwoom.com/oauth2/token`
- 응답: `{"return_code": 0, "token": "...", "token_type": "Bearer"}`

### ❌ 실패하는 것
- `GET /api/dostk/caf07010` - 주식 기본 정보
- `GET /api/dostk/stkbasic` - 종목 기본 정보
- `GET /api/dostk/stkcode` - 종목 코드
- `GET /api/dostk/mdstock` - 주식 현재가시세

## 원인 분석

가능한 원인:
1. **API 문서 부정확**: 사용된 TR ID나 엔드포인트 경로가 실제와 다름
2. **인증 방식 차이**: 데이터 조회에는 추가 파라미터나 헤더 필요
3. **서비스 미가입**: 해당 API 사용을 위한 별도 가입 필요
4. **IP 허용**: IP 화이트리스트에 등록 필요
5. **TR ID 형식**: 경로 파라미터가 아닌 본문이나 헤더에 전달 필요

## 해결 방안

### 방안 1: 기존 Python 스크립트 분석
```bash
# 작동하는 Python 스크립트 확인
scripts/fetch_stocks_kiwoom_rest.py
```
실제로 작동하는 Python 코드에서 사용하는 엔드포인트와 파라미터 확인

### 방안 2: 키움증권 Open API 문서 재확인
- https://api.kiwoom.com - 공식 API 문서
- TR ID별 정확한 경로와 파라미터 형식 확인
- 데이터 조회 엔드포인트의 별도 인증 요구사항 확인

### 방안 3: 모의투자 API로 테스트
```
https://mockapi.kiwoom.com
```
실전 API 대신 모의투자 API로 먼저 테스트

### 방안 4: 롤백 및 기존 방식 유지
- PyKRX (종목 리스트) 유지
- 기존 IPC 방식 유지
- REST API 전환 보류

## 참고: 작동하는 토큰 발급 요청

```typescript
POST https://api.kiwoom.com/oauth2/token
Content-Type: application/json;charset=UTF-8

{
  "grant_type": "client_credentials",
  "appkey": "YOUR_APP_KEY",
  "secretkey": "YOUR_SECRET_KEY"
}
```

응답:
```json
{
  "return_code": 0,
  "token": "LmiltAYzhoOQ...",
  "token_type": "Bearer",
  "expires_dt": "20260311092933",
  "return_msg": "정상적으로 처리되었습니다"
}
```
