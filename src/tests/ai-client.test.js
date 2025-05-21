const AiClient = require('../../src/ai-client');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock config
jest.mock('../config', () => ({
  aiEndpoints: {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    azure: 'https://azure-endpoint.com'
  }
}));

describe('AiClient - Google Gemini Model Tests', () => {
  let aiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize AiClient with Gemini model
    aiClient = new AiClient('google', 'gemini-1.5-flash', 'test-api-key');
  });

  describe('Constructor initialization', () => {
    it('should initialize with Google Gemini model correctly', () => {
      expect(aiClient.provider).toBe('google');
      expect(aiClient.model).toBe('gemini-1.5-flash');
      expect(aiClient.apiKey).toBe('test-api-key');
      expect(aiClient.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => new AiClient('unsupported-provider', 'model', 'key'))
      .toThrow('Unsupported AI provider: unsupported-provider');
    });
  });

  describe('createRequestData for Gemini model', () => {
    it('should create correct request data format for Gemini', () => {
      const systemPrompt = 'You are a helpful assistant';
      const userPrompt = 'Tell me about JavaScript';

      const result = aiClient.createRequestData(systemPrompt, userPrompt);

      expect(result).toEqual({
        contents: [
          { role: 'system', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      });
    });

    it('should accept complex prompts', () => {
      const systemPrompt = 'You are a code documentation expert';
      const userPrompt = 'Document this class:\n\nclass Example { constructor() {} }';

      const result = aiClient.createRequestData(systemPrompt, userPrompt);

      expect(result.contents[0].parts[0].text).toBe(systemPrompt);
      expect(result.contents[1].parts[0].text).toBe(userPrompt);
    });
  });

  describe('createRequestHeaders for Gemini model', () => {
    it('should create correct headers for Google API', () => {
      const result = aiClient.createRequestHeaders();

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'x-goog-api-key': 'test-api-key'
      });
    });
  });

  describe('extractResponseText for Gemini model', () => {
    it('should extract text correctly from Gemini response', () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'This is a response from Gemini model' }
                ]
              },
              finishReason: 'STOP'
            }
          ]
        }
      };

      const result = aiClient.extractResponseText(mockResponse);

      expect(result).toBe('This is a response from Gemini model');
    });

    it('should handle empty candidates array', () => {
      const mockResponse = {
        data: {
          candidates: []
        }
      };

      expect(() => aiClient.extractResponseText(mockResponse))
      .toThrow('Google AI could not generate a response.');
    });

    it('should handle safety filtered responses', () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              finishReason: 'SAFETY',
              content: {
                parts: [{ text: '' }]
              }
            }
          ]
        }
      };

      expect(() => aiClient.extractResponseText(mockResponse))
      .toThrow('Google AI response was blocked by safety filters.');
    });

    it('should handle promptFeedback block reasons', () => {
      const mockResponse = {
        data: {
          promptFeedback: {
            blockReason: 'SAFETY'
          },
          candidates: []
        }
      };

      expect(() => aiClient.extractResponseText(mockResponse))
      .toThrow('Google AI response was blocked: SAFETY');
    });
  });

  describe('sendPrompt with Gemini model', () => {
    it('should send request to correct Gemini endpoint', async () => {
      const systemPrompt = 'You are a helpful assistant';
      const userPrompt = 'Hello, how are you?';

      // Mock successful response
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'I\'m doing well, thank you for asking!' }
                ]
              },
              finishReason: 'STOP'
            }
          ]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await aiClient.sendPrompt(systemPrompt, userPrompt);

      // Verify correct endpoint construction
      expect(axios.post).toHaveBeenCalledWith(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
          {
            contents: [
              { role: 'system', parts: [{ text: systemPrompt }] },
              { role: 'user', parts: [{ text: userPrompt }] }
            ],
            generationConfig: {
              temperature: 0.3,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 8192
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': 'test-api-key'
            }
          }
      );

      expect(result).toBe('I\'m doing well, thank you for asking!');
    });

    it('should handle API errors gracefully', async () => {
      // API error mock
      const errorResponse = {
        response: {
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      };

      axios.post.mockRejectedValueOnce(errorResponse);

      await expect(aiClient.sendPrompt('system prompt', 'user prompt'))
      .rejects
      .toThrow('AI API request failed: Invalid API key');
    });

    it('should handle network errors', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(aiClient.sendPrompt('system prompt', 'user prompt'))
      .rejects
      .toThrow('AI API request failed: Network error');
    });

    it('should handle unexpected response formats', async () => {
      // Malformed response without candidates
      const malformedResponse = {
        data: {
          unexpectedField: 'value'
          // Missing candidates field
        }
      };

      axios.post.mockResolvedValueOnce(malformedResponse);

      await expect(aiClient.sendPrompt('system prompt', 'user prompt'))
      .rejects
      .toThrow('Google AI could not generate a response.');
    });
  });

  describe('Edge cases for Gemini model', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Response to long prompt' }
                ]
              },
              finishReason: 'STOP'
            }
          ]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await aiClient.sendPrompt('system prompt', longPrompt);

      expect(axios.post.mock.calls[0][1].contents[1].parts[0].text.length).toBe(10000);
      expect(result).toBe('Response to long prompt');
    });

    it('should handle prompts with special characters', async () => {
      const specialCharsPrompt = 'Text with 特殊文字 and emoji 🚀';
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Response with 特殊文字 and emoji 🚀' }
                ]
              },
              finishReason: 'STOP'
            }
          ]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await aiClient.sendPrompt('system prompt', specialCharsPrompt);

      expect(result).toBe('Response with 特殊文字 and emoji 🚀');
    });
  });
});
