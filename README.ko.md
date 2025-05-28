# Doxai - AI 기반 문서 자동 생성기

(사진 추후 추가...)

*[한국어](./README.ko.md) | [English](./README.md)*

**Doxai**는 PR이 병합될 때 코드 변경사항에 대한 포괄적인 기술 문서를 자동으로 생성하는 지능형 GitHub Action입니다. 고급 AI 모델을 활용하여 개발자들이 코드베이스를 더 효과적으로 이해하고 유지보수할 수 있도록 도와주는 상세한 AsciiDoc 문서를 생성합니다.

## ✨ 주요 기능

[전체 기능 가이드 보기](./FEATURES.ko.md)

- **AI 기반 분석**: OpenAI GPT, Anthropic Claude, Google Gemini, Azure OpenAI 활용
- **스마트 문서화**: AsciiDoc 형식의 상세한 기술 문서 생성
- **지능형 업데이트**: 마지막 문서화 이후 실제로 변경된 파일만 처리
- **다국어 지원**: 한국어 또는 영어로 문서 생성
- **유연한 필터링**: 패턴과 범위를 기반으로 파일 포함/제외
- **배치 처리**: 여러 파일을 단일 커밋으로 효율적 처리
- **PR 재사용**: 중복 생성 대신 기존 문서 PR 업데이트
- **폴더 구조**: 적절한 폴더 계층으로 문서 구성

## 🚀 빠른 시작

### 1. 워크플로 설정

`.github/workflows/codeScribeAi.yml` 파일 생성:

```yml
name: CodeScribe AI Documentation

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  docs:
    if: |
      github.event.issue.pull_request && 
      contains(github.event.comment.body, '!doxai')
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Generate Documentation
        uses: yybmion/codescribe-ai@v1.0.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-2.0-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
          language: 'ko'
```

### 2. 저장소 설정

1. **Settings** > **Actions** > **General** 이동
2. **Workflow permissions**를 **"Read and write permissions"**로 설정
3. **"Allow GitHub Actions to create and approve pull requests"** 활성화

### 3. API 키 추가

1. **Settings** > **Secrets and variables** > **Actions** 이동
2. AI 제공업체의 API 키를 `AI_API_KEY`로 추가

### 4. 사용법

PR 병합 후 다음과 같이 댓글 작성:

```
!doxai
```

## 🎛️ 고급 사용법

### 명령어 옵션

| 옵션 | 설명 | 기본값 | 예시 |
|------|------|--------|------|
| `--scope` | 파일 필터링 범위 | `all` | `include:src/`, `exclude:test/` |
| `--lang` | 문서화 언어 | `en` | `ko`, `en` |

### 사용 예시

```bash
# 모든 파일에 대해 한국어로 문서 생성
!doxai --lang ko

# 특정 디렉토리에 대해서만 한국어로 문서 생성
!doxai --scope include:src/api,src/auth --lang ko

# 테스트 파일 제외하고 한국어로 문서 생성
!doxai --scope exclude:test,spec --lang ko

# JavaScript 파일만 포함
!doxai --scope include:*.js --lang ko
```

## ⚙️ 설정

### Action 입력값

| 입력 | 설명 | 필수 | 기본값                           |
|------|------|------|-------------------------------|
| `github-token` | GitHub API 토큰 | 예 | `${{ secrets.GITHUB_TOKEN }}` |
| `ai-provider` | AI 제공업체 | 아니오 | `google`                      |
| `ai-model` | 사용할 AI 모델 | 아니오 | `gemini-2.0-flash`            |
| `ai-api-key` | AI API 키 | 예 | -                             |
| `language` | 문서화 언어 | 아니오 | `en`                          |

### 지원하는 AI 제공업체

<details>
<summary><strong>Google Gemini (권장)</strong></summary>

```yaml
ai-provider: 'google'
ai-model: 'gemini-2.0-flash'  # 또는 gemini-1.5-flash
```

</details>

<details>
<summary><strong>OpenAI GPT</strong></summary>

```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'  # 또는 gpt-3.5-turbo
```

</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'  # 또는 claude-3-sonnet, claude-3-haiku
```

</details>

## 📁 지원하는 파일 형식

### 프로그래밍 언어
- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`, `.pyw`
- **Java/JVM**: `.java`, `.kt`, `.scala`
- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **기타**: `.cs`, `.rs`, `.go`, `.rb`, `.php`, `.swift`, `.dart`, `.r`

### 웹 기술
- **마크업**: `.html`, `.htm`
- **스타일링**: `.css`, `.scss`, `.sass`, `.less`
- **프레임워크**: `.vue`, `.svelte`

### 설정 및 스크립트
- **데이터**: `.json`, `.yaml`, `.yml`, `.xml`
- **스크립트**: `.sh`, `.bash`, `.ps1`, `.bat`
- **빌드**: `Dockerfile`, `Makefile`, `.gradle`

### 문서
- **텍스트**: `.md`, `.rst`, `.adoc`, `.txt`

## 🧠 스마트 기능

### 지능형 파일 처리

Doxai는 자동으로:
- ✅ **변경사항 감지**: 마지막 문서화 이후 수정된 파일만 처리
- ✅ **변경되지 않은 파일 건너뛰기**: 불필요한 처리 방지
- ✅ **배치 커밋**: 여러 파일 변경사항을 단일 커밋으로 그룹화
- ✅ **폴더 구조**: 체계적인 문서 계층 구조 생성

### 출력 예시

```asciidoc
= UserService 클래스 문서

== 개요
`UserService` 클래스는 사용자 인증 및 프로필 관리 작업을 담당합니다...

== 의존성
* `bcrypt` - 비밀번호 해시화 및 검증
* `jwt` - JSON Web Token 처리

== 주요 메소드
=== authenticate(email, password)
*목적*: 사용자 자격 증명을 인증하고 JWT 토큰을 반환
*매개변수*: 
* `email` - 사용자 이메일 주소
* `password` - 평문 비밀번호
*반환값*: JWT 토큰 문자열 또는 인증 실패 시 null
```

## 📊 워크플로 결과

실행 후 Doxai는 자세한 피드백을 제공합니다:

```
✅ @username 문서 생성이 완료되었습니다!

📚 문서 PR: #156 (생성됨)

📊 요약:
- 생성됨: 3개 파일
- 업데이트됨: 2개 파일  
- 건너뜀: 1개 파일 (변경사항 없음)
- 실패: 0개 파일

🔗 문서 보기: https://github.com/owner/repo/pull/156
```

## 🚨 중요 사항

### 요구사항
- **Node.js**: 20.x 이상
- **병합된 PR만**: 병합된 PR에서만 문서 생성 가능
- **유효한 API 키**: AI 제공업체 API 키가 유효하고 충분한 할당량 보유

### 제한사항
- 대용량 파일(>50KB)은 AI 처리를 위해 잘릴 수 있음
- 복잡한 코드 구조는 수동 검토가 필요할 수 있음
- API 속도 제한이 처리 속도에 영향을 줄 수 있음

## 🤝 기여하기

기여를 환영합니다! 자세한 내용은 [기여 가이드](CONTRIBUTING.md)를 참조하세요.

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 열기

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

**❤️로 만든 [yybmion](https://github.com/yybmion)**

*도움이 되셨다면 이 저장소에 ⭐를 눌러주세요!*
