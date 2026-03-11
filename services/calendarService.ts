/**
 * Calendar Service - Auto-Post Scheduling & Execution (Gemini-only, Google Stack)
 * Handles campaign scheduling, Meta Graph API posting, credit deduction, and retry logic
 */

import { creditsService } from './creditsService';
import { pricingService } from './pricingService';
import { firebaseService } from './firebaseService';

export interface ScheduledPost {
  id: string;
  campaignId: string;
  userId: string;
  assetId: string;
  scheduledFor: Date;
  platform: 'instagram' | 'tiktok';
  status: 'pending' | 'posting' | 'posted' | 'failed';
  postUrl?: string;
  errorMessage?: string;
  retryCount: number;
  metaAccessToken: string;
  createdAt: Date;
}

export interface PostAssetPayload {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string; // Jingle URL
  platform: 'instagram' | 'tiktok';
  igBusinessAccountId?: string;
  tikTokUserId?: string;
}

class CalendarService {
  private scheduledPosts: Map<string, ScheduledPost> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY_MS = 5000;
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private postingInProgress: Set<string> = new Set(); // Debounce
  private dailyCreditsUsed: Map<string, { amount: number; resetAt: number }> = new Map();

  async initialize(): Promise<void> {
    console.log('✅ Calendar Service initialized');
    await this.loadPendingPosts();
  }

  /**
   * Gate check: Is user Pro+ tier?
   */
  async canAutoPost(userId: string): Promise<boolean> {
    try {
      const userData = await pricingService.getUserTier(userId);
      return userData.tier === 'pro' || userData.tier === 'enterprise';
    } catch {
      return false;
    }
  }

  /**
   * Schedule a campaign for auto-posting
   */
  async schedulePost(
    campaignId: string,
    assetId: string,
    userId: string,
    scheduledFor: Date,
    platform: 'instagram' | 'tiktok',
    metaAccessToken: string,
    igBusinessAccountId?: string,
    tikTokUserId?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    const canPost = await this.canAutoPost(userId);
    if (!canPost) {
      return { success: false, error: 'Auto-posting requires Pro or Enterprise subscription' };
    }

    const postId = crypto.randomUUID();
    const post: ScheduledPost = {
      id: postId,
      campaignId,
      userId,
      assetId,
      scheduledFor,
      platform,
      status: 'pending',
      retryCount: 0,
      metaAccessToken,
      createdAt: new Date()
    };

    this.scheduledPosts.set(postId, post);

    try {
      await firebaseService.saveScheduledPost(userId, postId, {
        id: postId,
        campaignId,
        assetId,
        scheduledFor: scheduledFor.toISOString(),
        platform,
        status: 'pending',
        retryCount: 0,
        metaAccessToken,
        igBusinessAccountId: igBusinessAccountId || null,
        tikTokUserId: tikTokUserId || null,
        createdAt: new Date().toISOString()
      });

      this.setExecutionTimer(postId, scheduledFor);
      return { success: true, postId };
    } catch (e) {
      console.error('Error saving scheduled post:', e);
      return { success: false, error: 'Database error' };
    }
  }

  private setExecutionTimer(postId: string, scheduledFor: Date): void {
    const now = Date.now();
    const scheduledTime = new Date(scheduledFor).getTime();
    const delayMs = Math.max(0, scheduledTime - now);

    if (this.activeIntervals.has(postId)) {
      clearTimeout(this.activeIntervals.get(postId)!);
    }

    const timer = setTimeout(() => {
      this.executePost(postId).catch(e => console.error('Error executing post:', e));
    }, delayMs);

    this.activeIntervals.set(postId, timer);
  }

  async executePost(postId: string): Promise<void> {
    if (this.postingInProgress.has(postId)) return;

    const post = this.scheduledPosts.get(postId);
    if (!post) return;

    this.postingInProgress.add(postId);
    try {
      post.status = 'posting';

      const assets = await this.getAssets(post.userId, post.campaignId, post.assetId);
      if (!assets) throw new Error('Assets not found');

      const payload = this.formatForPlatform(assets, post.platform);
      const postResult = await this.callMetaGraphAPI(post.platform, payload, post.metaAccessToken);

      if (!postResult.success) throw new Error(postResult.error || 'API call failed');

      const creditsCost = 50;
      const canDeduct = await this.checkDailyCreditsAvailable(post.userId, creditsCost);
      if (!canDeduct) throw new Error('Daily credit cap reached');

      const deductResult = await creditsService.deduct(post.userId, creditsCost, {
        reason: `Auto-post to ${post.platform}`,
        campaignId: post.campaignId,
        postId
      });

      if (!deductResult.success) {
        await creditsService.refund(post.userId, creditsCost, {
          reason: `Refund for failed post: ${deductResult.error}`,
          originalPostId: postId
        });
        throw new Error(`Credits deduction failed: ${deductResult.error}`);
      }

      post.status = 'posted';
      post.postUrl = postResult.postUrl;
      
      await firebaseService.broadcastNotification(post.userId, {
        type: 'post_success',
        postId,
        platform: post.platform,
        postUrl: postResult.postUrl,
        timestamp: new Date().toISOString()
      });

      await this.saveFinalStatus(post.userId, postId, 'posted', postResult.postUrl || '');
    } catch (error) {
      console.error('❌ Post execution failed:', error);
      await this.handlePostError(postId, error as Error);
    } finally {
      this.postingInProgress.delete(postId);
    }
  }

  private async checkDailyCreditsAvailable(userId: string, requested: number): Promise<boolean> {
    const userData = await pricingService.getUserTier(userId);
    if (userData.tier === 'pro' || userData.tier === 'enterprise') return true;

    const DAILY_CAP = 500;
    const existing = this.dailyCreditsUsed.get(userId);
    const used = existing?.amount || 0;
    return used + requested <= DAILY_CAP;
  }

  private async handlePostError(postId: string, error: Error): Promise<void> {
    const post = this.scheduledPosts.get(postId);
    if (!post) return;

    post.retryCount++;
    post.errorMessage = error.message;

    if (post.retryCount < this.MAX_RETRIES) {
      const delayMs = this.RETRY_DELAY_MS * Math.pow(2, post.retryCount - 1);
      const timer = setTimeout(() => {
        this.executePost(postId).catch(e => console.error('Retry failed:', e));
      }, delayMs);
      this.activeIntervals.set(`${postId}-retry`, timer);
    } else {
      post.status = 'failed';
      await this.saveFinalStatus(post.userId, postId, 'failed', null, error.message);
      await firebaseService.broadcastNotification(post.userId, {
        type: 'post_failed',
        message: `Campaign post failed: ${error.message}`,
        platform: post.platform
      });
    }
  }

  private async getAssets(userId: string, campaignId: string, assetId: string) {
    try {
      const data = await firebaseService.getCampaignAsset(userId, campaignId, assetId);
      if (!data) return null;
      return {
        text: data.content || '',
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl
      };
    } catch (e) {
      return null;
    }
  }

  private formatForPlatform(assets: any, platform: string): PostAssetPayload {
    return {
      text: assets.text,
      imageUrl: assets.imageUrl,
      videoUrl: assets.videoUrl,
      audioUrl: assets.audioUrl,
      platform: platform as 'instagram' | 'tiktok'
    };
  }

  private async callMetaGraphAPI(platform: string, payload: PostAssetPayload, accessToken: string): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    // Mock API call for now
    return { success: true, postUrl: `https://${platform}.com/post/mock_${Date.now()}` };
  }

  private async saveFinalStatus(userId: string, postId: string, status: 'posted' | 'failed', postUrl: string | null, errorMessage?: string): Promise<void> {
    await firebaseService.updateScheduledPost(userId, postId, {
      status,
      postUrl,
      errorMessage
    });
  }

  private async loadPendingPosts(): Promise<void> {
    try {
      const data = await firebaseService.listPendingScheduledPosts();
      if (!data) return;
      for (const row of data) {
        const post: ScheduledPost = {
          id: row.id,
          campaignId: row.campaignId,
          userId: row.userId,
          assetId: row.assetId,
          scheduledFor: new Date(row.scheduledFor),
          platform: row.platform,
          status: row.status,
          postUrl: row.postUrl,
          retryCount: row.retryCount,
          metaAccessToken: row.metaAccessToken,
          createdAt: new Date(row.createdAt)
        };
        this.scheduledPosts.set(post.id, post);
        this.setExecutionTimer(post.id, post.scheduledFor);
      }
    } catch (e) {}
  }

  async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    return Array.from(this.scheduledPosts.values()).filter(p => p.userId === userId);
  }

  async cancelPost(postId: string): Promise<boolean> {
    const post = this.scheduledPosts.get(postId);
    if (!post) return false;
    const timer = this.activeIntervals.get(postId);
    if (timer) clearTimeout(timer);
    await firebaseService.updateScheduledPost(post.userId, postId, { status: 'cancelled' });
    this.scheduledPosts.delete(postId);
    return true;
  }
}

export const calendarService = new CalendarService();
