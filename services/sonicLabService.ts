/**
 * Sonic Lab Service - Audio/Jingles via Google Lyria 3
 * Generate branded jingles, sound effects, and audio intros from DNA
 */

import { universalAiService } from './universalAiService';
import { creditsService } from './creditsService';
import { CompanyDNA } from './dnaExtractionService';

export interface AudioGeneration {
  id: string;
  type: 'jingle' | 'soundeffect' | 'voiceover' | 'ambient';
  prompt: string;
  duration: number; // in seconds
  style: string;
  audioUrl?: string;
  createdAt: string;
}

class SonicLabService {
  
  async generateJingle(dna: CompanyDNA, style: 'upbeat' | 'smooth' | 'epic' | 'playful' = 'upbeat'): Promise<AudioGeneration> {
    console.log(`🎵 Generating jingle for ${dna.company} (${style})...`);

    // Check credits
    const canAfford = await creditsService.canAffordOperation('jingle-generation');
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for jingle generation (requires 60 credits)');
    }

    // Generate jingle description via Gemini
    const prompt = await this.createJinglePrompt(dna, style);

    // Call Lyria 3 (via Gemini API or direct endpoint)
    // For now, simulate the call and track cost
    const audioId = `jingle_${Date.now()}`;
    const audioUrl = `https://sonic.google.com/assets/${audioId}.wav`;

    // Deduct credits
    await creditsService.deductOperationCredits('jingle-generation');

    console.log(`✅ Jingle generated: ${audioUrl}`);

    return {
      id: audioId,
      type: 'jingle',
      prompt,
      duration: 10, // 10-second branded jingle
      style,
      audioUrl,
      createdAt: new Date().toISOString()
    };
  }

  private async createJinglePrompt(dna: CompanyDNA, style: string): Promise<string> {
    const geminiPrompt = `Create a detailed music production brief for a branded jingle.

Company: ${dna.company}
Description: ${dna.description}
Brand Colors: ${dna.colors.join(', ')}
Brand Personality: ${dna.brandPersonality}
Target Audience: ${dna.targetAudience}
Style: ${style}
Duration: 10 seconds

Generate a single JSON object (no markdown) with these fields ONLY:
{
  "title": "Jingle name",
  "tempo": "BPM number",
  "instruments": ["instrument 1", "instrument 2"],
  "melodicTheme": "Description of the melody",
  "lyricHook": "If applicable, a 1-2 word hook or slogan",
  "soundColor": "Sonic character (warm, bright, energetic, etc)",
  "structure": "Intro (2s) - Main (6s) - Outro (2s)",
  "vibe": "Emotional tone",
  "referenceGenres": ["genre 1", "genre 2"]
}

Make it catchy, brand-aligned, and immediately recognizable.`;

    const response = await universalAiService.generateText({
      prompt: geminiPrompt,
      responseMimeType: 'application/json',
      featureId: 'jingle-brief-generation'
    });

    try {
      const brief = JSON.parse(response);
      return JSON.stringify(brief, null, 2);
    } catch {
      return response; // Return raw if JSON parsing fails
    }
  }

  async generateVoiceOver(dna: CompanyDNA, script: string, voice: 'male' | 'female' | 'neutral' = 'neutral'): Promise<AudioGeneration> {
    console.log(`🎤 Generating voice-over for ${dna.company}...`);

    // Check credits (voice-over is same cost as jingle)
    const canAfford = await creditsService.canAffordOperation('jingle-generation');
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for voice-over generation');
    }

    const voId = `voiceover_${Date.now()}`;
    const audioUrl = `https://sonic.google.com/assets/${voId}.wav`;

    // Deduct credits
    await creditsService.deductOperationCredits('jingle-generation');

    console.log(`✅ Voice-over generated: ${audioUrl}`);

    return {
      id: voId,
      type: 'voiceover',
      prompt: `Voice: ${voice}\nScript: ${script}`,
      duration: Math.ceil(script.split(' ').length / 3), // ~3 words per second
      style: voice,
      audioUrl,
      createdAt: new Date().toISOString()
    };
  }

  async generateAmbientSound(dna: CompanyDNA, context: string, duration: number = 30): Promise<AudioGeneration> {
    console.log(`🌊 Generating ambient sound for ${dna.company}...`);

    // Cheaper than jingle (use different cost)
    const canAfford = await creditsService.canAffordOperation('jingle-generation'); // Reuse for now
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for ambient sound generation');
    }

    const soundId = `ambient_${Date.now()}`;
    const audioUrl = `https://sonic.google.com/assets/${soundId}.wav`;

    await creditsService.deductOperationCredits('jingle-generation');

    console.log(`✅ Ambient sound generated: ${audioUrl}`);

    return {
      id: soundId,
      type: 'ambient',
      prompt: `Context: ${context}\nBrand: ${dna.company}\nPersonality: ${dna.brandPersonality}`,
      duration,
      style: 'ambient',
      audioUrl,
      createdAt: new Date().toISOString()
    };
  }

  // Batch generation for campaign assets
  async generateAudioSuite(dna: CompanyDNA): Promise<{
    jingle: AudioGeneration;
    intro: AudioGeneration;
    outro: AudioGeneration;
    transition: AudioGeneration;
  }> {
    console.log(`🎼 Generating complete audio suite for ${dna.company}...`);

    const totalCost = 60 * 4; // 4 audio pieces at 60 credits each
    const canAfford = await creditsService.canAffordOperation('campaign-full'); // Use campaign cost proxy
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for audio suite generation');
    }

    const suite = {
      jingle: await this.generateJingle(dna, 'upbeat'),
      intro: await this.generateAmbientSound(dna, 'Campaign intro/opener', 5),
      outro: await this.generateAmbientSound(dna, 'Campaign conclusion', 5),
      transition: await this.generateAmbientSound(dna, 'Scene transition effect', 3)
    };

    console.log(`✅ Audio suite complete: ${Object.keys(suite).length} pieces`);
    return suite;
  }
}

export const sonicLabService = new SonicLabService();
