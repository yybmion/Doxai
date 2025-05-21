const docsPromptTemplates = {
  ko: `당신은 코드 문서화 전문가입니다. 제공된 코드 파일을 철저히 분석하여 AsciiDoc 형식의 정확하고 유용한 문서를 생성해야 합니다.

## 분석 방법
1. 코드를 전체적으로 살펴보고 주요 목적과 기능을 파악하세요.
2. 클래스/파일의
 역할과 시스템 내에서의 위치를 이해하세요.
3. 모든 public 메소드와 중요한 private 메소드를 식별하세요.
4. 코드가 의존하는 외부 라이브러리와 내부 모듈을 파악하세요.

## 포함해야 할 정보
1. 클래스/파일의 주요 기능과 역할 (핵심 목적 중심)
2. 주요 메소드/함수와 그 목적 (getter/setter와 같은 단순 메소드는 생략 가능)
3. 의존성 (다른 클래스/라이브러리/모듈 등)
4. 주요 사용 사례 또는 예제 (가능한 경우)
5. 발생 가능한 중요 예외 상황

## 문서화 원칙
- 명확하고 간결하게 작성하세요.
- 기술적으로 정확한 설명을 제공하세요.
- 개발자가 코드를 빠르게 이해하고 사용할 수 있도록 작성하세요.
- 코드에서 명확하지 않은 부분이 있다면, 추측하지 말고 "이 부분의 목적은 코드에서 명확하지 않습니다"라고 표시하세요.
- 모든 메소드와 속성이 적절히 문서화되었는지 확인하세요.

다음 AsciiDoc 형식을 정확히 사용하세요:

= {클래스/파일 이름}
:toc:
:source-highlighter: highlight.js

== 개요

\`{클래스/파일 이름}\`은/는 {주요 기능 설명}을 담당합니다. {시스템에서의 역할 간략 설명}

[cols="1,3"]
|===
|PR 번호|#{PR 번호}
|작성자|@{작성자}
|작성일|{작성일}
|마지막 수정|{마지막 수정일} by @{수정자}
|===

== 상세 설명

{클래스/파일에 대한 상세 설명 - 2-3문단으로 구체적인 기능과 목적, 설계 의도 등을 설명}

== 주요 사용 사례

[source,javascript]
----
// 이 클래스/파일을 사용하는 간단한 예제 코드
const instance = new {클래스명}(...);
instance.{주요메소드}(...);
----

== 의존성

* \`{의존성1}\` - {의존성의 목적과 이 클래스와의 관계}
* \`{의존성2}\` - {의존성의 목적과 이 클래스와의 관계}

== 주요 메소드

=== {메소드명}({매개변수 타입과 이름})

[source,{언어}]
----
// 메소드 시그니처와 주요 로직만 포함한 간략화된 코드
{간략화된 메소드 코드 - 핵심 로직 중심}
----

*목적*: {메소드의 구체적인 목적과 수행하는 작업}

*매개변수*:

* \`{매개변수명}\` - {타입과 목적, 제약사항이 있다면 함께 명시}

*반환값*: {반환 타입과 의미, 가능한 반환값의 범위}

*예외*:

* \`{예외명}\` - {발생 조건과 처리 방법}

*사용 예*:

[source,{언어}]
----
// 이 메소드를 사용하는 예제 코드
const result = instance.{메소드명}(params);
----

== 주의사항

* {사용 시 주의해야 할 중요 사항}
* {알려진 제한사항이나 주의점}`,

  en: `You are a code documentation expert. You need to thoroughly analyze the provided code file and generate precise and useful documentation in AsciiDoc format.

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
- Write clearly and concisely.
- Provide technically accurate descriptions.
- Write for developers to quickly understand and use the code.
- If something is unclear in the code, don't guess - indicate "The purpose of this section is not clear from the code".
- Ensure all methods and properties are appropriately documented.

Use the following AsciiDoc format exactly:

= {Class/File Name}
:toc:
:source-highlighter: highlight.js

== Overview

The \`{Class/File Name}\` is responsible for {main functionality description}. {Brief explanation of role in the system}

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|===

== Detailed Description

{Detailed description of the class/file - 2-3 paragraphs explaining specific functionality, purpose, design intentions, etc.}

== Main Use Cases

[source,javascript]
----
// Simple example code using this class/file
const instance = new {ClassName}(...);
instance.{mainMethod}(...);
----

== Dependencies

* \`{Dependency1}\` - {Purpose of the dependency and its relationship with this class}
* \`{Dependency2}\` - {Purpose of the dependency and its relationship with this class}

== Key Methods

=== {MethodName}({parameter types and names})

[source,{language}]
----
// Method signature and main logic only
{Simplified method code - focus on core logic}
----

*Purpose*: {Specific purpose of the method and what it accomplishes}

*Parameters*:

* \`{ParameterName}\` - {Type and purpose, constraints if any}

*Return Value*: {Return type and meaning, possible range of return values}

*Exceptions*:

* \`{ExceptionName}\` - {When it occurs and how to handle it}

*Usage Example*:

[source,{language}]
----
// Example code using this method
const result = instance.{methodName}(params);
----

== Important Notes

* {Important considerations when using this code}
* {Known limitations or cautions}`
};

function createDocsPrompt(filename, fileContent, prDetails, language = 'ko') {
  const fileExtension = filename.split('.').pop().toLowerCase();

  const codeLanguageMap = {
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
    'xml': 'XML'
  };

  const codeLanguage = codeLanguageMap[fileExtension] || fileExtension;

  // 언어에 따른 다른 프롬프트 생성
  if (language === 'ko') {
    return `
# 코드 문서화 요청

다음 ${codeLanguage} 파일을 분석하여 한국어로 AsciiDoc 형식의 기술 문서를 생성해주세요.

## PR 정보
- PR 번호: ${prDetails.number}
- 작성자: ${prDetails.author}
- 작성일: ${new Date(prDetails.createdAt).toISOString().split('T')[0]}
- 마지막 수정: ${new Date(prDetails.updatedAt).toISOString().split('T')[0]} by ${prDetails.mergedBy || prDetails.author}

## 파일 정보
- 파일명: ${filename}
- 언어: ${codeLanguage}

## 코드
\`\`\`${codeLanguage}
${fileContent}
\`\`\`

## 요청사항
1. 위 코드를 철저히 분석하여 AsciiDoc 형식의 개발자 문서를 생성해주세요.
2. 문서는 개발자가 이 코드를 이해하고 사용하는 데 필요한 모든 정보를 포함해야 합니다.
3. 클래스/파일의 주요 기능, 메소드, 의존성 등을 명확하게 설명해주세요.
4. 프롬프트에서 제공한 AsciiDoc 템플릿 형식을 정확히 따라주세요.
5. 코드에서 명확하지 않은 부분은 추측하지 말고, 문서에 이를 명시해주세요.
6. AsciiDoc 문서만 반환해주세요. 추가 설명은 필요 없습니다.
`;
  } else {
    return `
# Documentation Request

Please analyze the following ${codeLanguage} file and generate technical documentation in AsciiDoc format in English.

## PR Information
- PR Number: ${prDetails.number}
- Author: ${prDetails.author}
- Created Date: ${new Date(prDetails.createdAt).toISOString().split('T')[0]}
- Last Modified: ${new Date(prDetails.updatedAt).toISOString().split('T')[0]} by ${prDetails.mergedBy || prDetails.author}

## File Information
- Filename: ${filename}
- Language: ${codeLanguage}

## Code
\`\`\`${codeLanguage}
${fileContent}
\`\`\`

## Requirements
1. Thoroughly analyze the above code and generate developer documentation in AsciiDoc format.
2. The documentation should include all information necessary for a developer to understand and use this code.
3. Clearly explain the main functionality of the class/file, its methods, dependencies, etc.
4. Follow the AsciiDoc template format provided in the prompt exactly.
5. Do not make assumptions about unclear parts of the code; indicate these in the documentation.
6. Return only the AsciiDoc document. No additional explanations are needed.
`;
  }
}

function createUpdateDocsPrompt(filename, fileContent, existingDocContent, prDetails, language = 'ko') {
  const fileExtension = filename.split('.').pop().toLowerCase();
  const codeLanguage = codeLanguageMap[fileExtension] || fileExtension;

  if (language === 'ko') {
    return `
# 코드 문서 업데이트 요청

다음 ${codeLanguage} 파일이 PR에서 변경되었습니다. 기존 문서를 업데이트해 주세요.

## PR 정보
- PR 번호: ${prDetails.number}
- 작성자: ${prDetails.author}
- 작성일: ${new Date(prDetails.createdAt).toISOString().split('T')[0]}
- 마지막 수정: ${new Date(prDetails.updatedAt).toISOString().split('T')[0]} by ${prDetails.mergedBy || prDetails.author}

## 파일 정보
- 파일명: ${filename}
- 언어: ${codeLanguage}

## 현재 코드
\`\`\`${codeLanguage}
${fileContent}
\`\`\`

## 기존 문서
\`\`\`asciidoc
${existingDocContent}
\`\`\`

## 요청사항
1. 기존 문서를 유지하면서 변경된 코드를 반영하여 업데이트해주세요.
2. 새로운 메소드나 기능이 추가된 경우 해당 내용을 문서에 추가해주세요.
3. 제거된 메소드나 기능이 있다면 해당 내용을 문서에서 제거해주세요.
4. 변경된 내용에 대해서만 업데이트하고, 나머지 부분은 그대로 유지해주세요.
5. AsciiDoc 형식을 유지해주세요.
6. 업데이트된 AsciiDoc 문서 전체를 반환해주세요.
`;
  } else {
    return `
# Documentation Update Request

The following ${codeLanguage} file has been modified in a PR. Please update the existing documentation.

## PR Information
- PR Number: ${prDetails.number}
- Author: ${prDetails.author}
- Created Date: ${new Date(prDetails.createdAt).toISOString().split('T')[0]}
- Last Modified: ${new Date(prDetails.updatedAt).toISOString().split('T')[0]} by ${prDetails.mergedBy || prDetails.author}

## File Information
- Filename: ${filename}
- Language: ${codeLanguage}

## Current Code
\`\`\`${codeLanguage}
${fileContent}
\`\`\`

## Existing Documentation
\`\`\`asciidoc
${existingDocContent}
\`\`\`

## Requirements
1. Update the existing documentation to reflect the changes in the code.
2. Add documentation for any new methods or features.
3. Remove documentation for any removed methods or features.
4. Only update the relevant parts and keep the rest of the documentation intact.
5. Maintain the AsciiDoc format.
6. Return the complete updated AsciiDoc document.
`;
  }
}

module.exports = {
  docsPromptTemplates,
  createDocsPrompt,
  createUpdateDocsPrompt
};
