const AIClient = require('../../src/ai-client');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock config
jest.mock('../../src/config', () => ({
  aiEndpoints: {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    azure: 'https://azure-endpoint.com'
  }
}));

describe('AIClient - Updated Implementation Tests', () => {
  let aiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize AIClient with Gemini model
    aiClient = new AIClient('google', 'gemini-1.5-flash', 'test-api-key');
  });

  describe('Constructor initialization', () => {
    it('should initialize with Google Gemini model correctly', () => {
      expect(aiClient.provider).toBe('google');
      expect(aiClient.model).toBe('gemini-1.5-flash');
      expect(aiClient.apiKey).toBe('test-api-key');
      expect(aiClient.endpoint).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => new AIClient('unsupported-provider', 'model', 'key'))
      .toThrow('Unsupported AI provider: unsupported-provider');
    });
  });

  describe('createRequestData for Google (Fixed Implementation)', () => {
    it('should combine system and user prompts for Google API', () => {
      const systemPrompt = 'You are a helpful assistant';
      const userPrompt = 'Tell me about JavaScript';

      const result = aiClient.createRequestData(systemPrompt, userPrompt);

      // Updated implementation combines prompts for Google
      expect(result).toEqual({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        }
      });
    });

    it('should handle empty system prompt', () => {
      const systemPrompt = '';
      const userPrompt = 'Tell me about JavaScript';

      const result = aiClient.createRequestData(systemPrompt, userPrompt);

      expect(result.contents[0].parts[0].text).toBe(`\n\n${userPrompt}`);
    });

    it('should handle long prompts correctly', () => {
      const systemPrompt = 'You are a code documentation expert.';
      const userPrompt = 'A'.repeat(1000);

      const result = aiClient.createRequestData(systemPrompt, userPrompt);

      expect(result.contents[0].parts[0].text.length).toBe(systemPrompt.length + 2 + userPrompt.length);
    });
  });

  describe('createRequestData for other providers', () => {
    it('should create correct format for OpenAI', () => {
      const openaiClient = new AIClient('openai', 'gpt-4', 'test-key');
      const systemPrompt = 'You are helpful';
      const userPrompt = 'Help me';

      const result = openaiClient.createRequestData(systemPrompt, userPrompt);

      expect(result).toEqual({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      });
    });

    it('should create correct format for Anthropic', () => {
      const anthropicClient = new AIClient('anthropic', 'claude-3-opus', 'test-key');
      const systemPrompt = 'You are helpful';
      const userPrompt = 'Help me';

      const result = anthropicClient.createRequestData(systemPrompt, userPrompt);

      expect(result).toEqual({
        model: 'claude-3-opus',
        messages: [
          { role: 'user', content: userPrompt }
        ],
        system: systemPrompt,
        temperature: 0.3
      });
    });
  });

  describe('createRequestHeaders', () => {
    it('should create correct headers for Google API', () => {
      const result = aiClient.createRequestHeaders();

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'x-goog-api-key': 'test-api-key'
      });
    });

    it('should create correct headers for other providers', () => {
      const openaiClient = new AIClient('openai', 'gpt-4', 'test-key');
      const headers = openaiClient.createRequestHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      });
    });
  });

  describe('extractResponseText', () => {
    it('should extract text correctly from Google response', () => {
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

  describe('sendPrompt', () => {
    it('should send request to correct Google endpoint with combined prompt', async () => {
      const systemPrompt = 'You are a helpful assistant';
      const userPrompt = 'Hello, how are you?';
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

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
              { role: 'user', parts: [{ text: combinedPrompt }] }
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

    it('should handle various endpoint configurations', async () => {
      // Test different providers have different endpoint handling
      const openaiClient = new AIClient('openai', 'gpt-4', 'test-key');

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'OpenAI response' } }]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      await openaiClient.sendPrompt('system', 'user');

      // OpenAI should use the endpoint directly without modification
      expect(axios.post).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.any(Object),
          expect.any(Object)
      );
    });
  });

  describe('Integration with different AI providers', () => {
    it('should work end-to-end with OpenAI', async () => {
      const openaiClient = new AIClient('openai', 'gpt-4', 'openai-key');

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'OpenAI generated documentation' } }]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await openaiClient.sendPrompt('You are a docs generator', 'Document this code');

      expect(result).toBe('OpenAI generated documentation');
    });

    it('should work end-to-end with Anthropic', async () => {
      const anthropicClient = new AIClient('anthropic', 'claude-3-opus', 'anthropic-key');

      const mockResponse = {
        data: {
          content: [{ text: 'Claude generated documentation' }]
        }
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await anthropicClient.sendPrompt('You are a docs generator', 'Document this code');

      expect(result).toBe('Claude generated documentation');
    });
  });
});
