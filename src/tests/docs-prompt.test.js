// Mock @actions/core before importing anything
jest.mock('@actions/core', () => ({
  getInput: jest.fn(() => 'mock-value'),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock config to avoid dependency issues
jest.mock('../../src/config', () => ({
  githubToken: 'mock-token',
  aiProvider: 'google',
  aiModel: 'gemini-1.5-flash',
  aiApiKey: 'mock-api-key',
  language: 'en'
}));

// Mock template files to avoid file system dependencies
jest.mock('../../templates/oop_class/oop-class-ko.js', () => ({
  systemPrompt: 'Mock Korean OOP system prompt',
  createTemplate: 'Mock Korean OOP create template for {codeLanguage}',
  updateTemplate: 'Mock Korean OOP update template',
  focusAreas: ['클래스 구조', '상속']
}), { virtual: true });

jest.mock('../../templates/oop_class/oop-class-en.js', () => ({
  systemPrompt: 'Mock English OOP system prompt',
  createTemplate: 'Mock English OOP create template for {codeLanguage}',
  updateTemplate: 'Mock English OOP update template',
  focusAreas: ['Class structure', 'Inheritance']
}), { virtual: true });

jest.mock('../../templates/functional/oop-class-ko.js', () => ({
  systemPrompt: 'Mock Korean functional system prompt',
  createTemplate: 'Mock Korean functional create template for {codeLanguage}',
  updateTemplate: 'Mock Korean functional update template',
  focusAreas: ['함수 조합', '비동기 처리']
}), { virtual: true });

jest.mock('../../templates/functional/oop-class-en.js', () => ({
  systemPrompt: 'Mock English functional system prompt',
  createTemplate: 'Mock English functional create template for {codeLanguage}',
  updateTemplate: 'Mock English functional update template',
  focusAreas: ['Function composition', 'Async processing']
}), { virtual: true });

jest.mock('../../templates/web_frontend/oop-class-ko.js', () => ({
  systemPrompt: 'Mock Korean web frontend system prompt',
  createTemplate: 'Mock Korean web frontend create template for {codeLanguage}',
  updateTemplate: 'Mock Korean web frontend update template',
  focusAreas: ['UI 구조', '반응형']
}), { virtual: true });

jest.mock('../../templates/web_frontend/oop-class-en.js', () => ({
  systemPrompt: 'Mock English web frontend system prompt',
  createTemplate: 'Mock English web frontend create template for {codeLanguage}',
  updateTemplate: 'Mock English web frontend update template',
  focusAreas: ['UI structure', 'Responsive design']
}), { virtual: true });

jest.mock('../../templates/data/oop-class-ko.js', () => ({
  systemPrompt: 'Mock Korean data system prompt',
  createTemplate: 'Mock Korean data create template for {codeLanguage}',
  updateTemplate: 'Mock Korean data update template',
  focusAreas: ['데이터 구조', '쿼리 성능']
}), { virtual: true });

jest.mock('../../templates/data/oop-class-en.js', () => ({
  systemPrompt: 'Mock English data system prompt',
  createTemplate: 'Mock English data create template for {codeLanguage}',
  updateTemplate: 'Mock English data update template',
  focusAreas: ['Data structure', 'Query performance']
}), { virtual: true });

jest.mock('../../templates/native/oop-class-ko.js', () => ({
  systemPrompt: 'Mock Korean native system prompt',
  createTemplate: 'Mock Korean native create template for {codeLanguage}',
  updateTemplate: 'Mock Korean native update template',
  focusAreas: ['메모리 관리', '성능']
}), { virtual: true });

jest.mock('../../templates/native/oop-class-en.js', () => ({
  systemPrompt: 'Mock English native system prompt',
  createTemplate: 'Mock English native create template for {codeLanguage}',
  updateTemplate: 'Mock English native update template',
  focusAreas: ['Memory management', 'Performance']
}), { virtual: true });

const {
  DocsPromptGenerator,
  createDocsPrompt,
  createUpdateDocsPrompt,
  getSystemPrompt,
  getLanguageGroup,
  docsPromptTemplates
} = require('../../src/docs-prompt');

describe('DocsPromptGenerator', () => {
  let generator;
  let mockPrDetails;

  beforeEach(() => {
    generator = new DocsPromptGenerator();
    mockPrDetails = {
      number: 123,
      author: 'test-user',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-02T15:30:00Z',
      mergedBy: 'merger-user'
    };
  });

  describe('getLanguageGroup', () => {
    it('should identify OOP class languages correctly', () => {
      expect(generator.getLanguageGroup('App.java')).toBe('oop_class');
      expect(generator.getLanguageGroup('Service.cs')).toBe('oop_class');
      expect(generator.getLanguageGroup('Model.kt')).toBe('oop_class');
      expect(generator.getLanguageGroup('Controller.scala')).toBe('oop_class');
      expect(generator.getLanguageGroup('ViewController.swift')).toBe('oop_class');
    });

    it('should identify functional languages correctly', () => {
      expect(generator.getLanguageGroup('utils.js')).toBe('functional');
      expect(generator.getLanguageGroup('component.ts')).toBe('functional');
      expect(generator.getLanguageGroup('script.py')).toBe('functional');
      expect(generator.getLanguageGroup('server.go')).toBe('functional');
      expect(generator.getLanguageGroup('lib.rs')).toBe('functional');
      expect(generator.getLanguageGroup('app.dart')).toBe('functional');
    });

    it('should identify web frontend languages correctly', () => {
      expect(generator.getLanguageGroup('index.html')).toBe('web_frontend');
      expect(generator.getLanguageGroup('styles.css')).toBe('web_frontend');
      expect(generator.getLanguageGroup('main.scss')).toBe('web_frontend');
      expect(generator.getLanguageGroup('Component.vue')).toBe('web_frontend');
      expect(generator.getLanguageGroup('App.svelte')).toBe('web_frontend');
    });

    it('should identify data languages correctly', () => {
      expect(generator.getLanguageGroup('query.sql')).toBe('data');
      expect(generator.getLanguageGroup('data.csv')).toBe('data');
    });

    it('should identify native languages correctly', () => {
      expect(generator.getLanguageGroup('main.c')).toBe('native');
      expect(generator.getLanguageGroup('app.cpp')).toBe('native');
      expect(generator.getLanguageGroup('header.h')).toBe('native');
      expect(generator.getLanguageGroup('class.hpp')).toBe('native');
    });

    it('should default to functional for unknown extensions', () => {
      expect(generator.getLanguageGroup('unknown.xyz')).toBe('functional');
    });
  });

  describe('getLanguageFromFilename', () => {
    it('should recognize common programming languages', () => {
      expect(generator.getLanguageFromFilename('app.js')).toBe('JavaScript');
      expect(generator.getLanguageFromFilename('utils.py')).toBe('Python');
      expect(generator.getLanguageFromFilename('Main.java')).toBe('Java');
      expect(generator.getLanguageFromFilename('component.ts')).toBe('TypeScript');
      expect(generator.getLanguageFromFilename('service.go')).toBe('Go');
      expect(generator.getLanguageFromFilename('script.sh')).toBe('Shell');
    });

    it('should handle web development files', () => {
      expect(generator.getLanguageFromFilename('index.html')).toBe('HTML');
      expect(generator.getLanguageFromFilename('styles.css')).toBe('CSS');
      expect(generator.getLanguageFromFilename('config.json')).toBe('JSON');
      expect(generator.getLanguageFromFilename('data.yaml')).toBe('YAML');
    });

    it('should handle unknown extensions', () => {
      expect(generator.getLanguageFromFilename('unknown.xyz')).toBe('XYZ');
      expect(generator.getLanguageFromFilename('noextension')).toBe('NOEXTENSION');
    });
  });

  describe('getCleanFilename', () => {
    it('should extract filename from path', () => {
      expect(generator.getCleanFilename('src/utils/helper.js')).toBe('helper.js');
      expect(generator.getCleanFilename('components/Button.vue')).toBe('Button.vue');
      expect(generator.getCleanFilename('simple.py')).toBe('simple.py');
    });
  });

  describe('formatDate', () => {
    it('should format ISO dates correctly', () => {
      expect(generator.formatDate('2023-01-01T10:00:00Z')).toBe('2023-01-01');
      expect(generator.formatDate('2023-12-31T23:59:59Z')).toBe('2023-12-31');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return language-group specific system prompts', () => {
      // OOP class languages
      expect(generator.getSystemPrompt('UserService.java', 'en')).toBe('Mock English OOP system prompt');
      expect(generator.getSystemPrompt('UserService.java', 'ko')).toBe('Mock Korean OOP system prompt');

      // Functional languages
      expect(generator.getSystemPrompt('utils.js', 'en')).toBe('Mock English functional system prompt');
      expect(generator.getSystemPrompt('utils.js', 'ko')).toBe('Mock Korean functional system prompt');

      // Web frontend
      expect(generator.getSystemPrompt('App.vue', 'en')).toBe('Mock English web frontend system prompt');
      expect(generator.getSystemPrompt('App.vue', 'ko')).toBe('Mock Korean web frontend system prompt');
    });

    it('should fallback to default for missing templates', () => {
      // Mock a scenario where template loading fails
      const originalTemplates = generator.templates;
      generator.templates = {};

      const prompt = generator.getSystemPrompt('test.js', 'en');
      expect(prompt).toContain('code documentation expert');

      // Restore original templates
      generator.templates = originalTemplates;
    });
  });

  describe('createDocsPrompt', () => {
    it('should create prompt with correct language group template', () => {
      const prompt = generator.createDocsPrompt(
          'UserService.java',
          'public class UserService {}',
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('Mock English OOP create template for Java');
    });

    it('should replace all template variables correctly', () => {
      const prompt = generator.createDocsPrompt(
          'src/utils.js',
          'const helper = () => {}',
          mockPrDetails,
          'en'
      );

      // Check that variables are replaced (template should have been processed)
      expect(prompt).not.toContain('${prNumber}');
      expect(prompt).not.toContain('${author}');
      expect(prompt).not.toContain('${filename}');
    });

    it('should use author as fallback for mergedBy', () => {
      const prDetailsNoMerger = { ...mockPrDetails, mergedBy: null };
      const prompt = generator.createDocsPrompt(
          'app.py',
          'print("hello")',
          prDetailsNoMerger,
          'en'
      );

      // Should still work without errors
      expect(prompt).toBeDefined();
    });

    it('should work with different language groups', () => {
      // Functional
      const jsPrompt = generator.createDocsPrompt('utils.js', 'code', mockPrDetails, 'ko');
      expect(jsPrompt).toContain('Mock Korean functional create template for JavaScript');

      // Web frontend
      const vuePrompt = generator.createDocsPrompt('App.vue', 'code', mockPrDetails, 'en');
      expect(vuePrompt).toContain('Mock English web frontend create template for VUE');

      // Data
      const sqlPrompt = generator.createDocsPrompt('query.sql', 'SELECT * FROM users', mockPrDetails, 'en');
      expect(sqlPrompt).toContain('Mock English data create template for SQL');

      // Native
      const cPrompt = generator.createDocsPrompt('main.c', '#include <stdio.h>', mockPrDetails, 'ko');
      expect(cPrompt).toContain('Mock Korean native create template for C');
    });
  });

  describe('createUpdateDocsPrompt', () => {
    const existingDoc = `= Utils
== Description
Old documentation content`;

    it('should create update prompt with correct language group template', () => {
      const prompt = generator.createUpdateDocsPrompt(
          'UserService.java',
          'public class UserService {}',
          existingDoc,
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('Mock English OOP update template');
    });

    it('should work with different language groups', () => {
      // Functional
      const jsPrompt = generator.createUpdateDocsPrompt('utils.js', 'code', existingDoc, mockPrDetails, 'ko');
      expect(jsPrompt).toContain('Mock Korean functional update template');

      // Web frontend
      const cssPrompt = generator.createUpdateDocsPrompt('styles.css', 'body {}', existingDoc, mockPrDetails, 'en');
      expect(cssPrompt).toContain('Mock English web frontend update template');
    });
  });
});

describe('Exported functions', () => {
  const mockPrDetails = {
    number: 456,
    author: 'dev-user',
    createdAt: '2023-06-01T09:00:00Z',
    updatedAt: '2023-06-01T17:00:00Z',
    mergedBy: 'reviewer'
  };

  describe('getLanguageGroup', () => {
    it('should work as standalone function', () => {
      expect(getLanguageGroup('Test.java')).toBe('oop_class');
      expect(getLanguageGroup('script.js')).toBe('functional');
      expect(getLanguageGroup('style.css')).toBe('web_frontend');
    });
  });

  describe('getSystemPrompt', () => {
    it('should work as standalone function', () => {
      const javaPrompt = getSystemPrompt('UserService.java', 'en');
      expect(javaPrompt).toBe('Mock English OOP system prompt');

      const jsPrompt = getSystemPrompt('utils.js', 'ko');
      expect(jsPrompt).toBe('Mock Korean functional system prompt');
    });
  });

  describe('createDocsPrompt', () => {
    it('should work as standalone function', () => {
      const prompt = createDocsPrompt(
          'Calculator.java',
          'public class Calculator {}',
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('Mock English OOP create template for Java');
    });
  });

  describe('createUpdateDocsPrompt', () => {
    it('should work as standalone function', () => {
      const existingDoc = '= Calculator\nBasic math functions';
      const prompt = createUpdateDocsPrompt(
          'calculator.js',
          'function multiply(a, b) { return a * b; }',
          existingDoc,
          mockPrDetails,
          'ko'
      );

      expect(prompt).toContain('Mock Korean functional update template');
    });
  });

  describe('docsPromptTemplates (legacy)', () => {
    it('should provide system prompts for both languages', () => {
      // Note: These use default templates since dummy.js maps to functional
      expect(docsPromptTemplates.en).toContain('Mock English functional system prompt');
      expect(docsPromptTemplates.ko).toContain('Mock Korean functional system prompt');
    });
  });
});

describe('Integration scenarios', () => {
  const generator = new DocsPromptGenerator();

  it('should handle Java OOP file correctly', () => {
    const prDetails = {
      number: 789,
      author: 'senior-dev',
      createdAt: '2023-03-15T08:30:00Z',
      updatedAt: '2023-03-16T14:45:00Z',
      mergedBy: 'tech-lead'
    };

    const fileContent = `
public class DatabaseConnection {
  private String config;
  
  public void connect() {
    // Connection logic
  }
}
`;

    const prompt = generator.createDocsPrompt(
        'src/db/DatabaseConnection.java',
        fileContent,
        prDetails,
        'en'
    );

    expect(prompt).toContain('Mock English OOP create template for Java');
  });

  it('should handle Vue frontend file with Korean language', () => {
    const prDetails = {
      number: 101,
      author: '개발자',
      createdAt: '2023-05-20T10:00:00Z',
      updatedAt: '2023-05-20T16:00:00Z',
      mergedBy: '리뷰어'
    };

    const fileContent = `
<template>
  <div class="user-profile">
    <h1>{{ user.name }}</h1>
  </div>
</template>
`;

    const prompt = generator.createDocsPrompt(
        'components/UserProfile.vue',
        fileContent,
        prDetails,
        'ko'
    );

    expect(prompt).toContain('Mock Korean web frontend create template for VUE');
  });

  it('should handle SQL data file correctly', () => {
    const prDetails = {
      number: 202,
      author: 'data-analyst',
      createdAt: '2023-07-10T12:00:00Z',
      updatedAt: '2023-07-10T18:00:00Z',
      mergedBy: 'senior-analyst'
    };

    const fileContent = `
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY order_count DESC;
`;

    const prompt = generator.createDocsPrompt(
        'queries/user_orders.sql',
        fileContent,
        prDetails,
        'en'
    );

    expect(prompt).toContain('Mock English data create template for SQL');
  });

  it('should handle C native file with update scenario', () => {
    const prDetails = {
      number: 303,
      author: 'systems-dev',
      createdAt: '2023-08-01T09:00:00Z',
      updatedAt: '2023-08-01T15:30:00Z',
      mergedBy: 'tech-lead'
    };

    const existingDoc = `
= Memory Pool
== Description
기존 메모리 풀 문서
`;

    const newCode = `
#include <stdlib.h>

typedef struct {
    void* memory;
    size_t size;
} memory_pool_t;

memory_pool_t* create_pool(size_t size) {
    // Implementation
}
`;

    const prompt = generator.createUpdateDocsPrompt(
        'src/memory_pool.c',
        newCode,
        existingDoc,
        prDetails,
        'ko'
    );

    expect(prompt).toContain('Mock Korean native update template');
  });
});
