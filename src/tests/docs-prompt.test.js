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

const {
  DocsPromptGenerator,
  createDocsPrompt,
  createUpdateDocsPrompt,
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

  describe('getLanguageFromFilename', () => {
    it('should recognize common programming languages', () => {
      expect(generator.getLanguageFromFilename('app.js')).toBe('JavaScript');
      expect(generator.getLanguageFromFilename('utils.py')).toBe('Python');
      expect(generator.getLanguageFromFilename('Main.java')).toBe('Java');
      expect(generator.getLanguageFromFilename('component.tsx')).toBe('TSX');
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

  describe('formatDate', () => {
    it('should format ISO dates correctly', () => {
      expect(generator.formatDate('2023-01-01T10:00:00Z')).toBe('2023-01-01');
      expect(generator.formatDate('2023-12-31T23:59:59Z')).toBe('2023-12-31');
    });
  });

  describe('createDocsPrompt', () => {
    it('should create prompt with all variables replaced', () => {
      const prompt = generator.createDocsPrompt(
          'src/utils.js',
          'const helper = () => {}',
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('PR Number: 123');
      expect(prompt).toContain('Author: test-user');
      expect(prompt).toContain('Created Date: 2023-01-01');
      expect(prompt).toContain('Last Modified: 2023-01-02 by merger-user');
      expect(prompt).toContain('Filename: src/utils.js');
      expect(prompt).toContain('const helper = () => {}');
      expect(prompt).toContain('```javascript');
    });

    it('should use author as fallback for mergedBy', () => {
      const prDetailsNoMerger = { ...mockPrDetails, mergedBy: null };
      const prompt = generator.createDocsPrompt(
          'app.py',
          'print("hello")',
          prDetailsNoMerger,
          'en'
      );

      expect(prompt).toContain('Last Modified: 2023-01-02 by test-user');
    });

    it('should create Korean prompt', () => {
      const prompt = generator.createDocsPrompt(
          'app.js',
          'console.log("test")',
          mockPrDetails,
          'ko'
      );

      expect(prompt).toContain('코드 문서화 요청');
      expect(prompt).toContain('PR 정보');
      expect(prompt).toContain('파일 정보');
      expect(prompt).toContain('요청사항');
    });

    it('should handle different file types correctly', () => {
      const pythonPrompt = generator.createDocsPrompt(
          'script.py',
          'def hello(): pass',
          mockPrDetails,
          'en'
      );

      expect(pythonPrompt).toContain('Python file');
      expect(pythonPrompt).toContain('```python');
    });
  });

  describe('createUpdateDocsPrompt', () => {
    const existingDoc = `= Utils
== Description
Old documentation content`;

    it('should create update prompt with existing documentation', () => {
      const prompt = generator.createUpdateDocsPrompt(
          'utils.js',
          'const newHelper = () => {}',
          existingDoc,
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('Documentation Update Request');
      expect(prompt).toContain('Current Code');
      expect(prompt).toContain('Existing Documentation');
      expect(prompt).toContain('const newHelper = () => {}');
      expect(prompt).toContain('Old documentation content');
    });

    it('should create Korean update prompt', () => {
      const prompt = generator.createUpdateDocsPrompt(
          'app.js',
          'new code',
          existingDoc,
          mockPrDetails,
          'ko'
      );

      expect(prompt).toContain('코드 문서 업데이트 요청');
      expect(prompt).toContain('현재 코드');
      expect(prompt).toContain('기존 문서');
    });
  });

  describe('getTemplate', () => {
    it('should return correct template for language and type', () => {
      const createTemplate = generator.getTemplate('en', 'create', 'JavaScript');
      const updateTemplate = generator.getTemplate('en', 'update', 'Python');

      expect(createTemplate).toContain('Documentation Request');
      expect(createTemplate).toContain('JavaScript file');
      expect(updateTemplate).toContain('Documentation Update Request');
      expect(updateTemplate).toContain('Python file');
    });

    it('should fallback to English for unknown languages', () => {
      const template = generator.getTemplate('fr', 'create', 'JavaScript');
      expect(template).toContain('Documentation Request');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return English system prompt', () => {
      const prompt = generator.getSystemPrompt('en');

      expect(prompt).toContain('code documentation expert');
      expect(prompt).toContain('Analysis Method');
      expect(prompt).toContain('Documentation Principles');
      expect(prompt).toContain('AsciiDoc format');
    });

    it('should return Korean system prompt', () => {
      const prompt = generator.getSystemPrompt('ko');

      expect(prompt).toContain('코드 문서화 전문가');
      expect(prompt).toContain('분석 방법');
      expect(prompt).toContain('문서화 원칙');
    });

    it('should fallback to English for unknown language', () => {
      const prompt = generator.getSystemPrompt('fr');
      expect(prompt).toContain('code documentation expert');
    });
  });

  describe('getAsciiDocTemplate', () => {
    it('should return AsciiDoc template structure', () => {
      const template = generator.getAsciiDocTemplate();

      expect(template).toContain('= {Class/File Name}');
      expect(template).toContain(':toc:');
      expect(template).toContain('== Overview');
      expect(template).toContain('== Dependencies');
      expect(template).toContain('== Key Methods');
      expect(template).toContain('[source,{language}]');
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

  describe('createDocsPrompt', () => {
    it('should work as standalone function', () => {
      const prompt = createDocsPrompt(
          'calculator.js',
          'function add(a, b) { return a + b; }',
          mockPrDetails,
          'en'
      );

      expect(prompt).toContain('calculator.js');
      expect(prompt).toContain('function add(a, b)');
      expect(prompt).toContain('PR Number: 456');
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

      expect(prompt).toContain('calculator.js');
      expect(prompt).toContain('multiply');
      expect(prompt).toContain('Basic math functions');
      expect(prompt).toContain('코드 문서 업데이트');
    });
  });

  describe('docsPromptTemplates', () => {
    it('should provide system prompts for both languages', () => {
      expect(docsPromptTemplates.en).toContain('code documentation expert');
      expect(docsPromptTemplates.ko).toContain('코드 문서화 전문가');
    });
  });
});

describe('Integration scenarios', () => {
  const generator = new DocsPromptGenerator();

  it('should handle complex file with all features', () => {
    const prDetails = {
      number: 789,
      author: 'senior-dev',
      createdAt: '2023-03-15T08:30:00Z',
      updatedAt: '2023-03-16T14:45:00Z',
      mergedBy: 'tech-lead'
    };

    const fileContent = `
class DatabaseConnection {
  constructor(config) {
    this.config = config;
  }
  
  async connect() {
    // Connection logic
  }
}
`;

    const prompt = generator.createDocsPrompt(
        'src/db/connection.js',
        fileContent,
        prDetails,
        'en'
    );

    expect(prompt).toContain('DatabaseConnection');
    expect(prompt).toContain('PR Number: 789');
    expect(prompt).toContain('Author: senior-dev');
    expect(prompt).toContain('tech-lead');
    expect(prompt).toContain('src/db/connection.js');
    expect(prompt).toContain('```javascript');
  });

  it('should handle update scenario with Korean language', () => {
    const prDetails = {
      number: 101,
      author: '개발자',
      createdAt: '2023-05-20T10:00:00Z',
      updatedAt: '2023-05-20T16:00:00Z',
      mergedBy: '리뷰어'
    };

    const existingDoc = `
= 데이터베이스 연결
== 설명
기존 문서 내용
`;

    const newCode = `
class DatabaseConnection {
  async reconnect() {
    // 재연결 로직
  }
}
`;

    const prompt = generator.createUpdateDocsPrompt(
        'db.js',
        newCode,
        existingDoc,
        prDetails,
        'ko'
    );

    expect(prompt).toContain('코드 문서 업데이트');
    expect(prompt).toContain('PR 번호: 101');
    expect(prompt).toContain('작성자: 개발자');
    expect(prompt).toContain('리뷰어');
    expect(prompt).toContain('reconnect');
    expect(prompt).toContain('기존 문서 내용');
  });
});
