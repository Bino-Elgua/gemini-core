/**
 * Gemini-Only Provider Service
 * Single source of truth for all LLM calls (Google Gemini only)
 * Handles: DNA extraction, campaign generation, website building, agent chat
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiConfig {
  apiKey: string;
  model?: string;
}

interface GeminiResponse {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}

interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

class GeminiOnlyService {
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string = '';
  private model: string = 'gemini-2.0-flash';
  private requestCount = 0;
  private dailyLimit = 500; // Free tier daily credits
  private todayUsed = 0;

  initialize(config: GeminiConfig): void {
    this.apiKey = config.apiKey || process.env.VITE_GEMINI_API_KEY || '';
    this.model = config.model || 'gemini-2.0-flash';

    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
      return;
    }

    this.client = new GoogleGenerativeAI(this.apiKey);
    console.log('✅ Gemini-only service initialized');
  }

  /**
   * Check provider health + daily quota
   */
  async checkStatus(): Promise<{
    healthy: boolean;
    dailyUsed: number;
    dailyLimit: number;
    remaining: number;
    message: string;
  }> {
    if (!this.client) {
      return {
        healthy: false,
        dailyUsed: this.todayUsed,
        dailyLimit: this.dailyLimit,
        remaining: Math.max(0, this.dailyLimit - this.todayUsed),
        message: 'Google API not initialized. Set VITE_GEMINI_API_KEY in .env',
      };
    }

    try {
      // Test API with lightweight call
      const result = await this.generateText('test', { maxTokens: 1 });
      this.todayUsed += 1;

      return {
        healthy: true,
        dailyUsed: this.todayUsed,
        dailyLimit: this.dailyLimit,
        remaining: Math.max(0, this.dailyLimit - this.todayUsed),
        message: '✅ Google API healthy',
      };
    } catch (error) {
      return {
        healthy: false,
        dailyUsed: this.todayUsed,
        dailyLimit: this.dailyLimit,
        remaining: Math.max(0, this.dailyLimit - this.todayUsed),
        message: `❌ Google API error: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }
  }

  /**
   * Core text generation
   */
  async generateText(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GeminiResponse> {
    if (!this.client) {
      throw new Error('Gemini service not initialized. Set VITE_GEMINI_API_KEY in .env');
    }

    // Check daily limit
    if (this.todayUsed >= this.dailyLimit) {
      throw new Error(
        `Daily credit limit reached (${this.dailyLimit} free). Upgrade to Pro for more.`
      );
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      const content = options.systemPrompt
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt;

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: content }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1024,
        },
      });

      const text = response.response.text();
      this.todayUsed += Math.ceil(prompt.length / 4); // Rough token estimate

      return {
        text,
        usage: {
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(text.length / 4),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error('Invalid Gemini API key. Check .env configuration.');
      }
      throw error;
    }
  }

  /**
   * DNA Extraction from sector + context
   */
  async extractDNA(sector: string, context: string): Promise<{
    sector: string;
    niche: string;
    values: string[];
    colors: string[];
    tone: string;
    competitors: string[];
  }> {
    const prompt = `You are a brand DNA analyst. Extract brand intelligence from this sector and context.

Sector: ${sector}
Context: ${context}

If the sector is vague (e.g., "services", "business"), ask clarification in your response.
Otherwise, provide JSON (no markdown):

{
  "sector": "${sector}",
  "niche": "specific niche",
  "values": ["value1", "value2", "value3"],
  "colors": ["#HEX1", "#HEX2"],
  "tone": "professional|casual|bold|creative",
  "competitors": ["company1", "company2"]
}`;

    const response = await this.generateText(prompt, { maxTokens: 500 });

    // Parse JSON response
    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Sector was vague - ask for clarification
        return {
          sector,
          niche: context,
          values: ['clarity', 'innovation', 'growth'],
          colors: ['#3B82F6', '#10B981'],
          tone: 'professional',
          competitors: [],
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback for vague sectors
      return {
        sector,
        niche: 'Specify niche (e.g., "barbershop", "SaaS", "fitness")',
        values: ['authenticity', 'quality', 'community'],
        colors: ['#8B5CF6', '#EC4899'],
        tone: 'professional',
        competitors: [],
      };
    }
  }

  /**
   * Generate campaign brief + assets
   */
  async generateCampaign(dna: any): Promise<{
    title: string;
    copy: string;
    igReelScript: string;
    tiktokScript: string;
    emailSubject: string;
    emailBody: string;
  }> {
    const prompt = `You are a campaign copywriter. Create a multi-platform campaign brief.

Brand DNA:
${JSON.stringify(dna, null, 2)}

Respond with JSON (no markdown):
{
  "title": "Campaign name",
  "copy": "Main message",
  "igReelScript": "15s video script for Instagram Reel",
  "tiktokScript": "30s video script for TikTok",
  "emailSubject": "Subject line",
  "emailBody": "Email body with CTA"
}`;

    const response = await this.generateText(prompt, { maxTokens: 1000 });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : this.defaultCampaign();
    } catch {
      return this.defaultCampaign();
    }
  }

  private defaultCampaign() {
    return {
      title: 'Brand Campaign',
      copy: 'Elevate your brand story.',
      igReelScript: 'Hook: Show the problem. Solution: Your product. CTA: Link in bio.',
      tiktokScript: 'Start with trend. Add your twist. End with call-to-action.',
      emailSubject: 'Discover what makes us different',
      emailBody: 'Learn how our solution transforms your business. Click below to start.',
    };
  }

  /**
   * Generate full landing page HTML
   */
  async generateWebsite(dna: any): Promise<{
    html: string;
    css: string;
    js: string;
  }> {
    const prompt = `You are a web designer. Generate a complete landing page.

Brand DNA:
${JSON.stringify(dna, null, 2)}

Return ONLY a JSON object with no markdown (no triple backticks):
{
  "html": "<html>...</html>",
  "css": "<style>...</style>",
  "js": "// JavaScript code"
}

HTML must include:
- Hero section with brand name + tagline
- 3 feature sections
- CTA button
- Footer
- Responsive design (mobile-first)
- Use the brand colors from DNA

Keep HTML concise. CSS inline in <style> tag.`;

    const response = await this.generateText(prompt, { maxTokens: 2000 });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        html: parsed.html || '<html><body>Error generating HTML</body></html>',
        css: parsed.css || '',
        js: parsed.js || '',
      };
    } catch (error) {
      console.error('Website generation error:', error);
      return {
        html: '<html><body><h1>Website generation failed</h1><p>Please try again.</p></body></html>',
        css: 'body { font-family: sans-serif; padding: 20px; }',
        js: '',
      };
    }
  }

  /**
   * Agent instructions + safety check
   */
  async generateAgentInstructions(role: string, context: string): Promise<{
    systemPrompt: string;
    safetyRules: string[];
    examples: string[];
  }> {
    const prompt = `You are an AI safety engineer. Create safe agent instructions.

Agent Role: ${role}
Context: ${context}

Return JSON (no markdown):
{
  "systemPrompt": "System instructions for the agent",
  "safetyRules": ["rule1", "rule2"],
  "examples": ["example1", "example2"]
}`;

    const response = await this.generateText(prompt, { maxTokens: 600 });

    try {
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : this.defaultAgentInstructions();
    } catch {
      return this.defaultAgentInstructions();
    }
  }

  private defaultAgentInstructions() {
    return {
      systemPrompt: 'You are a helpful assistant.',
      safetyRules: [
        'Do not share sensitive information',
        'Do not impersonate humans',
        'Always be respectful',
      ],
      examples: ['User asks for help', 'Agent provides solution'],
    };
  }

  /**
   * Debounced generation (prevent duplicate calls)
   */
  private debounceMap = new Map<string, Promise<any>>();

  async debounceGenerate(key: string, fn: () => Promise<any>): Promise<any> {
    if (this.debounceMap.has(key)) {
      return this.debounceMap.get(key);
    }

    const promise = fn().finally(() => {
      setTimeout(() => this.debounceMap.delete(key), 1000);
    });

    this.debounceMap.set(key, promise);
    return promise;
  }

  /**
   * Reset daily usage (for testing)
   */
  resetDailyUsage(): void {
    this.todayUsed = 0;
    console.log('Daily usage reset');
  }
}

export const geminiService = new GeminiOnlyService();
