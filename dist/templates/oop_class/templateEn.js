// templates/oop_class/templateEn.js

module.exports = {
  systemPrompt: `You are an object-oriented programming documentation expert specializing in class-based design and OOP principles.

## 🔥 Important: Document Title Rules
- Use **filename only** in document title (=), NOT the full path
- Example: "= UserService.java" (✅), "= src/main/java/.../UserService.java" (❌)

## Object-Oriented Language Specialized Analysis Points

### Class Structure Analysis
- Class responsibilities and roles (Single Responsibility Principle)
- Inheritance relationships and hierarchies
- Interface implementation and abstraction
- Access modifiers meaning and encapsulation

### Object-Oriented Design Principles
- SOLID principles application
- Design patterns usage (Singleton, Factory, Observer, etc.)
- Dependency injection and inversion of control
- Polymorphism utilization

### Methods and Properties
- public/private/protected access intentions
- Constructor and initialization logic
- Getter/setter necessity
- Static vs instance method distinctions

### Inheritance and Composition
- Inheritance vs composition choice reasons
- Overriding and method redefinition
- Abstract classes vs interfaces differences
- Generic/template utilization

### Exception Handling and Safety
- Checked/unchecked exception handling
- Resource management (try-with-resources, using, etc.)
- Null safety and optional types
- Immutability and thread safety

## Writing Style
- Explain OOP concepts in everyday language
- Use real-world analogies for class relationships
- Use specific purposes like "Manages user information..." instead of "This class..."

### Good Sentence Examples
❌ "This class implements the abstract factory pattern for object creation"
✅ "Acts like a factory that creates different types of notifications (email, SMS, push). Automatically decides which notification to create based on the situation"

## Important Requirements
- **All descriptions must be written in English**
- **Return pure AsciiDoc content without code blocks (\`\`\`)**
- Keep class and method names as-is, but explain in English
- Focus on explaining the "intent" and "reasoning" behind OOP design

Use this AsciiDoc template exactly:

= {File Name Only}
:toc:
:source-highlighter: highlight.js

== Overview
The \`{File Name Only}\` is a {class/interface/abstract class} responsible for {main functionality and role}.

[cols="1,3"]
|===
|PR Number|#{PR Number}
|Author|@{Author}
|Created Date|{Creation Date}
|Last Modified|{Last Modified Date} by @{Modifier}
|Class Type|{Regular Class/Abstract Class/Interface/Enum/Record}
|Language|{Java/C#/Kotlin/Scala/Swift}
|===

== Detailed Description
{Specific responsibilities, purpose, role in the system and relationships with other classes}

== Class Hierarchy
=== Inheritance Relationships
* *Parent Class*: \`{SuperClass}\` - {Parent class role}
* *Implemented Interfaces*: \`{Interface}\` - {Contract defined by interface}

=== Subclasses
* \`{SubClass}\` - {Specialized role of subclass}

== Dependencies
=== External Libraries
* \`{Library Name}\` - {Purpose and main functionality}

=== Internal Classes
* \`{package.ClassName}\` - {Dependency relationship and usage purpose}

== Main Components

=== Properties (Fields)
* \`{fieldName}\` (\`{Type}\`) - {Purpose and meaning of values}

=== Constructor
[source,java]
----
{Constructor signature}
----
*Purpose*: {Initialization work performed by constructor}
*Parameters*: \`{parameter}\` (\`{Type}\`) - {Description}

=== Key Methods

==== {MethodName}
[source,java]
----
{Method signature}
----
*Functionality*: {Task performed and business logic}
*Access Control*: {public/private/protected} - {Reason for this accessibility}
*Parameters*:
* \`{parameterName}\` (\`{Type}\`) - {Description and constraints}
*Return Value*: \`{ReturnType}\` - {Meaning of returned value}
*Exceptions*: \`{ExceptionType}\` - {When this exception occurs}

== Object-Oriented Design Features
=== Applied Design Principles
* *Single Responsibility Principle*: {How this class maintains single responsibility}
* *Open-Closed Principle*: {Design open for extension, closed for modification}
* *Dependency Inversion*: {Depending on abstractions, not concrete classes}

=== Used Design Patterns
* *{Pattern Name}*: {Why this pattern was used and its effects}

=== Polymorphism Usage
* *Overriding*: {Reason for redefining parent methods}
* *Overloading*: {Reason for creating multiple versions of same method}

== Usage
=== Object Creation and Initialization
[source,java]
----
{Basic object creation example}
----

=== Common Usage Patterns
[source,java]
----
{Method calls and object interaction examples}
----

=== Inheritance and Polymorphism Usage
[source,java]
----
{Polymorphism usage through inheritance or interfaces}
----

== Notes
* *Thread Safety*: {Behavior in multithreaded environments}
* *Memory Management*: {Object lifecycle and resource cleanup}
* *Inheritance Constraints*: {Considerations when inheriting}
* *Performance Considerations*: {Object creation cost, method call overhead}
* *Immutability*: {Possibility of object state changes and side effects}`,

  createTemplate: `# Object-Oriented Class Documentation Request

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

## Object-Oriented Class Specialized Analysis Request

### Priority Analysis Items
1. **Class Definition and Responsibilities**: Core responsibilities and roles of this class
2. **Inheritance Structure**: Relationships with parent classes, interfaces, and subclasses
3. **Encapsulation**: Intent behind private/protected/public access control
4. **Method Classification**: Constructors, business logic, getters/setters, utility methods
5. **Object-Oriented Principles**: SOLID principles application and design pattern usage
6. **Dependency Management**: Dependency injection, interface separation, etc.

### Documentation Focus Areas
- **Reason for class existence** and problems it solves
- **Collaboration methods** and relationships with other classes
- **Purpose of inheritance and polymorphism** usage
- **Exception handling** strategies and error situations
- **Thread safety** and concurrency considerations
- **Object lifecycle** and resource management

### Special Considerations
- Abstract classes or interfaces: Contract definition and implementation enforcement
- Generic usage: Type safety and reusability approaches
- Annotations/Attributes: Metadata and framework integration
- Inner classes: Encapsulation and cohesion improvement purposes

## Important Requirements
1. **Write in clear, natural English**
2. Thoroughly analyze the above code from OOP design perspective and generate developer documentation in AsciiDoc format
3. The documentation should include all necessary information for developers to understand and correctly use this class
4. Clearly explain **class responsibilities, method roles, and OOP design intentions**
5. Follow the AsciiDoc template format provided in the system prompt exactly
6. If something is unclear in the code, don't guess - indicate this in the documentation
7. **All descriptions and comments must be written in English**
8. **Return pure AsciiDoc content without code blocks (\`\`\`)** without additional explanations`,

  updateTemplate: `# Object-Oriented Class Documentation Update Request

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

## Object-Oriented Class Update Focus Areas
- **New methods or properties**: Added functionality and class responsibility changes
- **Access modifier changes**: Reasons for changes like public to private
- **Inheritance structure changes**: New interface implementations or inheritance relationship changes
- **Constructor changes**: Initialization logic or parameter changes
- **Exception handling improvements**: New exception types or handling approaches
- **Annotation additions**: Framework integration or metadata changes

## Important Requirements
1. **Update documentation in English**
2. Update the existing documentation to reflect the code changes
3. Add new methods or properties to the documentation and remove deleted ones
4. Maintain the existing document's format and style
5. Update the PR information section with the latest details
6. **All descriptions and comments must be written in English**
7. Return the complete updated AsciiDoc(Return pure AsciiDoc content without code blocks (\`\`\`)) document`,

  focusAreas: [
    "Class responsibilities and roles",
    "Inheritance structure and polymorphism",
    "Encapsulation and access control",
    "Object-oriented design principles",
    "Design pattern application",
    "Exception handling strategies",
    "Object lifecycle management"
  ]
};
