const axios = require('axios');
const config = require('../config');

/**
 * Class that creates request formats according to AI provider
 */
class AIClient {
  constructor(provider = config.aiProvider, model = config.aiModel, apiKey = config.aiApiKey) {
    this.provider = provider;
    this.model = model;
    this.apiKey = apiKey;
    this.endpoint = config.aiEndpoints[provider];

    if (!this.endpoint) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Create AI request data
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {object} - Request data
   */
  createRequestData(systemPrompt, userPrompt) {
    switch(this.provider) {
      case 'openai':
        return {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        };

      case 'anthropic':
        return {
          model: this.model,
          messages: [
            { role: 'user', content: userPrompt },
          ],
          system: systemPrompt,
          temperature: 0.3
        };

      case 'google':
        return {
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
        };

      case 'azure':
        return {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        };

      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Create AI request headers
   * @returns {object} - Request headers
   */
  createRequestHeaders() {
    switch(this.provider) {
      case 'openai':
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        };

      case 'anthropic':
        return {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        };

      case 'google':
        return {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        };

      case 'azure':
        return {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
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
    switch(this.provider) {
      case 'openai':
        return response.data.choices[0].message.content;

      case 'anthropic':
        return response.data.content[0].text;

      case 'google':
        // Check if there are errors or blocked content in the response
        if (response.data.promptFeedback &&
            response.data.promptFeedback.blockReason) {
          throw new Error(`Google AI response was blocked: ${response.data.promptFeedback.blockReason}`);
        }

        if (!response.data.candidates || response.data.candidates.length === 0) {
          throw new Error('Google AI could not generate a response.');
        }

        // Check if candidate response was blocked
        if (response.data.candidates[0].finishReason === 'SAFETY') {
          throw new Error('Google AI response was blocked by safety filters.');
        }

        return response.data.candidates[0].content.parts[0].text;

      case 'azure':
        return response.data.choices[0].message.content;

      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Send prompt to AI and process response
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @returns {Promise<string>} - AI response text
   */
  async sendPrompt(systemPrompt, userPrompt) {
    try {
      console.log(`Sending request to ${this.provider} ${this.model}...`);

      const requestData = this.createRequestData(systemPrompt, userPrompt);
      const headers = this.createRequestHeaders();

      // Google AI has a different endpoint URL configuration
      let endpoint = this.endpoint;
      if (this.provider === 'google') {
        // For Gemini models, add model name and generateContent to the endpoint
        endpoint = `${this.endpoint}/${this.model}:generateContent`;
      }

      const response = await axios.post(
          endpoint,
          requestData,
          { headers }
      );

      const resultText = this.extractResponseText(response);
      console.log(`Response received from ${this.provider} ${this.model}.`);
      return resultText;
    } catch (error) {
      console.error('AI API request failed:', error.response?.data || error.message);
      if (error.response?.data?.error?.message) {
        throw new Error(`AI API request failed: ${error.response.data.error.message}`);
      } else {
        throw new Error(`AI API request failed: ${error.message}`);
      }
    }
  }
}

module.exports = AIClient;
