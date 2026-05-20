# PM2 env_file 설정

## 문제
PM2가 .env 파일을 자동으로 로드하지 않아 환경 변수가 설정되지 않음

## 해결
ecosystem.config.json에 env_file 설정 추가:

```json
{
  "apps": [{
    "env_file": "/absolute/path/to/.env"
  }]
}
```

## 주의사항
- env_file은 절대 경로만 지원
-相对 경로 사용 시 PM2가 파일을 찾지 못함
- --update-env 플래그로 환경 변수 재로드 가능

## 적용 대상
- stock-watchlist PM2 설정
- 경로: /Users/irons_server/projects/stock-watchlist/.env
