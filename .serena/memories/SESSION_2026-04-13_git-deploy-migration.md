# Git 기반 배포 전환 (2026-04-13)

## 작업 내용
SCP/expect 기반 배포를 Git 기반 배포로 전환

## 주요 변경사항
- deploy.sh: expect 비밀번호 방식 → SSH 키 + git pull 방식
- setup-server.sh: 최초 서버 셋업 스크립트 신규 작성
- start.sh: server.js → .next/standalone/server.js 경로 수정
- ecosystem.config.json: interpreter_args: "-l" 추가 (macOS PATH 로드)
- eslint.config.mjs: scripts/coverage 제외, no-explicit-any → warn

## 서버 설정
- GitHub deploy key: ~/.ssh/id_stock_watchlist (서버)
- SSH config: Host github.com-stock-watchlist
- PM2 id: 17 (기존 6에서 변경)
- 서버: Node v25.2.1, npm 11.6.2, git 2.50.1

## 발견한 이슈
- macOS SSH 세션은 PATH 로드 안함 → bash -l -c 필수
- GitHub deploy key는 리포지토리당 고유해야 함 (기존 키 재사용 불가)
- git clone 실패 시 기존 디렉토리 백업 필요 (mv → clone → .env 복원)
- pre-commit hook이 프로젝트 전체를 lint하여 기존 에러도 커밋 차단

## 커밋
da64047 feat(deploy): Git 기반 배포로 전환 — SCP/expect 방식 대체
