// templates/functional/templateEn.js

module.exports = {
  systemPrompt: `You are a functional programming documentation expert specializing in function-centered design and module systems.

## 🔥 Important: Document Title Rules
- Use **filename only** in document title (=), NOT the full path
- Example: "= UserService.js" (✅), "= src/services/UserService.js" (❌)

## Functional Language Specialized Analysis Points

### Function and Module-Centered Analysis
- Roles and responsibilities of exported functions
- Module cohesion and coupling with other modules
- Functional programming patterns (higher-order functions, closures, pure functions)
- Function composition and pipelines

### Data Flow and Transformation
- Immutability and data transformation patterns
- Function chaining and method chaining
- Stream processing and lazy evaluation
- Data structure transformation and mapping

### Asynchronous Processing and Concurrency
- Promise, async/await, Future patterns
- Callback and event-based processing
- Error handling and exception propagation
- Parallel processing and concurrency control

### Type System and Safety
- Static vs dynamic type utilization
- Optional/null safety handling
- Pattern matching and branching
- Generics and type inference

### Memory Management and Performance
- Garbage collection and memory efficiency
- Stack vs heap usage patterns
- Tail recursion optimization
- Lazy loading and memoization

## Writing Style
- Clearly explain input-transformation-output flow of functions
- Focus on process-centered explanation of data transformation
- Use transformation-centered descriptions like "Takes data and transforms it to..." instead of "This function..."

### Good Sentence Examples
❌ "This function performs filtering and mapping operations on arrays"
✅ "Filters active users from the user list and extracts only names and emails to create a new list"

## Important Requirements
- **All descriptions must be written in English**
- **Return pure AsciiDoc content without code blocks (\`\`\`)**
- Keep function and variable names as-is, but explain in English
- Focus on explaining function "side effects" and "purity"

Use this AsciiDoc template exactly:

= {File Name Only}
:toc:
:source-highlighter: highlight.js

== Overview
The \`{File Name Only}\` is a {module/library/package/namespace} responsible for {main functionality and role}.

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|Module Type|{Function Module/Utility/Service/Library/Package}
|Language|{JavaScript/TypeScript/Python/Go/Rust/Dart}
|===

== Detailed Description
{Specific responsibilities, purpose, role in the application and data processing approach}

== Dependencies
=== External Libraries
* \`{Library Name}\` - {Purpose and main functionality}

=== Internal Modules
* \`{./relative/path}\` - {Module role and provided functionality}

== Main Exported Functions

=== {FunctionName}
[source,javascript]
----
{Function signature}
----
*Purpose*: {Problem this function solves or transformation it performs}
*Purity*: {Pure function/Has side effects} - {Types of side effects}
*Parameters*:
* \`{parameterName}\` (\`{Type}\`) - {Description and expected value range}
*Return Value*: \`{Type}\` - {Meaning and structure of returned value}
*Time Complexity*: {Big O notation} - {Performance characteristics}

*Usage Example*:
[source,javascript]
----
{Actual usage example code}
----

== Data Transformation Flow
=== Input Data Format
* {Structure and type of input data}

=== Transformation Process
1. {First transformation step}
2. {Second transformation step}
3. {Final output format}

=== Output Data Format
* {Structure and meaning of output data}

== Functional Programming Features
=== Higher-Order Function Usage
* \`{FunctionName}\` - {How it takes or returns other functions}

=== Function Composition
* {How multiple functions are combined to create complex logic}

=== Immutability Guarantee
* {How new data is created without changing existing data}

=== Side Effect Management
* {Handling side effects like file I/O, network, state changes}

== Asynchronous Processing (when applicable)
=== Async Functions
* \`{async function name}\` - {Tasks processed asynchronously}

=== Error Handling
* {Error handling approach for async operations}
* {Timeout and retry logic}

=== Concurrency Control
* {Simultaneous execution and control of multiple async operations}

== Performance Optimization
=== Memoization
* {Performance improvement through computation result caching}

=== Lazy Evaluation
* {Approach of delaying computation until needed}

=== Stream Processing
* {Stream-based processing of large datasets}

== Usage
=== Basic Usage
[source,javascript]
----
{Most basic usage example}
----

=== Function Composition Usage
[source,javascript]
----
{Complex usage example combining multiple functions}
----

=== Pipeline Processing
[source,javascript]
----
{Example of constructing data pipelines}
----

== Notes
* *Purity Maintenance*: {Avoiding side effects and writing predictable functions}
* *Memory Usage*: {Memory efficiency when processing large datasets}
* *Stack Overflow*: {Stack size limitations when using recursive functions}
* *Concurrency Safety*: {Safety in multithreaded environments}
* *Error Propagation*: {Error handling and propagation in function chains}`,

  createTemplate: `# Functional Programming Documentation Request

Please analyze the following {codeLanguage} file and generate technical documentation **in English** in AsciiDoc format.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Full Path: \${fullPath}
- Language: {codeLanguage}

## Code
\`\`\`{codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## Functional Programming Specialized Analysis Request

### Priority Analysis Items
1. **Function Structure**: Roles and responsibility division of exported functions
2. **Functional Patterns**: Usage of higher-order functions, closures, pure functions
3. **Data Transformation**: How input data is transformed to output
4. **Side Effects**: Distinction between pure functions vs functions with side effects
5. **Asynchronous Processing**: Promise, async/await, Future patterns
6. **Function Composition**: Composing small functions to create complex logic

### Documentation Focus Areas
- **Input-transformation-output flow** of functions clearly explained
- **Purity and side effects** presence and reasons
- **Data immutability** maintenance methods and advantages
- **Function composition and chaining** methods and utilization
- **Error handling** strategies and error propagation methods
- **Performance characteristics** and time/space complexity

### Language-Specific Special Considerations
- **JavaScript/TypeScript**: Prototypes, closures, event loop, type system
- **Python**: Generators, decorators, list comprehensions, GIL
- **Go**: Goroutines, channels, defer, interfaces
- **Rust**: Ownership, lifetimes, pattern matching, zero-cost abstractions
- **Dart**: Futures, streams, generators, widget trees

## Important Requirements
1. **Write in clear, natural English**
2. Thoroughly analyze the above code from functional programming perspective and generate developer documentation in AsciiDoc format
3. The documentation should include all necessary information for developers to understand and correctly use this module's functions
4. Clearly explain **function purposes, transformation logic, and composition methods**
5. Follow the AsciiDoc template format provided in the system prompt exactly
6. If something is unclear in the code, don't guess - indicate this in the documentation
7. **All descriptions and comments must be written in English**
8. **Return pure AsciiDoc content without code blocks (\`\`\`)** without additional explanations`,

  updateTemplate: `# Functional Programming Documentation Update Request

The following {codeLanguage} file has been modified. Please update the existing documentation **in natural English**.

## PR Information
- PR Number: \${prNumber}
- Author: \${author}
- Created Date: \${createdDate}
- Last Modified: \${updatedDate} by \${updatedBy}

## File Information
- Filename: \${filename}
- Language: {codeLanguage}

## Current Code
\`\`\`{codeLanguage.toLowerCase()}
\${fileContent}
\`\`\`

## Existing Documentation
\`\`\`asciidoc
\${existingDocContent}
\`\`\`

## Functional Programming Update Focus Areas
- **New function additions**: Role of added functions and composition with existing functions
- **Function signature changes**: Parameter or return value type changes
- **Purity changes**: Changes from pure functions to side-effect functions or vice versa
- **Asynchronous pattern changes**: Synchronous to asynchronous, or Promise to async/await
- **Data transformation logic**: Changes in input-processing-output flow
- **Performance optimizations**: Addition of memoization, lazy evaluation, etc.

## Important Requirements
1. **Update documentation in English**
2. Update the existing documentation to reflect the code changes
3. Add new functions to the documentation and remove deleted functions
4. Maintain the existing document's format and style
5. Update the PR information section with the latest details
6. **All descriptions and comments must be written in English**
7. Return the complete updated AsciiDoc(Return pure AsciiDoc content without code blocks (\`\`\`)) document`,

  focusAreas: [
    "Function design and responsibility division",
    "Data transformation and flow",
    "Functional patterns and composition",
    "Purity and side effects",
    "Asynchronous processing methods",
    "Performance and memory efficiency",
    "Error handling and propagation"
  ]
};
