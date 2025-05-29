# Doxai - AI 기반 문서 자동 생성기

(사진 추후 추가...)

*[한국어](./README.ko.md) | [English](./README.md)*

**Doxai**는 PR이 병합될 때 코드 변경사항에 대한 포괄적인 기술 문서를 자동으로 생성하는 지능형 GitHub Action입니다. 고급 AI 모델과 **언어별 특화 분석 템플릿**을 활용하여 각 프로그래밍 언어의 고유한 특성에 맞춘 상세한 AsciiDoc 문서를 생성합니다.

## ✨ 주요 기능

[전체 기능 가이드 보기](./FEATURES.ko.md)

- **🧠 언어별 특화 AI 분석**: 서로 다른 프로그래밍 패러다임을 위한 전문 템플릿
    - **객체지향**: Java, C#, Kotlin, Scala, Swift (클래스, 상속, 디자인 패턴 중심 분석)
    - **함수형**: JavaScript, TypeScript, Python, Go, Rust, Dart (함수, 데이터 흐름, 비동기 패턴 중심)
    - **웹 프론트엔드**: HTML, CSS, SCSS, Vue, Svelte (UI/UX, 반응형, 접근성 중심)
    - **데이터 & 쿼리**: SQL, CSV (비즈니스 맥락, 성능, 데이터 품질 중심)
    - **시스템**: C, C++, 헤더 파일 (메모리 관리, 성능, 시스템 인터페이스 중심)
- **다중 AI 제공업체**: OpenAI GPT, Anthropic Claude, Google Gemini 지원
- **스마트 문서화**: AsciiDoc 형식의 상세한 기술 문서 생성
- **지능형 업데이트**: 마지막 문서화 이후 실제로 변경된 파일만 처리
- **고품질 다국어 지원**: 한국어 또는 영어로 원어민 수준의 자연스러운 문서 생성
- **유연한 필터링**: 패턴과 범위를 기반으로 파일 포함/제외
- **배치 처리**: 여러 파일을 단일 커밋으로 효율적 처리
- **PR 재사용**: 중복 생성 대신 기존 문서 PR 업데이트
- **폴더 구조**: 적절한 폴더 계층으로 문서 구성

## 🎯 언어별 특화 분석

### 객체지향 언어 (Java, C#, Kotlin, Scala, Swift)
```asciidoc
= UserService 클래스 문서

== 클래스 계층 구조
=== 상속 관계
* *부모 클래스*: `BaseService` - 공통 서비스 기능 제공
* *구현 인터페이스*: `Authenticatable` - 사용자 인증 계약

== 객체지향 설계 특징
=== 적용된 설계 원칙
* *단일 책임 원칙*: 사용자 관련 작업만 처리
* *의존성 주입*: 생성자를 통한 의존성 주입

=== 사용된 디자인 패턴
* *팩토리 패턴*: 역할에 따라 다른 사용자 유형 생성
```

### 함수형 언어 (JS, TS, Python, Go, Rust, Dart)
```asciidoc
= Utils 모듈 문서

== 데이터 변환 흐름
=== 입력 데이터 형태
* API 응답에서 받은 원시 사용자 데이터

=== 변환 과정
1. 필수 필드 검증
2. 이메일 형식 정규화
3. 민감 정보 암호화

== 함수형 프로그래밍 특징
=== 고차함수 활용
* `mapUsers` - 제공된 매핑 함수를 사용해 사용자 객체 변환
* `filterActive` - 활동 상태에 따라 사용자 필터링
```

### 웹 프론트엔드 (HTML, CSS, Vue, Svelte)
```asciidoc
= LoginForm 컴포넌트 문서

== UI 구조 및 레이아웃
=== 시각적 구성
* *레이아웃*: 반응형 브레이크포인트를 가진 CSS Grid
* *배치*: 검증 피드백이 있는 중앙 정렬 폼

== 접근성
=== 키보드 네비게이션
* 탭 순서가 논리적 폼 흐름을 따름
* Enter 키로 폼 제출
=== 스크린 리더 지원
* 모든 입력 필드에 설명적 레이블 제공
* 에러 메시지가 스크린 리더에 음성으로 전달됨
```

### 데이터 & 쿼리 (SQL, CSV)
```asciidoc
= 사용자 분석 쿼리 문서

== 비즈니스 맥락
=== 사용 사례
* 월별 사용자 참여도 리포팅
* 고객 유지율 분석

== 쿼리 로직
=== 성능 고려사항
* *인덱스*: 최적 성능을 위한 (user_id, created_at) 복합 인덱스
* *실행 시간*: 100만 사용자 데이터셋에서 약 200ms
```

### 시스템 프로그래밍 (C, C++)
```asciidoc
= 메모리 풀 구현 문서

== 메모리 관리
=== 할당 전략
* *동적 할당*: 큰 메모리 블록을 미리 할당
* *해제*: 즉시 시스템 호출 없이 블록을 여유 상태로 표시

== 성능 특성
=== 시간 복잡도
* 할당: 평균 O(1)
* 해제: O(1)
```

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

      - name: Generate Documentation
        uses: yybmion/Doxai@v1.2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-provider: 'google'
          ai-model: 'gemini-2.0-flash'
          ai-api-key: ${{ secrets.AI_API_KEY }}
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
# 모든 파일에 대해 한국어로 문서 생성 (자동 언어 감지)
!doxai --lang ko

# 특정 디렉토리에 대해서만 한국어로 문서 생성
!doxai --scope include:src/api,src/auth --lang ko

# 테스트 파일 제외하고 한국어로 문서 생성
!doxai --scope exclude:test,spec --lang ko

# 특정 파일 형식만 포함
!doxai --scope include:*.java,*.js --lang ko
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
- 빠르고 비용 효율적
- 뛰어난 코드 이해 능력
- 우수한 다국어 지원
</details>

<details>
<summary><strong>OpenAI GPT</strong></summary>

```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'  # 또는 gpt-3.5-turbo
```
- 고품질 출력
- 포괄적 분석
- 프리미엄 가격
</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'  # 또는 claude-3-sonnet, claude-3-haiku
```
- 상세한 설명
- 강력한 추론 능력
- 맥락 인식 문서화
</details>

## 📁 지원하는 파일 형식 & 분석

### 🎯 객체지향 언어
- **Java** (`.java`) → 클래스 계층, 디자인 패턴, 상속 분석
- **C#** (`.cs`) → SOLID 원칙, 속성, 비동기 패턴
- **Kotlin** (`.kt`) → 데이터 클래스, 확장 함수, 코루틴
- **Scala** (`.scala`) → 함수형-객체지향 하이브리드, 케이스 클래스, 트레이트
- **Swift** (`.swift`) → 프로토콜, 옵셔널, 메모리 관리

### ⚡ 함수형 언어
- **JavaScript** (`.js`, `.jsx`) → 함수 조합, 클로저, async/await
- **TypeScript** (`.ts`, `.tsx`) → 타입 안전성, 제네릭, 인터페이스
- **Python** (`.py`, `.pyw`) → 제너레이터, 데코레이터, 컴프리헨션
- **Go** (`.go`) → 고루틴, 채널, 인터페이스
- **Rust** (`.rs`) → 소유권, 라이프타임, 패턴 매칭
- **Dart** (`.dart`) → 퓨처, 스트림, 위젯

### 🎨 웹 프론트엔드
- **HTML** (`.html`, `.htm`) → 시맨틱 구조, 접근성, SEO
- **CSS** (`.css`, `.scss`, `.sass`, `.less`) → 반응형 디자인, 애니메이션
- **Vue** (`.vue`) → 컴포넌트 조합, 반응성, 생명주기
- **Svelte** (`.svelte`) → 컴파일 타임 최적화, 스토어

### 📊 데이터 & 쿼리
- **SQL** (`.sql`) → 쿼리 최적화, 비즈니스 로직, 성능
- **CSV** (`.csv`) → 데이터 구조, 품질 평가, 사용 패턴

### ⚙️ 시스템 프로그래밍
- **C** (`.c`, `.h`) → 메모리 관리, 시스템 호출, 성능
- **C++** (`.cpp`, `.hpp`) → RAII, 템플릿, STL 사용

### 🚫 기본 제외 파일
- 설정 파일 (`.json`, `.yaml`, `.xml`, `.toml`)
- 스크립트 (`.sh`, `.bat`, `.ps1`)
- 문서 (`.md`, `.rst`, `.txt`)

## 🧠 스마트 기능

### 지능형 언어 감지

Doxai는 자동으로 프로그래밍 언어를 감지하고 특화된 분석을 적용합니다:

```
UserService.java → 객체지향 전문가
├── 클래스 계층과 디자인 패턴 분석
├── SOLID 원칙과 상속에 중점
└── 메소드 계약과 예외 문서화

utils.js → 함수형 프로그래밍 전문가
├── 함수 조합과 데이터 흐름 검사
├── 비동기 패턴과 에러 처리 분석
└── 순수 함수 vs 부수효과 문서화

LoginForm.vue → 프론트엔드 UI/UX 전문가
├── 컴포넌트 구조와 props 검토
├── 접근성과 반응형 평가
└── 사용자 인터랙션과 상태 관리 문서화
```

### 비용 효율적 처리

- **스마트 타겟팅**: 각 파일 유형에 관련된 템플릿만 사용
- **90% 토큰 절약**: 무관한 분석 템플릿을 AI에 전송하지 않음
- **배치 처리**: 여러 파일을 단일 커밋으로 처리

## 📊 워크플로 결과

실행 후 Doxai는 자세한 피드백을 제공합니다:

```
✅ @username 문서 생성이 완료되었습니다!

📚 문서 PR: #156 (생성됨)

📊 요약:
- 생성됨: 3개 파일 (Java→객체지향, JS→함수형, Vue→프론트엔드)
- 업데이트됨: 2개 파일  
- 건너뜀: 1개 파일 (변경사항 없음)
- 실패: 0개 파일

처리된 언어 그룹:
🎯 oop_class: 1개 파일 (특화된 클래스 분석)
⚡ functional: 1개 파일 (함수 중심 문서화)
🎨 web_frontend: 1개 파일 (UI/UX 종합 검토)

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
- 설정/스크립트/문서 파일은 기본적으로 제외됨 (사용자 정의 가능)

### 언어별 특화 고려사항
- **혼합 프로젝트**: 각 파일이 적절한 특화 분석을 받음
- **폴백 동작**: 알 수 없는 확장자는 기본적으로 함수형 분석 적용
- **템플릿 커스터마이징**: 고급 사용자는 분석 템플릿 수정 가능

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
