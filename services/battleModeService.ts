import { universalAiService } from './universalAiService';
import { leadScrapingService } from './leadScrapingService';
import { getSupabase } from './supabaseClient';
import { errorHandlingService } from './errorHandlingService';

// Battle Mode Service - Competitive Analysis & Gamification
export interface CompetitiveInsight {
  competitorName: string;
  toneComparison: string;
  strengthVsUser: string;
  weaknessVsUser: string;
  recommendedPivot: string;
  score: number; // 0-100 (Competitor's strength)
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

class BattleModeService {
  async initialize(): Promise<void> {
    console.log('⚔️ Battle Mode Service initialized');
  }

  /**
   * Run a "Brand Battle" against a competitor URL
   */
  async runBrandBattle(userDnaId: string, competitorUrl: string): Promise<CompetitiveInsight> {
    try {
      // 1. Fetch Competitor Data
      const taskId = await leadScrapingService.startLeadGen(competitorUrl, 'system');
      let task = await leadScrapingService.getTaskStatus(taskId);
      
      // Poll for completion (simple for demo)
      while (task?.status === 'processing' || task?.status === 'pending') {
        await new Promise(r => setTimeout(r, 2000));
        task = await leadScrapingService.getTaskStatus(taskId);
      }

      if (task?.status === 'failed' || !task?.results[0]) {
        throw new Error('Failed to scrape competitor data');
      }

      const competitorData = task.results[0];

      // 2. Fetch User DNA from Supabase
      const supabase = getSupabase();
      const { data: userDna } = await supabase!
        .from('company_dna')
        .select('*')
        .eq('id', userDnaId)
        .single();

      // 3. AI Comparison
      const prompt = `Perform a "Brand Battle" between these two companies:
      
      Company A (User): ${JSON.stringify(userDna)}
      Company B (Competitor): ${JSON.stringify(competitorData)}
      
      Compare their brand tone, market positioning, and UVPs. 
      Identify where Company A is winning and where Company B has an edge.
      
      Return VALID JSON:
      {
        "competitorName": "${competitorData.companyName}",
        "toneComparison": "...",
        "strengthVsUser": "...",
        "weaknessVsUser": "...",
        "recommendedPivot": "...",
        "score": 75
      }`;

      const aiResponse = await universalAiService.generateText({
        prompt,
        responseMimeType: 'application/json',
        featureId: 'brand-battle'
      });

      const insight = JSON.parse(aiResponse);

      // 4. Record achievement if user wins (simplified logic)
      if (insight.score < 50) {
        await this.unlockAchievement(userDna.user_id, 'brand-champion');
      }

      return insight;
    } catch (error) {
      await errorHandlingService.handleError(error, 'brand_battle');
      throw error;
    }
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    // Check if already unlocked
    const { data } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', userId)
      .single();

    const metadata = data?.metadata || {};
    const achievements = metadata.achievements || [];

    if (!achievements.includes(achievementId)) {
      achievements.push(achievementId);
      await supabase
        .from('profiles')
        .update({ metadata: { ...metadata, achievements } })
        .eq('id', userId);
        
      console.log(`🏆 Achievement unlocked: ${achievementId} for ${userId}`);
    }
  }

  async getLeaderboard() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, credits')
      .order('credits', { ascending: false })
      .limit(10);

    return data || [];
  }
}

export const battleModeService = new BattleModeService();
