/**
 * DNA Extraction Service (Gemini-only, Google Stack)
 * Flow: User drops URL → Gemini extracts company DNA → saved to Firebase
 * All downstream (campaigns, jingles, agents) auto-use the DNA
 * 
 * Fixes:
 * - Improved Gemini handling with fallback prompt for vague sectors
 * - Provider status check (Gemini down detection)
 * - Debounced extraction (no double-generation)
 */

import { universalAiService } from './universalAiService';
import { firebaseService } from './firebaseService';
import { creditsService } from './creditsService';

export interface CompanyDNA {
  id: string;
  url: string;
  company: string;
  description: string;
  mission?: string;
  values: string[];
  targetAudience: string;
  tone: string;
  colors: string[];
  brandPersonality: string;
  keyProductsServices: string[];
  uniqueValueProposition: string;
  competitors?: string[];
  contentPillars: string[];
  extractedAt: string;
  sector?: string;
  niche?: string;
}

interface ProviderStatus {
  healthy: boolean;
  message?: string;
  retryAfter?: number;
}

class DNAExtractionService {
  private extractionInProgress: Map<string, Promise<CompanyDNA>> = new Map();
  private lastExtractionTime: Map<string, number> = new Map();
  private DEBOUNCE_MS = 2000;

  /**
   * Check if Gemini API is healthy
   */
  async checkProviderStatus(): Promise<ProviderStatus> {
    try {
      // Try a simple Gemini API test call
      const testResponse = await universalAiService.generateText({
        prompt: 'Respond with "OK"',
        featureId: 'provider-health-check',
        bypassCache: true
      });

      if (testResponse === "FALLBACK_TRIGGERED") {
        return {
          healthy: false,
          message: '⚠️ Google API busy—retry in 30 seconds',
          retryAfter: 30000
        };
      }

      return { healthy: true };
    } catch (error: any) {
      const isQuota = /429|quota|limit|RESOURCE_EXHAUSTED/i.test(error.message);
      return {
        healthy: false,
        message: isQuota 
          ? '⚠️ Google API quota exceeded—retry in 60 seconds' 
          : `⚠️ Google API error: ${error.message}`,
        retryAfter: isQuota ? 60000 : 30000
      };
    }
  }

  /**
   * Extract DNA from URL with debouncing
   */
  async extractFromURL(url: string, userId: string, sector?: string): Promise<CompanyDNA> {
    console.log(`🔍 Extracting DNA from: ${url}`);

    // Debounce: prevent duplicate extractions within 2 seconds
    const cacheKey = `${userId}_${url}`;
    if (this.extractionInProgress.has(cacheKey)) {
      console.log('⏳ Extraction already in progress, returning pending promise');
      return this.extractionInProgress.get(cacheKey)!;
    }

    const lastTime = this.lastExtractionTime.get(cacheKey) || 0;
    if (Date.now() - lastTime < this.DEBOUNCE_MS) {
      throw new Error('⚠️ Please wait before extracting again (debounced)');
    }

    // Create extraction promise
    const extractionPromise = (async () => {
      try {
        // Check credits
        const canAfford = await creditsService.canAffordOperation('dna-extraction');
        if (!canAfford) {
          throw new Error('❌ Insufficient credits for DNA extraction (requires 20 credits)');
        }

        // Check provider health
        const status = await this.checkProviderStatus();
        if (!status.healthy) {
          throw new Error(status.message || 'Google API unavailable');
        }

        // Fetch HTML from URL
        const html = await this.fetchPageContent(url);

        // Extract DNA via Gemini (with fallback for vague sectors)
        const dnaJson = await this.analyzeWithGemini(html, url, sector);

        // Deduct credits
        await creditsService.deductOperationCredits('dna-extraction');

        // Save to Firebase
        const dnaId = `dna_${Date.now()}`;
        await firebaseService.saveDNAProfile(userId, dnaId, dnaJson);

        console.log(`✅ DNA extracted and saved: ${dnaJson.company}`);
        this.lastExtractionTime.set(cacheKey, Date.now());
        
        return { ...dnaJson, id: dnaId };
      } finally {
        this.extractionInProgress.delete(cacheKey);
      }
    })();

    this.extractionInProgress.set(cacheKey, extractionPromise);
    return extractionPromise;
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AIBot/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.warn(`⚠️ Failed to fetch ${url}:`, error);
      return `<title>${url}</title><body>URL content unavailable</body>`;
    }
  }

  /**
   * Analyze with Gemini + fallback for vague sectors
   */
  private async analyzeWithGemini(
    html: string,
    url: string,
    sector?: string
  ): Promise<CompanyDNA> {
    let prompt = `Analyze this company website and extract their brand DNA as JSON.

URL: ${url}
${sector ? `\nIndustry Context: ${sector}` : ''}

HTML Content (first 5000 chars):
${html.substring(0, 5000)}

Extract and return VALID JSON with ONLY these fields:
{
  "company": "Company Name",
  "sector": "Sector (e.g., 'Technology', 'Healthcare', 'Retail')",
  "niche": "Specific niche if sector is broad",
  "description": "One-line description",
  "mission": "Company mission or vision statement",
  "values": ["Value 1", "Value 2", "Value 3"],
  "targetAudience": "Who they serve",
  "tone": "professional|playful|formal|casual|edgy",
  "colors": ["#HEX1", "#HEX2", "#HEX3"],
  "brandPersonality": "3-4 words describing brand personality",
  "keyProductsServices": ["Product/Service 1", "Product/Service 2"],
  "uniqueValueProposition": "Their main differentiator",
  "competitors": ["Competitor 1", "Competitor 2"],
  "contentPillars": ["Content theme 1", "Content theme 2", "Content theme 3"]
}

Be precise. Extract real information from the HTML. If sector is vague (e.g., 'services'), ask for clarification.
If a field is not found, make an educated guess based on industry standards.`;

    // If sector is vague, add fallback instruction
    if (sector && /services|software|consulting|agency/i.test(sector)) {
      prompt += `\n\nIMPORTANT: If the sector is too broad, kindly ask the user for a more specific niche (e.g., 'barbershop' instead of 'services', 'SaaS' instead of 'software'). In JSON, set "niche" to "awaiting_clarification".`;
    }

    try {
      const response = await universalAiService.generateText({
        prompt,
        responseMimeType: 'application/json',
        featureId: 'dna-extraction'
      });

      // Handle fallback
      if (response === "FALLBACK_TRIGGERED") {
        throw new Error('Google API fallback triggered—try again in 30 seconds');
      }

      const parsed = JSON.parse(response);
      
      // If niche awaiting clarification, throw user-friendly error
      if (parsed.niche === 'awaiting_clarification') {
        throw new Error(
          `⚠️ Sector too vague: "${sector}". Please specify a niche (e.g., 'barbershop' instead of 'services')`
        );
      }

      return {
        ...parsed,
        url,
        extractedAt: new Date().toISOString()
      };
    } catch (error: any) {
      if (error.message?.includes('awaiting_clarification')) {
        throw error; // Re-throw user error
      }
      console.error('❌ Failed to parse DNA JSON:', error);
      throw new Error('Failed to extract DNA: ' + (error.message || 'invalid JSON response'));
    }
  }

  async getDNA(userId: string, dnaId: string): Promise<CompanyDNA | null> {
    return await firebaseService.getDNAProfile(userId, dnaId);
  }

  async listDNAs(userId: string): Promise<CompanyDNA[]> {
    const dnas = await firebaseService.listDNAProfiles(userId);
    return Object.values(dnas) as CompanyDNA[];
  }

  getSystemPromptFromDNA(dna: CompanyDNA): string {
    return `You are a content creator for ${dna.company}.

Company: ${dna.company}
Sector: ${dna.sector || 'General'}
${dna.niche ? `Niche: ${dna.niche}` : ''}
Mission: ${dna.mission || dna.description}
Target Audience: ${dna.targetAudience}
Brand Tone: ${dna.tone}
Brand Personality: ${dna.brandPersonality}
Key Values: ${dna.values.join(', ')}
Brand Colors: ${dna.colors.join(', ')}
Unique Value: ${dna.uniqueValueProposition}

When generating content:
1. Use this tone and personality consistently
2. Align with these values
3. Target this audience specifically
4. Highlight the unique value proposition
5. Focus on these content pillars: ${dna.contentPillars.join(', ')}

All content must feel authentic to this brand.`;
  }
}

export const dnaExtractionService = new DNAExtractionService();
