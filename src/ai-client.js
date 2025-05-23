const axios = require('axios');
const config = require('./config');
const Logger = require('./logger');

/**
 * AI Client for handling requests to various AI providers
 */
class AIClient {
  constructor(provider = config.aiProvider, model = config.aiModel, apiKey = config.aiApiKey) {
    this.logger = new Logger('AIClient');
    this.provider = provider;
    this.model = model;
    this.apiKey = apiKey;

    // Validate provider and model
    if (!config.aiProviderConfig[provider]) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Log warning if model is not in the validated list
    if (!config.isValidModel(model)) {
      this.logger.warn(`Model '${model}' may not be supported by provider '${provider}'`);
    }

    // Configure axios with retry logic
    this.axiosInstance = axios.create({
      timeout: 60000, // 60 seconds
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    // Add retry interceptor
    this.setupRetryInterceptor();
  }

  /**
   * Setup axios retry interceptor
   */
  setupRetryInterceptor() {
    this.axiosInstance.interceptors.response.use(
        response => response,
        async error => {
          const config = error.config;

          // Check if we should retry
          if (!config || !config.retry) {
            config.retry = 0;
          }

          if (config.retry >= 3) {
            return Promise.reject(error);
          }

          // Only retry on network errors or 5xx errors
          if (!error.response || error.response.status >= 500) {
            config.retry += 1;
            this.logger.warn(`Retrying request (attempt ${config.retry}/3)...`);

            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, config.retry) * 1000));

            return this.axiosInstance(config);
          }

          return Promise.reject(error);
        }
    );
  }

  /**
   * Create AI request data based on provider
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {object} - Request data
   */
  createRequestData(systemPrompt, userPrompt) {
    const temperature = 0.3;

    switch(this.provider) {
      case 'openai':
        return {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 8192
        };

      case 'anthropic':
        return {
          model: this.model,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
          temperature,
          max_tokens: 8192
        };

      case 'google':
        return {
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192
          }
        };

      case 'azure':
        return {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 8192
        };

      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Extract text from AI response
   * @param {object} response - API response
   * @returns {string} - Extracted text
   */
  extractResponseText(response) {
    try {
      switch(this.provider) {
        case 'openai':
        case 'azure':
          if (!response.data?.choices?.[0]?.message?.content) {
            throw new Error('Invalid response structure from OpenAI/Azure');
          }
          return response.data.choices[0].message.content;

        case 'anthropic':
          if (!response.data?.content?.[0]?.text) {
            throw new Error('Invalid response structure from Anthropic');
          }
          return response.data.content[0].text;

        case 'google':
          // Handle Google-specific errors
          if (response.data.promptFeedback?.blockReason) {
            throw new Error(`Content blocked by Google AI: ${response.data.promptFeedback.blockReason}`);
          }

          if (!response.data.candidates?.length) {
            throw new Error('No response candidates from Google AI');
          }

          const candidate = response.data.candidates[0];
          if (candidate.finishReason === 'SAFETY') {
            throw new Error('Response blocked by Google AI safety filters');
          }

          if (!candidate.content?.parts?.[0]?.text) {
            throw new Error('Invalid response structure from Google AI');
          }

          return candidate.content.parts[0].text;

        default:
          throw new Error(`Unsupported AI provider: ${this.provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to extract response text', error);
      throw error;
    }
  }

  /**
   * Build the full endpoint URL based on provider
   * @returns {string} - Full endpoint URL
   */
  buildEndpointUrl() {
    const baseEndpoint = config.getAIEndpoint();

    if (this.provider === 'google') {
      return `${baseEndpoint}/${this.model}:generateContent`;
    }

    return baseEndpoint;
  }

  /**
   * Send prompt to AI and process response
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {Promise<string>} - AI response text
   */
  async sendPrompt(systemPrompt, userPrompt) {
    const startTime = Date.now();

    try {
      this.logger.info(`Sending request to ${this.provider} (${this.model})`);

      const requestData = this.createRequestData(systemPrompt, userPrompt);
      const headers = config.getAIHeaders();
      const endpoint = this.buildEndpointUrl();

      this.logger.debug('Request details', {
        endpoint,
        provider: this.provider,
        model: this.model,
        promptLength: systemPrompt.length + userPrompt.length
      });

      const response = await this.axiosInstance.post(endpoint, requestData, { headers });

      // Check for non-success status codes
      if (response.status >= 400) {
        const errorMessage = this.extractErrorMessage(response);
        throw new Error(`AI API returned error status ${response.status}: ${errorMessage}`);
      }

      const resultText = this.extractResponseText(response);
      const duration = Date.now() - startTime;

      this.logger.info(`Response received from ${this.provider} (${this.model}) in ${duration}ms`);
      this.logger.debug('Response stats', {
        responseLength: resultText.length,
        duration: `${duration}ms`
      });

      return resultText;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`AI API request failed after ${duration}ms`, error);

      // Enhance error message
      if (error.response) {
        const errorDetails = this.extractErrorMessage(error.response);
        throw new Error(`${this.provider} API error (${error.response.status}): ${errorDetails}`);
      } else if (error.request) {
        throw new Error(`Network error connecting to ${this.provider}: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Extract error message from response
   * @param {object} response - Axios response object
   * @returns {string} - Error message
   */
  extractErrorMessage(response) {
    const data = response.data;

    // Common error message locations
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (typeof data === 'string') return data;

    // Provider-specific error handling
    switch(this.provider) {
      case 'openai':
      case 'azure':
        return data?.error?.message || JSON.stringify(data);

      case 'anthropic':
        return data?.error?.message || data?.message || JSON.stringify(data);

      case 'google':
        return data?.error?.message || data?.[0]?.error?.message || JSON.stringify(data);

      default:
        return JSON.stringify(data);
    }
  }
}

module.exports = AIClient;
