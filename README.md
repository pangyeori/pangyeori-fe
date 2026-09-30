# 판겨리

> AI가 판정하는 1:1 채팅 토론 서비스

판겨리는 두 사용자가 하나의 주제를 두고 각자의 근거와 반론을 나누는 서비스입니다. 토론이 끝나면 AI 판사가 양측의 주장과 논리를 분석해 판정과 피드백을 제공합니다.

## 주요 기능

### 구현됨

- 이메일 인증 기반 회원가입과 로그인
- 비밀번호 재설정 및 계정 관리
- 토론방 생성과 찬성·반대 입장 선택
- 초대 링크를 통한 참여 신청 및 상대 확정
- 실시간 대기방 상태와 참여 알림
- 프로필 및 내 토론 목록 관리

### 개발 예정

- 단계별 실시간 채팅 토론
- 발언 순서 및 제한 시간 관리
- AI 판사의 논리·설득력 분석
- 최종 판정, 토론 요약 및 피드백

## 기술 스택

| 기술 | 버전 |
| --- | --- |
| Next.js | `16.2.12` |
| React | `19.2.4` |
| TypeScript | `^5` |
| Tailwind CSS | `^4` |
| TanStack Query | `^5.101.4` |
| React Hook Form | `^7.84.0` |
| Zod | `^4.4.3` |

## 시작하기

Node.js와 pnpm이 필요하며, API 기능을 사용하려면 판겨리 백엔드 서버도 실행되어야 합니다. Node.js와 pnpm 버전은 아직 프로젝트에서 고정하지 않았습니다.

```bash
pnpm install
```

`.env.example`을 `.env.local`로 복사한 뒤 환경에 맞게 값을 수정합니다.

```env
# 비워 두면 동일 출처의 Next.js 프록시를 사용합니다.
NEXT_PUBLIC_API_BASE_URL=

# Next.js가 API 요청을 전달할 백엔드 주소입니다.
BACKEND_URL=http://localhost:8080
```

개발 서버를 실행하고 [http://localhost:3000](http://localhost:3000)에서 확인합니다.

```bash
pnpm dev
```

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | ESLint 검사 |
| `pnpm type-check` | TypeScript 타입 검사 |

## 프로젝트 구조

```text
src/
├─ app/                 # 페이지와 라우트
├─ components/          # 공통 UI와 레이아웃
├─ features/            # 인증, 토론, 알림, 마이페이지
├─ lib/                 # API 클라이언트와 공통 설정
└─ types/               # 공통 타입
```
