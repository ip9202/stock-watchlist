# Vercel + Supabase 배포 가이드

이 문서는 Stock Watchlist 서비스를 Vercel과 Supabase를 사용하여 배포하는 과정을 안내합니다.

## 주요 기술 스택

- **프론트엔드 및 서버리스 함수**: Vercel (Next.js)
- **데이터베이스**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **데이터 수집**: Python (Vercel Cron Jobs)

## 1. Supabase 설정

Supabase는 PostgreSQL 데이터베이스와 인증, 스토리지 등 백엔드 기능을 제공합니다.

### 1.1. 프로젝트 생성

1.  [Supabase 대시보드](https://app.supabase.io/)에 로그인하여 새 프로젝트를 생성합니다.
2.  프로젝트 생성 시 나타나는 **Database Password**를 안전한 곳에 저장합니다.
3.  리전은 사용자와 가까운 곳(예: `ap-northeast-2` Seoul)을 선택합니다.

### 1.2. 데이터베이스 연결 정보 확인

1.  프로젝트 대시보드에서 `Settings` > `Database` 메뉴로 이동합니다.
2.  `Connection string` 섹션에서 **PostgreSQL connection string**을 복사합니다.
    -   일반적으로 `postgresql://postgres:[YOUR-PASSWORD]@[AWS-REGION].pooler.supabase.com:6543/postgres`와 같은 형식입니다.

## 2. Prisma 스키마 수정

로컬의 SQLite 설정을 Supabase의 PostgreSQL에 맞게 변경해야 합니다.

1.  `prisma/schema.prisma` 파일을 엽니다.
2.  `datasource` 블록을 다음과 같이 수정합니다. `shadowDatabaseUrl`은 마이그레이션 시 임시 데이터베이스를 만들기 위해 필요합니다.

    ```prisma
    datasource db {
      provider          = "postgresql"
      url               = env("DATABASE_URL")
      shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
    }
    ```

## 3. Vercel 설정

Vercel은 Next.js 애플리케이션을 배포하고 호스팅하는 플랫폼입니다.

### 3.1. 프로젝트 생성 및 Git 연동

1.  [Vercel 대시보드](https://vercel.com/)에 로그인하여 `Add New...` > `Project`를 선택합니다.
2.  GitHub 리포지토리를 Vercel에 연동합니다.

### 3.2. 환경 변수 설정

프로젝트의 `Settings` > `Environment Variables` 메뉴에서 다음 변수들을 설정합니다.

| 변수명                | 내용                                                                                                                            | 비고                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`        | `postgresql://postgres:[YOUR-PASSWORD]@[AWS-REGION].pooler.supabase.com:5432/postgres`                                          | **주의**: 포트 `5432` 사용. Prisma Migrate용.                        |
| `SHADOW_DATABASE_URL` | `postgresql://postgres:[YOUR-PASSWORD]@[AWS-REGION].pooler.supabase.com:5432/postgres_shadow`                                   | **주의**: `postgres_shadow` 데이터베이스 이름 사용.                  |
| `DART_API_KEY`        | `.env.example` 파일에 있는 DART API 키                                                                                          |                                                                      |
| `NEXTAUTH_URL`        | `https://[YOUR-VERCEL-APP-URL]`                                                                                                 | Vercel 배포 후 생성된 도메인                                         |
| `NEXTAUTH_SECRET`     | `openssl rand -base64 32` 명령어로 생성한 시크릿 키                                                                             | 로컬에서 생성하여 복사                                               |
| `NODE_ENV`            | `production`                                                                                                                    |                                                                      |

**중요**: Supabase의 Pooler를 사용하려면 Prisma가 생성하는 최종 URL에 `?pgbouncer=true` 파라미터를 추가해야 합니다. 이는 `package.json`의 빌드 스크립트를 수정하여 처리합니다.

### 3.3. 빌드 설정 수정

1.  `package.json` 파일의 `scripts` 섹션을 다음과 같이 수정합니다.
    -   `prisma generate`를 실행하여 PostgreSQL용 클라이언트를 생성합니다.
    -   `prisma migrate deploy`를 실행하여 Supabase DB에 스키마를 적용합니다.

    ```json
    "scripts": {
      "dev": "next dev --turbopack",
      "build": "prisma generate && prisma migrate deploy && next build --turbopack",
      "start": "next start",
      "lint": "eslint"
    },
    ```

2.  Vercel 프로젝트의 `Settings` > `General` > `Build & Development Settings` 에서 **Build Command**가 `npm run build`로 되어 있는지 확인합니다.

## 4. 데이터 수집 스크립트 (Cron Jobs)

로컬의 Python 스크립트들은 Vercel의 Cron Jobs 기능을 사용하여 주기적으로 실행되도록 설정할 수 있습니다.

1.  `vercel.json` 파일을 프로젝트 루트에 생성합니다.
2.  스크립트를 실행할 API 라우트를 `src/app/api/cron`과 같은 경로에 생성합니다.
3.  `vercel.json`에 Cron Job을 등록합니다.

    ```json
    {
      "crons": [
        {
          "path": "/api/cron/fetch-stocks",
          "schedule": "0 9 * * 1-5"
        }
      ]
    }
    ```

4.  Vercel 프로젝트 설정에서 Python 버전을 지정하고 `requirements.txt`를 통해 의존성을 자동 설치하도록 합니다.

## 5. 배포

위 설정들이 완료되면, Git 리포지토리의 main 브랜치에 코드를 푸시하여 Vercel 배포를 트리거합니다. Vercel 대시보드에서 빌드 및 배포 과정을 모니터링할 수 있습니다.
