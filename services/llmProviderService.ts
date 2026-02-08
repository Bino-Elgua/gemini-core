import { hybridStorage } from './hybridStorageService';

export interface LLMConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  costPerToken?: number;
}

export interface LLMResponse {
  text: string;
  tokens: number;
  provider: string;
  cost?: number;
  responseTime: number;
}

// Provider configurations
const PROVIDER_CONFIGS = {
  'gemini': {
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    costPerToken: 0.000075,
    costPer1k: 0.075
  },
  'openai': {
    name: 'OpenAI',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    costPerToken: 0.00003,
    costPer1k: 0.03
  },
  'claude': {
    name: 'Anthropic Claude',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    costPerToken: 0.000015,
    costPer1k: 0.015
  },
  'mistral': {
    name: 'Mistral',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    costPerToken: 0.000002,
    costPer1k: 0.002
  },
  'xai-grok': {
    name: 'xAI Grok',
    models: ['grok-1', 'grok-1-vision'],
    costPerToken: 0.00005,
    costPer1k: 0.05
  },
  'deepseek': {
    name: 'DeepSeek',
    models: ['deepseek-coder', 'deepseek-chat'],
    costPerToken: 0.000001,
    costPer1k: 0.001
  },
  'groq': {
    name: 'Groq',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
    costPerToken: 0,
    costPer1k: 0
  },
  'together': {
    name: 'Together AI',
    models: ['meta-llama/Llama-2-70b-chat-hf'],
    costPerToken: 0.0000009,
    costPer1k: 0.0009
  },
  'openrouter': {
    name: 'OpenRouter',
    models: ['gpt-4-turbo', 'claude-3-opus', 'mistral-large'],
    costPerToken: 0.00003,
    costPer1k: 0.03
  },
  'perplexity': {
    name: 'Perplexity',
    models: ['pplx-70b-online', 'pplx-7b-online'],
    costPerToken: 0.00007,
    costPer1k: 0.07
  },
  'qwen': {
    name: 'Alibaba Qwen',
    models: ['qwen-max', 'qwen-plus'],
    costPerToken: 0.000001,
    costPer1k: 0.001
  },
  'cohere': {
    name: 'Cohere',
    models: ['command-r-plus', 'command-r'],
    costPerToken: 0.000003,
    costPer1k: 0.003
  },
  'meta-llama': {
    name: 'Meta Llama (via Replicate)',
    models: ['llama-2-70b', 'llama-2-13b'],
    costPerToken: 0.00001,
    costPer1k: 0.01
  },
  'azure-openai': {
    name: 'Azure OpenAI',
    models: ['gpt-4-turbo', 'gpt-35-turbo'],
    costPerToken: 0.00003,
    costPer1k: 0.03
  },
  'ollama': {
    name: 'Ollama (Local)',
    models: ['llama2', 'mistral', 'neural-chat'],
    costPerToken: 0,
    costPer1k: 0
  }
};

class LLMProviderService {
  private activeProvider: string = 'gemini';
  private configs: Map<string, LLMConfig> = new Map();

  async initialize(): Promise<void> {
    // Load configs from storage
    const stored = await hybridStorage.get('llm-configs');
    if (stored) {
      Object.entries(stored).forEach(([provider, config]) => {
        this.configs.set(provider, config as LLMConfig);
      });
    }

    // Set defaults
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (geminiKey && !this.configs.has('gemini')) {
      this.configs.set('gemini', {
        provider: 'gemini',
        apiKey: geminiKey,
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 2048
      });
    }

    console.log(`✅ Initialized ${this.configs.size} LLM providers`);
  }

  async configureProvider(config: LLMConfig): Promise<void> {
    this.configs.set(config.provider, config);
    const all = Object.fromEntries(this.configs);
    await hybridStorage.set('llm-configs', all);
    console.log(`✅ LLM provider configured: ${config.provider}`);
  }

  async generate(
    prompt: string,
    provider?: string,
    options?: any
  ): Promise<LLMResponse> {
    const providerName = provider || this.activeProvider;
    const config = this.configs.get(providerName);

    if (!config) {
      // Fallback to Gemini
      return this.generateWithGemini(prompt, options);
    }

    const startTime = Date.now();
    let response: LLMResponse;

    try {
      switch (providerName) {
        case 'gemini':
          response = await this.generateWithGemini(prompt, options);
          break;
        case 'openai':
          response = await this.generateWithOpenAI(prompt, config, options);
          break;
        case 'claude':
          response = await this.generateWithClaude(prompt, config, options);
          break;
        case 'mistral':
          response = await this.generateWithMistral(prompt, config, options);
          break;
        default:
          response = await this.generateWithGemini(prompt, options);
      }
    } catch (error) {
      console.error(`❌ LLM generation failed (${providerName}):`, error);
      // Fallback to Gemini
      response = await this.generateWithGemini(prompt, options);
    }

    response.responseTime = Date.now() - startTime;
    return response;
  }

  private async generateWithGemini(
    prompt: string,
    options?: any
  ): Promise<LLMResponse> {
    try {
      const config = this.configs.get('gemini');

      if (!config || !config.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Use direct Gemini API call instead of SDK
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        text,
        tokens: Math.ceil(text.length / 4),
        provider: 'gemini',
        cost: (Math.ceil(text.length / 4) * 0.000075),
        responseTime: 0
      };
    } catch (error) {
      throw error;
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    config: LLMConfig,
    options?: any
  ): Promise<LLMResponse> {
    if (!config.apiKey) throw new Error('OpenAI API key required');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    return {
      text,
      tokens: data.usage?.total_tokens || 0,
      provider: 'openai',
      cost: (data.usage?.total_tokens || 0) / 1000 * 0.03,
      responseTime: 0
    };
  }

  private async generateWithClaude(
    prompt: string,
    config: LLMConfig,
    options?: any
  ): Promise<LLMResponse> {
    if (!config.apiKey) throw new Error('Claude API key required');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: config.maxTokens || 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    const text = data.content[0]?.text || '';

    return {
      text,
      tokens: data.usage?.output_tokens || 0,
      provider: 'claude',
      cost: (data.usage?.output_tokens || 0) / 1000 * 0.0015,
      responseTime: 0
    };
  }

  private async generateWithMistral(
    prompt: string,
    config: LLMConfig,
    options?: any
  ): Promise<LLMResponse> {
    if (!config.apiKey) throw new Error('Mistral API key required');
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Mistral API error');
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';

    return {
      text,
      tokens: data.usage?.total_tokens || 0,
      provider: 'mistral',
      cost: (data.usage?.total_tokens || 0) / 1000 * 0.00015,
      responseTime: 0
    };
  }

  getAvailableProviders(): string[] {
    return Object.keys(PROVIDER_CONFIGS);
  }

  getProviderInfo(provider: string): any {
    return PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
  }

  async setActiveProvider(provider: string): Promise<void> {
    if (this.configs.has(provider)) {
      this.activeProvider = provider;
      console.log(`✅ Active provider set to: ${provider}`);
    } else {
      throw new Error(`Provider not configured: ${provider}`);
    }
  }

  getActiveProvider(): string {
    return this.activeProvider;
  }

  async getUsageStats(): Promise<any> {
    const stats = (await hybridStorage.get('llm-usage-stats')) || {};
    return stats;
  }

  async logUsage(provider: string, tokens: number, cost: number): Promise<void> {
    const stats = (await hybridStorage.get('llm-usage-stats')) || {};
    
    if (!stats[provider]) {
      stats[provider] = { totalTokens: 0, totalCost: 0, calls: 0 };
    }

    stats[provider].totalTokens += tokens;
    stats[provider].totalCost += cost;
    stats[provider].calls += 1;

    await hybridStorage.set('llm-usage-stats', stats);
  }
}

export const llmProviderService = new LLMProviderService();
