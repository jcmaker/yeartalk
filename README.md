## YearTalk

카카오톡 내보내기 `.txt` 채팅 로그를 업로드하면, **연말 회고(통계 + AI 요약)**를 만들어 **공유 링크**로 볼 수 있는 모바일 퍼스트 웹앱입니다. (로그인 없이 사용)

### 핵심 플로우

1. 사용자가 카카오톡 채팅 로그 `.txt` 업로드
2. 서버에서 파싱 → 통계 계산 → DB 저장
3. (옵션) OpenAI로 요약/어워드/운세 생성
4. 결과 페이지(`/r/[slug]`)에서 공유 가능한 리캡 확인

### 기술 스택

- **Next.js App Router** + **TypeScript**
- **TailwindCSS** + **shadcn/ui**
- **Prisma** (Supabase Postgres 연결)
- **OpenAI** (옵션, 서버에서만 호출)
- **Biome** (lint/format)

---

## 폴더 구조(요약)

- **`app/`**: 라우트(UI + API)
  - `app/(public)/page.tsx`: 업로드 랜딩(공개 진입)
  - `app/r/[slug]/page.tsx`: 결과(공유 링크) 페이지
  - `app/api/rooms/route.ts`: 업로드/분석 시작(POST)
  - `app/api/rooms/[slug]/route.ts`: 결과 조회(GET), 삭제(DELETE)
- **`lib/kakao/`**: 카카오톡 `.txt` 파싱/시간 처리/통계/어워드 계산
- **`lib/server/`**: 서버 전용(OpenAI, Prisma, 토큰 생성 등)
- **`prisma/`**: Prisma 스키마 + Supabase에 적용할 SQL 마이그레이션
- **`supabase/rls.sql`**: (선택) Supabase RLS 정책 예시

---

## 로컬 실행

### 1) 설치

```bash
npm install
```

### 2) 환경변수 설정

루트에 `.env.local`을 만들고 아래 값을 채워주세요(예시 파일이 있다면 참고).

- **DB(Prisma)**
  - `DATABASE_URL`: Supabase Postgres 연결 문자열 (코드에서 자동으로 `pgbouncer=true` 파라미터 추가됨)
  - `DIRECT_URL`: Prisma 마이그레이션/직접 연결용 URL (pooler 없이 직접 연결)
- **AI(선택)**
  - `AI_ENABLED`: `"true"`일 때만 AI 요약 생성
  - `OPENAI_API_KEY`: OpenAI API 키
  - `OPENAI_MODEL`: 기본값 `gpt-4o-mini`
- **업로드/만료(선택)**
  - `UPLOAD_MAX_BYTES`: 기본값 10MB
  - `ROOM_TTL_DAYS`: 기본값 30일

### 3) DB 준비 (Supabase)

Supabase 프로젝트의 **SQL Editor**에서 아래를 순서대로 실행합니다:

1. `prisma/migrations/init_schema.sql`
2. `prisma/migrations/remove_anonymize_mode.sql` (이미 반영되어 있다면 생략 가능)
3. (선택) `supabase/rls.sql`

> 참고: 현재 구현은 **Prisma를 통해 서버에서 DB에 직접 접근**합니다.  
> `supabase/rls.sql`은 Supabase anon 클라이언트로 “공개 읽기”를 열어둘 때 유용한 예시입니다.

### 4) 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 확인합니다.

---

## API (요약)

### `POST /api/rooms`

- **요청**: `multipart/form-data` (`file` 필드에 `.txt`)
- **응답**: `{ ok: true, data: { shareSlug, deleteToken } }`

### `GET /api/rooms/:slug`

- **응답**: 공개 결과 payload (deleteToken 미포함)
- **상태**: 준비 전이면 `202` + `{ code: "NOT_READY" }`

### `DELETE /api/rooms/:slug?token=...`

- `token`은 `deleteToken`
- 삭제 성공 시 `{ ok: true }`

---

## 개인정보/보안 주의사항

- 기본 정책: **원문 채팅 텍스트를 저장하지 않는 방향**을 권장합니다(필요 시 별도 설계).
- OpenAI 사용 시에도 **민감정보(전화번호/이메일 등) 마스킹** 후 최소 정보만 보내는 것을 권장합니다.
- 서버 로그에 원문/개인정보가 남지 않도록 주의합니다.
