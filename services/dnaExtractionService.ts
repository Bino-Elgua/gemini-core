/**
 * DNA Extraction Service
 * Flow: User drops URL → Gemini extracts company DNA → saved to Firebase
 * All downstream (campaigns, jingles, agents) auto-use the DNA
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
  tone: string; // 'professional', 'playful', 'formal', 'casual', 'edgy'
  colors: string[];
  brandPersonality: string;
  keyProductsServices: string[];
  uniqueValueProposition: string;
  competitors?: string[];
  contentPillars: string[];
  extractedAt: string;
}

class DNAExtractionService {
  
  async extractFromURL(url: string, userId: string): Promise<CompanyDNA> {
    console.log(`🔍 Extracting DNA from: ${url}`);

    // Check credits
    const canAfford = await creditsService.canAffordOperation('dna-extraction');
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for DNA extraction (requires 20 credits)');
    }

    // Fetch HTML from URL
    const html = await this.fetchPageContent(url);

    // Extract DNA via Gemini
    const dnaJson = await this.analyzeWithGemini(html, url);

    // Deduct credits
    await creditsService.deductOperationCredits('dna-extraction');

    // Save to Firebase
    const dnaId = `dna_${Date.now()}`;
    await firebaseService.saveDNAProfile(userId, dnaId, dnaJson);

    console.log(`✅ DNA extracted and saved: ${dnaJson.company}`);
    return { ...dnaJson, id: dnaId };
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      // Use CORS proxy if needed (or deploy backend handler)
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
      // Return minimal HTML structure
      return `<title>${url}</title><body>URL content unavailable</body>`;
    }
  }

  private async analyzeWithGemini(html: string, url: string): Promise<CompanyDNA> {
    const prompt = `Analyze this company website and extract their brand DNA as JSON.

URL: ${url}

HTML Content (first 5000 chars):
${html.substring(0, 5000)}

Extract and return VALID JSON (no markdown, no code blocks) with ONLY these fields:
{
  "company": "Company Name",
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

Be precise. Extract real information from the HTML. If a field is not found, make an educated guess based on industry standards.`;

    const response = await universalAiService.generateText({
      prompt,
      responseMimeType: 'application/json',
      featureId: 'dna-extraction',
      model: 'gemini-2.0-flash'
    });

    try {
      const parsed = JSON.parse(response);
      return {
        ...parsed,
        url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to parse DNA JSON:', response);
      throw new Error('Failed to extract DNA: invalid JSON response');
    }
  }

  async getDNA(userId: string, dnaId: string): Promise<CompanyDNA | null> {
    return await firebaseService.getDNAProfile(userId, dnaId);
  }

  async listDNAs(userId: string): Promise<CompanyDNA[]> {
    const dnas = await firebaseService.listDNAProfiles(userId);
    return Object.values(dnas) as CompanyDNA[];
  }

  // Use DNA as system prompt for all downstream generation
  getSystemPromptFromDNA(dna: CompanyDNA): string {
    return `You are a content creator for ${dna.company}.

Company: ${dna.company}
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
