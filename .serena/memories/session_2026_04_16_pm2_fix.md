# 2026-04-16 Session: PM2 환경 변수 문제 해결

## 문제
프로덕션 환경(ip9202.site/stocks)에서 전체 종목 데이터 로딩 실패

## 원인 분석
- PM2 로그 확인: 8005 "Token이 유효하지 않습니다" 에러 다수 발생
- 근본 원인: PM2 프로세스 시작 시 .env 파일 로드 안 됨
- KiwoomTokenManager가 환경 변수(KIWOOM_APP_KEY, KIWOOM_SECRET_KEY)를 읽지 못함

## 해결책
1. **ecosystem.config.json 생성**
   ```json
   {
     "apps": [{
       "name": "stock-watchlist",
       "script": "start.sh",
       "env_file": "/Users/irons_server/projects/stock-watchlist/.env"
     }]
   }
   ```

2. **start.sh 개선**
   - .env 파일 로드 로직 추가
   - bash 로그인 셸 사용(-l)

## 배포
- 커밋: b396d33 "fix(deploy): PM2 환경 변수 자동 로드 추가"
- 서버: git pull → 빌드 → PM2 reload 완료

## 검증
- 삼성전자(005930): API 정상 작동
- NAVER(035420): API 정상 작동
- 8005 에러 더 이상 발생하지 않음

## 미션
- 종목 검색 API 문제 조사 필요 (요청 모호함 - 명확성 필요)
