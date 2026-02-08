import { Portfolio, TeamMember } from '../types-extended';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { hybridStorage } from './hybridStorageService';

class PortfolioService {
  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> {
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: `portfolio-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store locally
    await hybridStorage.set(`portfolio-${newPortfolio.id}`, newPortfolio);
    console.log(`✅ Portfolio created: ${newPortfolio.name}`);

    // Sync to cloud if available
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from('portfolios').insert({
          id: newPortfolio.id,
          user_id: portfolio.userId,
          name: portfolio.name,
          description: portfolio.description,
          colors: portfolio.colors,
          fonts: portfolio.fonts,
          tone: portfolio.tone,
          values: portfolio.values,
          mission: portfolio.mission,
          target_audience: portfolio.targetAudience,
          created_at: newPortfolio.createdAt.toISOString(),
          updated_at: newPortfolio.updatedAt.toISOString()
        });

        if (error) {
          console.error('Cloud sync failed:', error);
        }
      }
    }

    return newPortfolio;
  }

  async getPortfolio(id: string): Promise<Portfolio | null> {
    // Try cache first
    const cached = await hybridStorage.get(`portfolio-${id}`);
    if (cached) return cached;

    // Try cloud
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const portfolio: Portfolio = {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            description: data.description,
            colors: data.colors,
            fonts: data.fonts,
            tone: data.tone,
            values: data.values,
            mission: data.mission,
            targetAudience: data.target_audience,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
          };
          
          // Cache locally
          await hybridStorage.set(`portfolio-${id}`, portfolio);
          return portfolio;
        }
      }
    }

    return null;
  }

  async listPortfolios(userId: string): Promise<Portfolio[]> {
    const portfolios: Portfolio[] = [];

    // Try cloud first
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', userId);

        if (!error && data) {
          return data.map(p => ({
            id: p.id,
            userId: p.user_id,
            name: p.name,
            description: p.description,
            colors: p.colors,
            fonts: p.fonts,
            tone: p.tone,
            values: p.values,
            mission: p.mission,
            targetAudience: p.target_audience,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.updated_at)
          }));
        }
      }
    }

    // Fall back to local storage
    const allData = await hybridStorage.getAll();
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('portfolio-') && value && value.userId === userId) {
        portfolios.push(value);
      }
    }

    return portfolios;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const current = await this.getPortfolio(id);
    if (!current) throw new Error('Portfolio not found');

    const updated: Portfolio = {
      ...current,
      ...updates,
      id: current.id,
      userId: current.userId,
      createdAt: current.createdAt,
      updatedAt: new Date()
    };

    // Update locally
    await hybridStorage.set(`portfolio-${id}`, updated);
    console.log(`✅ Portfolio updated: ${updated.name}`);

    // Sync to cloud
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('portfolios')
          .update({
            name: updated.name,
            description: updated.description,
            colors: updated.colors,
            fonts: updated.fonts,
            tone: updated.tone,
            values: updated.values,
            mission: updated.mission,
            target_audience: updated.targetAudience,
            updated_at: updated.updatedAt.toISOString()
          })
          .eq('id', id);

        if (error) {
          console.error('Cloud update failed:', error);
        }
      }
    }

    return updated;
  }

  async deletePortfolio(id: string): Promise<void> {
    // Delete locally
    await hybridStorage.remove(`portfolio-${id}`);
    console.log(`✅ Portfolio deleted: ${id}`);

    // Delete from cloud
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('portfolios')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Cloud deletion failed:', error);
        }
      }
    }
  }

  async addTeamMember(portfolioId: string, member: TeamMember): Promise<TeamMember> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    if (!portfolio.teamMembers) {
      portfolio.teamMembers = [];
    }

    portfolio.teamMembers.push(member);
    await this.updatePortfolio(portfolioId, portfolio);
    console.log(`✅ Team member added: ${member.email}`);

    return member;
  }

  async removeTeamMember(portfolioId: string, memberId: string): Promise<void> {
    const portfolio = await this.getPortfolio(portfolioId);
    if (!portfolio) throw new Error('Portfolio not found');

    if (portfolio.teamMembers) {
      portfolio.teamMembers = portfolio.teamMembers.filter(m => m.id !== memberId);
      await this.updatePortfolio(portfolioId, portfolio);
      console.log(`✅ Team member removed: ${memberId}`);
    }
  }
}

export const portfolioService = new PortfolioService();
