/**
 * Settings Service (Gemini-only, Google Stack)
 * Only expose Gemini API Key field
 * Hard-code Gemini everywhere, remove old LLMClient registry
 */

export interface GeminiSettings {
  apiKey: string;
  model?: string; // Default: 'gemini-3-flash-preview'
  temperature?: number; // Default: 0.1
}

class SettingsServiceGeminiOnly {
  private settings: GeminiSettings = {
    apiKey: '',
    model: 'gemini-3-flash-preview',
    temperature: 0.1
  };

  /**
   * Initialize from environment or localStorage
   */
  async initialize(): Promise<void> {
    console.log('⚙️ Settings Service initialized (Gemini-only)');

    // Try to load from localStorage first
    const stored = localStorage.getItem('gemini_settings');
    if (stored) {
      try {
        this.settings = JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse stored settings');
      }
    }

    // Override with env var if present
    const envKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (envKey) {
      this.settings.apiKey = envKey;
      console.log('✅ Loaded Gemini API key from environment');
    }
  }

  /**
   * Get Gemini API key
   */
  getApiKey(): string {
    return this.settings.apiKey;
  }

  /**
   * Set Gemini API key
   */
  setApiKey(key: string): void {
    if (!key || key.length < 10) {
      throw new Error('Invalid API key format');
    }

    this.settings.apiKey = key;
    this.persistSettings();
    console.log('✅ Gemini API key updated');
  }

  /**
   * Get all settings (excluding API key for security)
   */
  getSettings(): Omit<GeminiSettings, 'apiKey'> {
    return {
      model: this.settings.model,
      temperature: this.settings.temperature
    };
  }

  /**
   * Validate API key (simple check)
   */
  async validateApiKey(key: string): Promise<boolean> {
    try {
      // Try a simple test call with Gemini
      const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      return testResponse.ok;
    } catch (error) {
      console.warn('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Reset to defaults (keep API key)
   */
  resetToDefaults(): void {
    this.settings = {
      apiKey: this.settings.apiKey,
      model: 'gemini-3-flash-preview',
      temperature: 0.1
    };
    this.persistSettings();
    console.log('✅ Settings reset to defaults');
  }

  /**
   * Persist settings to localStorage
   */
  private persistSettings(): void {
    localStorage.setItem('gemini_settings', JSON.stringify(this.settings));
  }

  /**
   * Clear all settings (hard reset)
   */
  clearAll(): void {
    this.settings = {
      apiKey: '',
      model: 'gemini-3-flash-preview',
      temperature: 0.1
    };
    localStorage.removeItem('gemini_settings');
    console.log('✅ All settings cleared');
  }
}

export const settingsServiceGeminiOnly = new SettingsServiceGeminiOnly();
