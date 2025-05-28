# 🔥 Doxai 주요 기능

Doxai 단순한 문서 생성기가 아닙니다. 지능적이고 완전 자동화된 코드 문서화 시스템입니다.

---

## 📋 목차

- [🏗️ 스마트 폴더 구조 생성](#-스마트-폴더-구조-생성)
- [🔄 지능적 문서 업데이트](#-지능적-문서-업데이트)
- [🗑️ 자동 파일 삭제](#-자동-파일-삭제)
- [📁 파일 스코프 필터링](#-파일-스코프-필터링)
- [🌍 다국어 지원](#-다국어-지원)
- [♻️ PR 재사용 시스템](#-pr-재사용-시스템)
- [⚡ 스마트 스킵 기능](#-스마트-스킵-기능)
- [🎯 지능적 파일 타입 감지](#-지능적-파일-타입-감지)
- [🤖 AI 프로바이더 지원](#-ai-프로바이더-지원)
- [📊 실시간 진행 상황 알림](#-실시간-진행-상황-알림)

---

## 🏗️ 스마트 폴더 구조 생성

### 기능 설명
소스 코드의 디렉토리 구조를 그대로 반영하여 문서를 체계적으로 정리합니다.

### 작동 방식
```
📁 소스 코드                    📁 생성된 문서
src/
├── auth/
│   ├── login.js           →    docs/doxai/src/auth/login.adoc
│   └── signup.js          →    docs/doxai/src/auth/signup.adoc
├── api/
│   └── users.js           →    docs/doxai/src/api/users.adoc
└── utils/
    └── helpers.js         →    docs/doxai/src/utils/helpers.adoc
```

### 장점
- ✅ **직관적 탐색**: 소스 코드와 동일한 구조로 문서 찾기 쉬움
- ✅ **자동 분류**: 파일 위치에 따른 자동 카테고리 분류
- ✅ **확장성**: 새로운 폴더 추가 시 자동으로 문서 구조 확장

---

## 🔄 지능적 문서 업데이트

### 기능 설명
코드가 변경되면 기존 문서를 완전히 새로 생성하지 않고 변경사항만 반영하여 업데이트합니다.

### 작동 방식
1. **변경 감지**: 소스 파일의 마지막 수정 시간과 문서 생성 시간 비교
2. **스마트 분석**: 새로운 메소드, 수정된 로직, 삭제된 기능 자동 감지
3. **컨텍스트 유지**: 기존 문서의 형식과 스타일 보존
4. **증분 업데이트**: 변경된 부분만 AI로 재생성

### 예시
```diff
// 기존 문서
=== login(username, password)
로그인 기능을 수행합니다.

+ // 새로 추가된 내용
+ === validateToken(token)
+ JWT 토큰의 유효성을 검증합니다.

// 수정된 내용은 자동으로 업데이트
=== login(username, password, rememberMe)  // ← 매개변수 추가됨
로그인 기능을 수행하며, 로그인 상태 유지 옵션을 제공합니다.  // ← 설명 업데이트됨
```

---

## 🗑️ 자동 파일 삭제

### 기능 설명
소스 코드에서 파일이 삭제되면 해당 문서도 자동으로 삭제하여 문서와 코드의 동기화를 유지합니다.

### 작동 방식
1. **삭제 감지**: PR에서 `status: 'removed'` 파일 감지
2. **문서 매핑**: 삭제된 소스 파일에 대응하는 문서 파일 찾기
3. **안전 삭제**: 문서 파일 존재 확인 후 삭제
4. **로그 기록**: 삭제된 문서 목록을 PR 코멘트에 보고

### 예시 시나리오
```bash
# PR에서 파일 삭제
- src/old-feature.js (삭제됨)
- src/deprecated/legacy.js (삭제됨)

# 자동으로 문서도 삭제
- docs/doxai/src/old-feature.adoc (자동 삭제)
- docs/doxai/src/deprecated/legacy.adoc (자동 삭제)
```

### 결과 보고
```markdown
✅ Documentation generation completed!

📊 Summary:
- Generated: 3
- Updated: 2
- **Deleted: 2**  ← 삭제된 문서 표시
- Skipped: 1

🗑️ Deleted documentation:
- docs/doxai/src/old-feature.adoc
- docs/doxai/src/deprecated/legacy.adoc
```

---

## 📁 파일 스코프 필터링

### 기능 설명
프로젝트의 특정 부분만 선택적으로 문서화할 수 있는 강력한 필터링 시스템입니다.

### 사용법
```bash
# 모든 파일 문서화
!doxai

# 특정 폴더만 포함
!doxai --scope include:src/api,src/auth

# 특정 파일 타입만 포함
!doxai --scope include:*.js,*.ts

# 테스트 파일 제외
!doxai --scope exclude:test,spec,__tests__

# 복합 조건 (Node.js 모듈과 설정 파일 제외)
!doxai --scope exclude:node_modules,dist,build,*.config.js
```

### 지원하는 패턴
- **정확한 파일명**: `package.json`
- **폴더 경로**: `src/components/`
- **와일드카드**: `*.test.js`, `src/**/*.ts`
- **다중 패턴**: `pattern1,pattern2,pattern3`

---

## 🌍 다국어 지원

### 기능 설명
개발팀의 언어에 맞춰 한국어 또는 영어로 문서를 생성할 수 있습니다.

### 사용법
```bash
# 영어 문서 생성 (기본값)
!doxai

# 한국어 문서 생성
!doxai --lang ko

# 특정 스코프 + 한국어
!doxai --scope include:src/core --lang ko
```

### 언어별 문서 품질
| 언어 | 특징 | 예시 |
|------|------|------|
| **한국어** | • 자연스러운 한국어 표현<br>• 개발 용어의 적절한 번역<br>• 한국 개발 문화 반영 | `사용자 인증을 처리하는 클래스입니다`<br>`매개변수가 올바르지 않을 때 예외가 발생합니다` |
| **영어** | • 국제 표준 기술 문서 형식<br>• 개발자 친화적 표현<br>• 글로벌 협업에 적합 | `Handles user authentication processes`<br>`Throws exception when parameters are invalid` |

---

## ♻️ PR 재사용 시스템

### 기능 설명
같은 PR에 대해 여러 번 문서화 요청 시, 새로운 PR을 만들지 않고 기존 문서 PR을 업데이트합니다.

### 작동 방식
1. **기존 PR 검색**: `docs: Generate documentation for doxai (PR #123)` 패턴으로 검색
2. **브랜치 재사용**: `docs/doxai-pr-123` 브랜치 재사용
3. **스마트 업데이트**: 변경된 파일만 새로 처리
4. **이력 관리**: 각 업데이트마다 코멘트로 변경 이력 기록

### 시나리오 예시
```bash
# 첫 번째 실행
!doxai
→ 새 PR #456 생성: "docs: Generate documentation for doxai (PR #123)"

# 같은 PR에서 두 번째 실행 (코드 수정 후)
!doxai --lang ko
→ 기존 PR #456 업데이트 (새 PR 생성 안함)
→ 코멘트 추가: "Documentation updated by @username"
```

### 장점
- ✅ **PR 정리**: 중복 문서 PR 방지
- ✅ **이력 추적**: 모든 문서 변경 이력을 한 곳에서 관리
- ✅ **리뷰 효율성**: 리뷰어가 하나의 PR에서 모든 문서 변경사항 확인

---

## ⚡ 스마트 스킵 기능

### 기능 설명
불필요한 AI 호출을 방지하여 비용과 시간을 절약하는 지능적 시스템입니다.

### 스킵 조건
1. **소스 코드 미변경**: 마지막 문서 생성 이후 소스 파일이 변경되지 않음
2. **문서 최신 상태**: 기존 문서가 현재 코드와 일치함
3. **중복 파일**: 이미 처리된 파일

### 작동 예시
```bash
# 첫 번째 실행: 5개 파일 모두 처리
!doxai
→ Generated: 5 files

# 2개 파일만 수정 후 두 번째 실행
!doxai
→ Generated: 0 files
→ Updated: 2 files
→ Skipped: 3 files (unchanged)  ← 스마트 스킵!
```

### 리포트 예시
```markdown
📊 Summary:
- Total files: 10
- Generated: 2
- Updated: 3
- **Skipped: 5** (unchanged)
- Failed: 0

⏭️ Skipped files:
- src/utils/constants.js - Source unchanged
- src/config/database.js - Source unchanged
- src/models/User.js - Source unchanged
```

---

## 🎯 지능적 파일 타입 감지

### 기능 설명
60개 이상의 파일 타입을 자동으로 감지하고 문서화 대상을 지능적으로 선별합니다.

### 지원 파일 타입

#### 프로그래밍 언어
```
JavaScript/TypeScript: .js, .jsx, .ts, .tsx
Python: .py, .pyw
Java/JVM: .java, .kt, .scala
C/C++: .c, .cpp, .h, .hpp
기타: .cs, .rs, .go, .rb, .php, .swift, .dart, .r
```

#### 웹 개발
```
마크업: .html, .htm
스타일링: .css, .scss, .sass, .less
프레임워크: .vue, .svelte
```

#### 설정 및 데이터
```
데이터: .json, .yaml, .yml, .xml
스크립트: .sh, .bash, .ps1, .bat
빌드: Dockerfile, Makefile, .gradle
```

### 자동 제외 파일
```
❌ 빌드 폴더: node_modules/, dist/, build/
❌ 바이너리: .png, .jpg, .exe, .dll
❌ 환경 설정: .env, package-lock.json
❌ IDE 설정: .vscode/, .idea/
```

---

## 🤖 AI 프로바이더 지원

### 기능 설명
다양한 AI 프로바이더를 지원하여 사용자의 선호와 예산에 맞는 선택이 가능합니다.

### 지원 프로바이더

#### Google (추천)
```yaml
ai-provider: 'google'
ai-model: 'gemini-2.0-flash'
```
- ✅ **무료 사용량 풍부**
- ✅ **빠른 응답 속도**
- ✅ **높은 코드 이해력**

#### OpenAI
```yaml
ai-provider: 'openai'
ai-model: 'gpt-4'
```
- ✅ **우수한 문서 품질**
- ⚠️ **유료 사용**

#### Anthropic
```yaml
ai-provider: 'anthropic'
ai-model: 'claude-3-opus'
```
- ✅ **뛰어난 추론 능력**
- ⚠️ **유료 사용**

---

## 📊 실시간 진행 상황 알림

### 기능 설명
문서 생성 과정을 실시간으로 모니터링하고 상세한 진행 상황을 제공합니다.

### 알림 단계

#### 1. 시작 알림
```markdown
🔄 @username Starting documentation generation for 5 files...
```

#### 2. 진행 중 로그 (GitHub Actions)
```bash
2024-01-01T10:00:01Z INFO [DocumentationGenerator] Processing file: src/auth/login.js
2024-01-01T10:00:05Z INFO [AIClient] Response received from google (gemini-2.0-flash) in 3.2s
2024-01-01T10:00:06Z INFO [GitHubClient] Committed file: docs/doxai/src/auth/login.adoc
```

#### 3. 최종 결과 알림
```markdown
✅ @username Documentation generation completed!

📊 Summary:
- Total files: 15
- Generated: 5 files
- Updated: 3 files
- Deleted: 1 file
- Skipped: 6 files (unchanged)
- Failed: 0 files

📚 Documentation PR: https://github.com/user/repo/pull/456 (created)

📄 Generated Documentation:
- docs/doxai/src/auth/login.adoc
- docs/doxai/src/api/users.adoc
- docs/doxai/src/utils/helpers.adoc

📝 Updated Documentation:
- docs/doxai/src/core/app.adoc
- docs/doxai/src/config/database.adoc

⏭️ Skipped (unchanged):
- docs/doxai/src/models/User.adoc
- docs/doxai/src/routes/index.adoc
```

#### 4. 오류 시 상세 정보
```markdown
❌ @username Some files failed to process:

⚠️ Failed files:
- src/complex-algorithm.js: AI API rate limit exceeded
- src/malformed-syntax.js: File parsing error

✅ Successfully processed: 8/10 files
📚 Documentation PR: https://github.com/user/repo/pull/456
```

---

## 🚀 종합 예시: 실제 사용 시나리오

### 시나리오: 대규모 프로젝트의 API 폴더만 문서화

```bash
# 명령어
!doxai --scope include:src/api --lang ko

# 처리 과정
1. 🔍 PR #123에서 변경된 파일 분석
2. 📁 src/api 폴더의 파일만 필터링
3. 🎯 문서화 대상: 8개 파일 (5개 수정, 2개 신규, 1개 삭제)
4. ⚡ 스마트 스킵: 3개 파일 (변경 없음)
5. 🤖 AI로 5개 파일 처리 (한국어)
6. 🗑️ 1개 문서 자동 삭제
7. ♻️ 기존 문서 PR 업데이트
8. 📊 결과 보고

# 최종 결과
✅ @developer 문서 생성이 완료되었습니다!

📊 요약:
- 전체 파일: 8개
- 새로 생성: 2개
- 업데이트: 3개  
- 삭제: 1개
- 건너뜀: 3개 (변경 없음)

📚 문서 PR: https://github.com/myproject/repo/pull/456 (업데이트됨)
```

---

## 💡 사용 팁

### 효율적인 사용법
1. **점진적 문서화**: 전체 프로젝트 대신 폴더별로 나누어 실행
2. **스코프 활용**: 변경이 많은 폴더만 선별적으로 문서화
3. **언어 일관성**: 팀 내에서 문서 언어 통일
4. **정기적 업데이트**: 대규모 변경 후 전체 문서 동기화

### 권장 워크플로우
```bash
# 1. 새 기능 개발 시 (특정 모듈만)
!doxai --scope include:src/new-feature

# 2. 버그 수정 시 (영향받은 파일만)
!doxai --scope include:src/auth,src/api

# 3. 릴리즈 전 (전체 동기화)
!doxai

# 4. 한국어 팀 (로컬라이제이션)
!doxai --lang ko
```

---

## 🎉 결론

Doxai 단순한 도구가 아닌 **지능적인 문서화 파트너**입니다. 한 번의 명령어로 프로젝트 전체의 문서를 체계적으로 관리하고, 코드 변경사항을 실시간으로 반영하여 항상 최신 상태의 문서를 유지할 수 있습니다.

**🚀 지금 바로 시작해보세요!**
