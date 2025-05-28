const config = require('./config');

/**
 * Documentation prompt templates and generators
 */
class DocsPromptGenerator {
  constructor() {
    // Language mappings for code blocks
    this.codeLanguageMap = {
      'java': 'Java',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'rb': 'Ruby',
      'php': 'PHP',
      'cs': 'C#',
      'go': 'Go',
      'sh': 'Shell',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL',
      'yml': 'YAML',
      'yaml': 'YAML',
      'json': 'JSON',
      'md': 'Markdown',
      'xml': 'XML',
      'cpp': 'C++',
      'c': 'C',
      'rs': 'Rust',
      'kt': 'Kotlin',
      'swift': 'Swift',
      'dart': 'Dart',
      'r': 'R'
    };
  }

  /**
   * Get clean filename from full path
   * @param {string} fullPath - Full file path
   * @returns {string} - Clean filename only
   */
  getCleanFilename(fullPath) {
    return fullPath.split('/').pop();
  }

  /**
   * Get language display name from file extension
   * @param {string} filename - File name
   * @returns {string} - Language display name
   */
  getLanguageFromFilename(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return this.codeLanguageMap[extension] || extension.toUpperCase();
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date
   */
  formatDate(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  /**
   * Create documentation prompt for new file
   * @param {string} filename - Source file name
   * @param {string} fileContent - Source file content
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - User prompt
   */
  createDocsPrompt(filename, fileContent, prDetails, language = 'en') {
    const codeLanguage = this.getLanguageFromFilename(filename);
    const cleanFilename = this.getCleanFilename(filename);
    const template = this.getTemplate(language, 'create', codeLanguage);

    return template
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, cleanFilename)
    .replace(/\${fullPath}/g, filename)
    .replace(/\${fileContent}/g, fileContent);
  }

  /**
   * Create documentation update prompt
   * @param {string} filename - Source file name
   * @param {string} fileContent - Current file content
   * @param {string} existingDocContent - Existing documentation
   * @param {object} prDetails - PR details
   * @param {string} language - Documentation language (ko/en)
   * @returns {string} - User prompt
   */
  createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language = 'en') {
    const codeLanguage = this.getLanguageFromFilename(filename);
    const cleanFilename = this.getCleanFilename(filename);
    const template = this.getTemplate(language, 'update', codeLanguage);

    return template
    .replace(/\${prNumber}/g, prDetails.number)
    .replace(/\${author}/g, prDetails.author)
    .replace(/\${createdDate}/g, this.formatDate(prDetails.createdAt))
    .replace(/\${updatedDate}/g, this.formatDate(prDetails.updatedAt))
    .replace(/\${updatedBy}/g, prDetails.mergedBy || prDetails.author)
    .replace(/\${filename}/g, cleanFilename)
    .replace(/\${fullPath}/g, filename)
    .replace(/\${fileContent}/g, fileContent)
    .replace(/\${existingDocContent}/g, existingDocContent);
  }

  /**
   * Get template based on language and type
   * @param {string} language - Language (ko/en)
   * @param {string} type - Template type (create/update)
   * @param {string} codeLanguage - Programming language name
   * @returns {string} - Template string
   */
  getTemplate(language, type, codeLanguage) {
    const templates = {
      ko: {
        create: `# 코드 문서화 요청

다음 ${codeLanguage} 파일을 분석하여 **한국어로** AsciiDoc 형식의 기술 문서를 생성해주세요.

## PR 정보
- PR 번호: \${prNumber}
- 작성자: \${author}
- 작성일: \${createdDate}
- 마지막 수정: \${updatedDate} by \${updatedBy}

## 파일 정보
- 파일명: \${filename}
- 전체 경로: \${fullPath}
- 언어: ${codeLanguage}

## 코드
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## 핵심 원칙: 자연스러운 문체

### 문체 가이드
- 전문 용어는 쉬운 말로 풀어서 설명

### 좋은 문장 예시
- ❌ "이 클래스는 레드-블랙 트리 자료구조를 구현하여 균형 잡힌 이진 탐색 트리 기능을 제공합니다"
- ✅ "데이터를 빠르게 찾고 저장할 수 있는 레드-블랙 트리를 구현한다. 데이터가 한쪽으로 치우치지 않도록 자동으로 균형을 맞춘다"

## 중요한 요청사항
1. **자연스럽고 읽기 쉬운 한국어로 작성하세요**
2. 위 코드를 철저히 분석하여 AsciiDoc 형식의 개발자 문서를 생성해주세요.
3. 문서는 개발자가 이 코드를 이해하고 사용하는 데 필요한 모든 정보를 포함해야 합니다.
4. 클래스/파일의 주요 기능, 메소드, 의존성 등을 명확하게 설명해주세요.
5. 시스템 프롬프트에서 제공한 AsciiDoc 템플릿 형식을 정확히 따라주세요.
6. 코드에서 명확하지 않은 부분은 추측하지 말고, 문서에 이를 명시해주세요.
7. **모든 설명과 주석은 반드시 한국어로 작성해주세요.**
8. **코드블럭(\`\`\`) 없이 순수한 AsciiDoc 문서만 반환하세요**. 추가 설명은 필요 없습니다.`,

        update: `# 코드 문서 업데이트 요청

다음 ${codeLanguage} PR이 변경되었습니다. 기존 문서를 **자연스러운 한국어로** 업데이트해주세요.

## PR 정보
- PR 번호: \${prNumber}
- 작성자: \${author}
- 작성일: \${createdDate}
- 마지막 수정: \${updatedDate} by \${updatedBy}

## 파일 정보
- 파일명: \${filename}
- 언어: ${codeLanguage}

## 현재 코드
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## 기존 문서
\`\`\`asciidoc
\${existingDocContent}
\`\`\`

## 중요한 요청사항
1. **반드시 한국어로 문서를 업데이트해주세요.**
2. 변경된 코드를 반영하여 기존 문서를 업데이트해주세요.
3. 새로운 메소드나 기능은 문서에 추가하고, 제거된 것은 삭제해주세요.
4. 기존 문서의 형식과 스타일을 유지해주세요.
5. PR 정보 섹션을 최신 정보로 업데이트해주세요.
6. **모든 설명과 주석은 반드시 한국어로 작성해주세요.**
7. 업데이트된 전체 AsciiDoc(코드블럭(\`\`\`) 없는) 문서를 반환해주세요.`
      },

      en: {
        create: `# Documentation Request

Please analyze the following ${codeLanguage} file and generate technical documentation in AsciiDoc format **in English**.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Full Path: \${fullPath}
- Language: ${codeLanguage}

## Code
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

### Writing Style
- Explain complex technical terms in simple language
- Write as if explaining to a colleague who's seeing this code for the first time

### Example Style
❌ Poor: "The RedBlackTree class implements a red-black tree based on binary search tree. Red-black tree is a kind of balanced binary search tree that..."

✅ Good: "This class creates a red-black tree that helps you store and find data quickly. Unlike regular trees, it automatically keeps itself balanced so lookups stay fast even as you add more data."

## Requirements
1. **Write in clear, natural English that's easy to understand**
2. Thoroughly analyze the above code and generate developer documentation in AsciiDoc format.
3. The documentation should include all necessary information for developers to understand and use this code.
4. Clearly explain the main functionality, methods, and dependencies of the class/file.
5. Follow the AsciiDoc template format provided in the system prompt exactly.
6. Do not make assumptions about unclear parts; indicate these in the documentation.
7. **All descriptions and comments must be written in English.**
8. **Return pure AsciiDoc content without code blocks (\`\`\`)** without additional explanations.`,

        update: `# Documentation Update Request

The following ${codeLanguage} file has been modified. Please update the existing documentation **in English**.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Language: ${codeLanguage}

## Current Code
\`\`\`${codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## Existing Documentation
\`\`\`asciidoc
\${existingDocContent}
\`\`\`

## Requirements
1. **Update documentation in English.**
2. Update the existing documentation to reflect the code changes.
3. Add new methods or features to the documentation and remove deleted ones.
4. Maintain the existing document's format and style.
5. Update the PR information section with the latest details.
6. **All descriptions and comments must be written in English.**
7. Return the complete updated AsciiDoc(Return pure AsciiDoc content without code blocks (\`\`\`)) document.`
      }
    };

    const languageTemplates = templates[language] || templates.en;
    return languageTemplates[type] || languageTemplates.create;
  }

  /**
   * Get system prompt template
   * @param {string} language - Language (ko/en)
   * @returns {string} - System prompt
   */
  getSystemPrompt(language = 'en') {
    const prompts = {
      ko: `당신은 코드 문서화 전문가입니다. 제공된 코드 파일을 철저히 분석하여 **자연스럽고 이해하기 쉬운 한국어로** AsciiDoc 형식의 정확하고 유용한 문서를 생성해야 합니다.

## 🔥 중요: 문서 제목 규칙
- 문서 제목(=)에는 반드시 **파일명만** 사용하세요 (전체 경로 X)
- 예시: "= SignUpService.java" (O), "= src/main/java/.../SignUpService.java" (X)

## 핵심 원칙: 자연스러운 문체

### 문체 가이드
- 전문 용어는 쉬운 말로 풀어서 설명

### 좋은 문장 예시
- ❌ "이 클래스는 레드-블랙 트리 자료구조를 구현하여 균형 잡힌 이진 탐색 트리 기능을 제공합니다"
- ✅ "데이터를 빠르게 찾고 저장할 수 있는 레드-블랙 트리를 구현한다. 데이터가 한쪽으로 치우치지 않도록 자동으로 균형을 맞춘다"

## 중요: 언어 요구사항
- **코드블럭(\`\`\`) 없이 순수한 AsciiDoc 문서만 반환하세요**.
- **모든 문서는 반드시 한국어로 작성해야 합니다.**
- 기술 용어는 한국어로 번역하되, 필요시 영어 원문을 괄호 안에 병기할 수 있습니다.
- 예: "연결 리스트(Linked List)", "해시 테이블(Hash Table)"

## 분석 방법
1. 코드를 전체적으로 살펴보고 주요 목적과 기능을 파악하세요.
2. 클래스/파일의 역할과 시스템 내에서의 위치를 이해하세요.
3. 모든 public 메소드와 중요한 private 메소드를 식별하세요.
4. 코드가 의존하는 외부 라이브러리와 내부 모듈을 파악하세요.

## 포함해야 할 정보
1. 클래스/파일의 주요 기능과 역할 (핵심 목적 중심)
2. 주요 메소드/함수와 그 목적 (getter/setter와 같은 단순 메소드는 생략 가능)
3. 의존성 (다른 클래스/라이브러리/모듈 등)
4. 주요 사용 사례 또는 예제 (가능한 경우)
5. 발생 가능한 중요 예외 상황

## 문서화 원칙
- **모든 내용을 한국어로 명확하고 간결하게 작성하세요.**
- 기술적으로 정확한 설명을 제공하세요.
- 개발자가 코드를 빠르게 이해하고 사용할 수 있도록 작성하세요.
- 코드에서 명확하지 않은 부분이 있다면, 추측하지 말고 "이 부분의 목적은 코드에서 명확하지 않습니다"라고 표시하세요.

다음 AsciiDoc 형식을 정확히 사용하세요:

${this.getAsciiDocTemplate()}`,

      en: `You are a code documentation expert. You need to thoroughly analyze the provided code file and generate precise and useful documentation **in English** in AsciiDoc format.

## 🔥 Important: Document Title Rules  
- Use **filename only** in document title (=), NOT the full path
- Example: "= SignUpService.java" (✅), "= src/main/java/.../SignUpService.java" (❌)

### Writing Style
- Explain complex technical terms in simple language
- Write as if explaining to a colleague who's seeing this code for the first time

### Example Style
❌ Poor: "The RedBlackTree class implements a red-black tree based on binary search tree. Red-black tree is a kind of balanced binary search tree that..."

✅ Good: "This class creates a red-black tree that helps you store and find data quickly. Unlike regular trees, it automatically keeps itself balanced so lookups stay fast even as you add more data."

## Important: Language Requirements
- Return pure AsciiDoc content without code blocks (\`\`\`)
- **All documentation must be written in English.**
- Use clear, professional English throughout the document.
- Technical terms should be explained clearly for international developers.

## Analysis Method
1. Review the code holistically to understand its main purpose and functionality.
2. Understand the role of the class/file and its position within the system.
3. Identify all public methods and important private methods.
4. Identify external libraries and internal modules the code depends on.

## Information to Include
1. Main functionality and role of the class/file (focus on core purpose)
2. Key methods/functions and their purposes (simple methods like getters/setters can be omitted)
3. Dependencies (other classes/libraries/modules etc.)
4. Main use cases or examples (where possible)
5. Important exceptions that may occur

## Documentation Principles
- **Write everything clearly and concisely in English.**
- Provide technically accurate descriptions.
- Write for developers to quickly understand and use the code.
- If something is unclear in the code, don't guess - indicate "The purpose of this section is not clear from the code".

Use the following AsciiDoc format exactly:

${this.getAsciiDocTemplateEn()}`
    };

    return prompts[language] || prompts.en;
  }

  /**
   * Get AsciiDoc template structure
   * @returns {string} - AsciiDoc template
   */
  getAsciiDocTemplateEn() {
    return `= {File Name Only (e.g., SignUpService.java)}
:toc:
:source-highlighter: highlight.js

== Overview

The \`{File Name Only}\` is responsible for {main functionality and role}.

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|File Type|{Class/Function/Script/Config/Module}
|Language|{Programming Language}
|===

== Detailed Description

{Specific functionality, purpose, and role within the system}

== Dependencies

* \`{Dependency1}\` - {Purpose and role of the dependency}
* \`{Dependency2}\` - {Purpose and role of the dependency}

== Key Components

=== {Function/Method/Configuration Name}

[source,{language}]
----
{Function signature/Configuration example/Code block}
----

*Function*: {Task performed by this component}

*Input*:
* \`{Parameter/Option name}\` (\`{Type}\`) - {Description}

*Output*: \`{Return type/Result}\` - {Meaning and expected result}

== Implementation Features

{Special patterns, algorithms, configuration methods used in the file}

== Notes

* {Important considerations when using this file}
* {Constraints or prerequisites}
* {Known limitations}`;
  }

  getAsciiDocTemplate() {
    return `= {파일명만 (예: SignUpService.java)}
:toc:
:source-highlighter: highlight.js

== 개요

\`{파일명만}\`은/는 {주요 기능과 역할}을 담당합니다.

[cols="1,3"]
|===
|PR 번호|#{PR 번호}
|작성자|@{작성자}
|작성일|{작성일}
|마지막 수정|{마지막 수정일} by @{수정자}
|파일 유형|{클래스/함수/스크립트/설정파일/모듈}
|언어|{프로그래밍 언어}
|===

== 상세 설명

{파일의 구체적인 기능, 목적, 시스템에서의 역할}

== 의존성

* \`{의존성1}\` - {의존성의 목적과 역할}
* \`{의존성2}\` - {의존성의 목적과 역할}

== 주요 구성요소

=== {함수명/메소드명/설정항목명}

[source,{language}]
----
{함수 시그니처/설정 예시/코드 블록}
----

*기능*: {해당 요소가 수행하는 작업}

*입력값*:
* \`{매개변수/옵션명}\` (\`{타입}\`) - {설명}

*출력값*: \`{반환타입/결과}\` - {의미와 예상 결과}

== 구현 특징

{파일에서 사용된 특별한 패턴, 알고리즘, 설정 방식 등}

== 주의사항

* {파일 사용시 주의해야 할 점}
* {제약사항이나 전제조건}
* {알려진 제한사항}`;
  }
}

// Create singleton instance
const promptGenerator = new DocsPromptGenerator();

// Export compatibility functions
module.exports = {
  docsPromptTemplates: {
    ko: promptGenerator.getSystemPrompt('ko'),
    en: promptGenerator.getSystemPrompt('en')
  },
  createDocsPrompt: (filename, fileContent, prDetails, language) => {
    console.log(`[DocsPrompt] Creating docs prompt for language: ${language}`);
    return promptGenerator.createDocsPrompt(filename, fileContent, prDetails, language);
  },
  createUpdateDocsPrompt: (filename, fileContent, existingDocContent, prDetails, language) => {
    console.log(`[DocsPrompt] Creating update docs prompt for language: ${language}`);
    return promptGenerator.createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language);
  },
  DocsPromptGenerator
};
