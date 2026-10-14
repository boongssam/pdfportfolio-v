# 활동지 AI 평가 — Vercel + Supabase

Next.js 웹앱에서 학생 활동지 PDF를 선택하면 Gemini가 OCR·채점을 수행합니다.
로그인은 Supabase 이메일·비밀번호 인증, 평가 기준과 결과는 Supabase PostgreSQL에 저장합니다.
PDF는 웹앱이 Supabase 비공개 Storage에 직접 업로드하므로 사용자가 별도로 업로드할 필요가 없습니다.

## 1. Supabase 준비

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/migrations/202610140001_initial.sql` 전체를 한 번 실행합니다.
3. Authentication → Providers에서 Email 제공자가 활성화되어 있는지 확인하고, Authentication 설정에서 새 사용자 가입을 비활성화합니다. 계정은 관리자가 생성합니다.
4. Authentication → Users → Add user에서 교사 이메일과 비밀번호로 사용자를 생성하고 이메일 확인 상태를 확인합니다.
5. 아래 SQL의 이메일을 생성한 교사 이메일로 바꾸어 실행합니다. 등록되지 않은 계정은 로그인 세션이 생겨도 데이터·Storage·AI API를 사용할 수 없습니다.

```sql
insert into public.allowed_teachers (email) values ('teacher@example.com');
-- 접근 해제
-- delete from public.allowed_teachers where email = 'teacher@example.com';
```

6. 프로젝트 Connect/API 설정에서 URL과 publishable key를 복사합니다.

앱에는 회원가입 기능이 없습니다. 기존 Google 계정만 있는 사용자는 이메일·비밀번호 로그인을 위해 관리자에게 비밀번호 설정을 요청해야 합니다.

참고: [이메일·비밀번호 로그인](https://supabase.com/docs/guides/auth/passwords), [사용자 관리](https://supabase.com/docs/guides/auth/users), [Storage 권한](https://supabase.com/docs/guides/storage/security/access-control).

## 2. 로컬 실행

`package.json`이 있는 저장소 루트에서 실행합니다.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
# .env.local의 값을 채운 뒤
npm.cmd run dev
```

| 환경변수 | 용도 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 브라우저용 공개 키. RLS로 접근 제한 |
| GEMINI_API_KEY | 서버 전용 Gemini API 키 |
| GEMINI_MODEL | 선택. 기본 gemini-flash-latest |
| SUPABASE_SERVICE_ROLE_KEY | 서버 전용. 중단된 임시 업로드 정리용 |
| CRON_SECRET | 서버 전용. 16자 이상 무작위 비밀 값. Vercel Cron 인증용 |

service role 키와 Gemini 키, CRON_SECRET은 절대 NEXT_PUBLIC_ 환경변수나 Git에 넣지 마세요.

## 3. Vercel 배포

1. GitHub 저장소를 Vercel에서 Import합니다.
2. Root Directory: 저장소 루트, Framework: Next.js, Build Command: `npm run build`.
3. 위 환경변수를 Vercel 프로젝트에 등록합니다. Production과 사용할 Preview 환경에 각각 설정합니다.
4. Deploy 후 Supabase Site URL/Redirect URLs와 실제 배포 주소를 맞춥니다.
5. 관리자 생성 계정으로 이메일 로그인 → 평가 기준 저장 → PDF 평가 → 결과 수정·CSV 다운로드를 확인합니다.

`vercel.json`은 매일 03:00 한국 시간(18:00 UTC)에 `/api/cleanup`을 호출합니다.
OCR 완료·실패 후 임시 PDF를 즉시 삭제하고 브라우저도 삭제를 재시도합니다.
창을 닫거나 함수가 종료되어 남은 PDF는 생성 후 24시간이 지난 정리 대상이며 다음 일일 작업에서 삭제됩니다(최대 약 48시간 보관).
Vercel에 CRON_SECRET과 SUPABASE_SERVICE_ROLE_KEY를 설정해야 자동 정리가 작동합니다.
PDF 최대 15MB, Node API의 maxDuration은 300초입니다. Vercel 프로젝트의 함수 실행 한도를 확인하세요.

## 데이터와 보안

- `rubrics`, `submissions`에 user_id 소유자와 RLS가 적용됩니다.
- 평가 항목·결과는 JSONB, 기존 화면과 호환되는 시간 값은 밀리초로 저장됩니다.
- 원본 PDF는 비공개 임시 보관이고, OCR 텍스트·평가 결과는 DB에 저장됩니다.
- Gemini에 PDF와 학생 정보가 전달됩니다. 실제 운영 전에 학교의 데이터 처리 기준을 확인하세요.
- allowed_teachers에서 제거하면 API·DB 접근이 즉시 제한됩니다. 계정 자체의 로그인 차단이나 삭제는 Supabase Authentication → Users에서 별도로 관리합니다.

## 검증

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

실서비스에서는 두 교사 계정으로 서로의 DB 행 및 PDF 경로에 대한 조회·수정·삭제가 거부되는지 확인하세요.
로그아웃 상태 및 허용되지 않은 계정의 `/api/ocr`, `/api/grade` 호출도 거부되어야 합니다.
15MB PDF 업로드, OCR 오류 시 삭제, 교사 허용 해제, Cron 실행 결과를 확인하세요.
