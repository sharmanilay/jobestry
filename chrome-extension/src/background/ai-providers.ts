import { apiConfigStorage } from '@extension/storage';
import type { AIProvider } from '@extension/storage';

export interface AIResponse {
  success: boolean;
  response?: string;
  cached?: boolean;
  error?: string;
}

export interface AIProviderInterface {
  generateResponse(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<AIResponse>;
}

const createOpenAIProvider = (apiKey: string): AIProviderInterface => ({
  async generateResponse(prompt, options = {}) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response generated');
      }

      return { success: true, response: content.trim() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

const createClaudeProvider = (apiKey: string): AIProviderInterface => ({
  async generateResponse(prompt, options = {}) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: options.maxTokens || 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No response generated');
      }

      return { success: true, response: content.trim() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

const createGeminiProvider = (apiKey: string): AIProviderInterface => ({
  async generateResponse(prompt, options = {}) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 1024,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No response generated');
      }

      return { success: true, response: content.trim() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

export const getAIProvider = async (provider?: AIProvider): Promise<AIProviderInterface> => {
  const config = await apiConfigStorage.getSelectedProvider();
  const selectedProvider = provider || config;
  const apiKey = await apiConfigStorage.getApiKey(selectedProvider);

  if (!apiKey) {
    throw new Error(`No API key configured for ${selectedProvider}`);
  }

  switch (selectedProvider) {
    case 'openai':
      return createOpenAIProvider(apiKey);
    case 'claude':
      return createClaudeProvider(apiKey);
    case 'gemini':
    default:
      return createGeminiProvider(apiKey);
  }
};

export const getProviderName = (provider: AIProvider): string => {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return 'Anthropic Claude';
    case 'gemini':
    default:
      return 'Google Gemini';
  }
};
