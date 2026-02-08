// Battle Mode Service - Competitive gameplay and gamification
export interface Battle {
  id: string;
  participants: BattleParticipant[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  rounds: BattleRound[];
  winner?: string;
  prize?: { amount: number; currency: string };
}

export interface BattleParticipant {
  userId: string;
  score: number;
  health: number;
  status: 'joined' | 'active' | 'eliminated' | 'won';
}

export interface BattleRound {
  number: number;
  duration: number;
  events: BattleEvent[];
  timestamp: Date;
}

export interface BattleEvent {
  timestamp: Date;
  type: 'attack' | 'defend' | 'ability' | 'heal' | 'buff' | 'debuff';
  userId: string;
  targetId?: string;
  damage?: number;
  effect?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked: Date;
}

export interface Leaderboard {
  userId: string;
  username: string;
  rank: number;
  totalScore: number;
  winsCount: number;
  battlesCount: number;
  winRate: number;
  achievements: Achievement[];
}

class BattleModeService {
  private battles: Map<string, Battle> = new Map();
  private leaderboard: Map<string, { score: number; wins: number; total: number }> = new Map();
  private achievements: Map<string, Achievement[]> = new Map();
  private gameRules = {
    maxParticipants: 4,
    roundDuration: 120,
    maxRounds: 10,
    startHealth: 100,
    scoreMultiplier: 10
  };

  async initialize(): Promise<void> {
    this.setupAchievements();
  }

  private setupAchievements(): void {
    const baseAchievements: Record<string, Achievement> = {
      'first-win': {
        id: 'first-win',
        name: 'First Victory',
        description: 'Win your first battle',
        icon: '🏆',
        points: 100,
        unlocked: new Date()
      },
      'streak-5': {
        id: 'streak-5',
        name: '5-Win Streak',
        description: 'Win 5 battles in a row',
        icon: '⚡',
        points: 500,
        unlocked: new Date()
      },
      'battle-100': {
        id: 'battle-100',
        name: 'Century Fighter',
        description: 'Complete 100 battles',
        icon: '💯',
        points: 1000,
        unlocked: new Date()
      }
    };
  }

  async createBattle(participantIds: string[]): Promise<Battle> {
    if (participantIds.length > this.gameRules.maxParticipants) {
      throw new Error(`Maximum ${this.gameRules.maxParticipants} participants allowed`);
    }

    const battle: Battle = {
      id: `battle_${Date.now()}`,
      participants: participantIds.map(userId => ({
        userId,
        score: 0,
        health: this.gameRules.startHealth,
        status: 'joined'
      })),
      status: 'pending',
      rounds: []
    };

    this.battles.set(battle.id, battle);
    return battle;
  }

  async startBattle(battleId: string): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new Error(`Battle ${battleId} not found`);
    }

    battle.status = 'active';
    battle.startedAt = new Date();

    // Initialize participants as active
    for (const participant of battle.participants) {
      participant.status = 'active';
    }

    this.battles.set(battleId, battle);
  }

  async executeAction(
    battleId: string,
    userId: string,
    action: 'attack' | 'defend' | 'ability' | 'heal',
    targetId?: string
  ): Promise<{ success: boolean; damage?: number; message: string }> {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new Error(`Battle ${battleId} not found`);
    }

    const actor = battle.participants.find(p => p.userId === userId);
    if (!actor) {
      return { success: false, message: 'Participant not found' };
    }

    let currentRound = battle.rounds[battle.rounds.length - 1];
    if (!currentRound) {
      currentRound = {
        number: 1,
        duration: this.gameRules.roundDuration,
        events: [],
        timestamp: new Date()
      };
      battle.rounds.push(currentRound);
    }

    let damage = 0;
    let effect = '';

    switch (action) {
      case 'attack':
        damage = Math.floor(Math.random() * 30) + 10;
        effect = 'basic attack';
        break;
      case 'defend':
        effect = 'defensive stance';
        break;
      case 'ability':
        damage = Math.floor(Math.random() * 50) + 25;
        effect = 'special ability';
        break;
      case 'heal':
        actor.health = Math.min(this.gameRules.startHealth, actor.health + 15);
        effect = 'healing';
        break;
    }

    const event: BattleEvent = {
      timestamp: new Date(),
      type: action,
      userId,
      targetId,
      damage,
      effect
    };

    currentRound.events.push(event);

    // Apply damage to target
    if (targetId && damage > 0) {
      const target = battle.participants.find(p => p.userId === targetId);
      if (target) {
        target.health = Math.max(0, target.health - damage);
        if (target.health === 0) {
          target.status = 'eliminated';
        }
      }

      actor.score += damage * this.gameRules.scoreMultiplier;
    }

    this.battles.set(battleId, battle);

    return { success: true, damage, message: `${action} executed successfully` };
  }

  async completeBattle(battleId: string): Promise<Battle> {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new Error(`Battle ${battleId} not found`);
    }

    battle.status = 'completed';
    battle.completedAt = new Date();

    // Find winner
    const activeParticipants = battle.participants.filter(p => p.status !== 'eliminated');
    if (activeParticipants.length === 1) {
      const winner = activeParticipants[0];
      battle.winner = winner.userId;
      winner.status = 'won';

      // Update leaderboard
      const current = this.leaderboard.get(winner.userId) || { score: 0, wins: 0, total: 0 };
      current.score += winner.score;
      current.wins++;
      current.total++;
      this.leaderboard.set(winner.userId, current);
    }

    // Update total battles for all participants
    for (const participant of battle.participants) {
      const current = this.leaderboard.get(participant.userId) || { score: 0, wins: 0, total: 0 };
      current.score += participant.score;
      current.total++;
      this.leaderboard.set(participant.userId, current);
    }

    this.battles.set(battleId, battle);
    return battle;
  }

  async getBattle(battleId: string): Promise<Battle | null> {
    return this.battles.get(battleId) || null;
  }

  async getLeaderboard(limit: number = 100): Promise<Leaderboard[]> {
    const leaderboard: Leaderboard[] = [];

    for (const [userId, stats] of Array.from(this.leaderboard.entries())) {
      leaderboard.push({
        userId,
        username: `User${userId.slice(-4)}`,
        rank: 0,
        totalScore: stats.score,
        winsCount: stats.wins,
        battlesCount: stats.total,
        winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        achievements: this.achievements.get(userId) || []
      });
    }

    // Sort by score and assign ranks
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    for (let i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1;
    }

    return leaderboard.slice(0, limit);
  }

  async getUserStats(userId: string): Promise<{
    totalBattles: number;
    wins: number;
    losses: number;
    winRate: number;
    totalScore: number;
    rank: number;
  }> {
    const stats = this.leaderboard.get(userId);
    const leaderboard = await this.getLeaderboard();
    const userRank = leaderboard.find(l => l.userId === userId)?.rank || 0;

    return {
      totalBattles: stats?.total || 0,
      wins: stats?.wins || 0,
      losses: (stats?.total || 0) - (stats?.wins || 0),
      winRate: stats && stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      totalScore: stats?.score || 0,
      rank: userRank
    };
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<void> {
    if (!this.achievements.has(userId)) {
      this.achievements.set(userId, []);
    }

    const achievement: Achievement = {
      id: achievementId,
      name: `Achievement ${achievementId}`,
      description: 'Unlocked achievement',
      icon: '⭐',
      points: 100,
      unlocked: new Date()
    };

    this.achievements.get(userId)!.push(achievement);
  }

  async getActiveBattles(): Promise<Battle[]> {
    return Array.from(this.battles.values()).filter(b => b.status === 'active');
  }

  async getBattleHistory(userId: string, limit: number = 20): Promise<Battle[]> {
    return Array.from(this.battles.values())
      .filter(b => b.participants.some(p => p.userId === userId))
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getBattleStats(): Promise<{
    totalBattles: number;
    activeBattles: number;
    completedBattles: number;
    totalParticipants: number;
    averageParticipants: number;
  }> {
    const battles = Array.from(this.battles.values());
    const completed = battles.filter(b => b.status === 'completed');
    const totalParticipants = battles.reduce((sum, b) => sum + b.participants.length, 0);

    return {
      totalBattles: battles.length,
      activeBattles: battles.filter(b => b.status === 'active').length,
      completedBattles: completed.length,
      totalParticipants,
      averageParticipants: battles.length > 0 ? totalParticipants / battles.length : 0
    };
  }
}

export const battleModeService = new BattleModeService();
