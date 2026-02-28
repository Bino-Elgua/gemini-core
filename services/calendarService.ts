/**
 * Calendar Service - Auto-Post Scheduling & Execution
 * Handles campaign scheduling, Meta Graph API posting, and credit deduction
 * Tier-gated: Pro+ only for auto-post. Starter = manual upload only.
 */

import { stripeService } from './stripeService';
import { creditsService } from './creditsService';
import { pricingService } from './pricingService';
import { supabaseClient } from './supabaseClient';

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
  private RETRY_DELAY_MS = 5000; // 5 seconds between retries
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();

  async initialize(): Promise<void> {
    console.log('✅ Calendar Service initialized');
    // Load any pending posts from Supabase on init
    await this.loadPendingPosts();
  }

  /**
   * Gate check: Is user Pro+ tier?
   */
  async canAutoPost(userId: string): Promise<boolean> {
    try {
      const userTier = await pricingService.getUserTier(userId);
      // Only Pro+ and Enterprise can auto-post
      return userTier === 'Pro+' || userTier === 'Enterprise';
    } catch {
      return false; // Starter or free = manual only
    }
  }

  /**
   * Schedule a campaign for auto-posting
   * Called when user drags asset to calendar date in SchedulerPage
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
    // Gate: Pro+ only
    const canPost = await this.canAutoPost(userId);
    if (!canPost) {
      return { success: false, error: 'Auto-posting requires Pro+ subscription (Starter users: manual upload only)' };
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

    // Save to Supabase
    try {
      const { data, error } = await supabaseClient
        .from('scheduled_posts')
        .insert([
          {
            id: postId,
            campaign_id: campaignId,
            user_id: userId,
            asset_id: assetId,
            scheduled_for: scheduledFor.toISOString(),
            platform,
            status: 'pending',
            retry_count: 0,
            meta_access_token: metaAccessToken,
            ig_business_account_id: igBusinessAccountId || null,
            tiktok_user_id: tikTokUserId || null,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('❌ Failed to save scheduled post:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Post scheduled for', scheduledFor);
      // Set up timer to execute at scheduled time
      this.setExecutionTimer(postId, scheduledFor);

      return { success: true, postId };
    } catch (e) {
      console.error('Error saving scheduled post:', e);
      return { success: false, error: 'Database error' };
    }
  }

  /**
   * Set up a timer to execute the post at scheduled time
   */
  private setExecutionTimer(postId: string, scheduledFor: Date): void {
    const now = new Date().getTime();
    const scheduledTime = new Date(scheduledFor).getTime();
    const delayMs = Math.max(0, scheduledTime - now);

    if (this.activeIntervals.has(postId)) {
      clearTimeout(this.activeIntervals.get(postId)!);
    }

    const timer = setTimeout(() => {
      this.executePost(postId).catch(e => console.error('Error executing post:', e));
    }, delayMs);

    this.activeIntervals.set(postId, timer);
    console.log(`⏰ Timer set for post ${postId} in ${delayMs}ms`);
  }

  /**
   * Execute the post: Pull assets → Format → Call Meta API → Deduct credits → Notify user
   */
  async executePost(postId: string): Promise<void> {
    const post = this.scheduledPosts.get(postId);
    if (!post) {
      console.warn('Post not found:', postId);
      return;
    }

    try {
      post.status = 'posting';

      // 1. Pull campaign assets from Firebase/Supabase
      const assets = await this.getAssets(post.campaignId, post.assetId);
      if (!assets) {
        throw new Error('Assets not found');
      }

      // 2. Format for platform
      const payload = this.formatForPlatform(assets, post.platform);

      // 3. Call Meta Graph API or TikTok API
      const postResult = await this.callMetaGraphAPI(
        post.platform,
        payload,
        post.metaAccessToken
      );

      if (!postResult.success) {
        throw new Error(postResult.error || 'API call failed');
      }

      // 4. Deduct credits ONLY on actual post
      const creditsCost = 50; // Auto-post: 50 credits
      const deductResult = await creditsService.deduct(post.userId, creditsCost, {
        reason: `Auto-post to ${post.platform}`,
        campaignId: post.campaignId,
        postId
      });

      if (!deductResult.success) {
        // If credits fail but post succeeded, log it
        console.warn('⚠️ Credits deduction failed but post succeeded');
      }

      // 5. Update campaign status & link
      post.status = 'posted';
      post.postUrl = postResult.postUrl;
      await this.updateCampaignStatus(post.campaignId, 'Posted', postResult.postUrl);

      // 6. Notify user via WebSocket
      await this.notifyUserWebSocket(post.userId, {
        type: 'campaign_posted',
        message: `Campaign live on ${post.platform}! 🎉`,
        postUrl: postResult.postUrl,
        platform: post.platform
      });

      // 7. Save result to Supabase
      await this.saveFinalStatus(postId, 'posted', postResult.postUrl);

      console.log('✅ Post executed successfully:', postId);
    } catch (error) {
      console.error('❌ Post execution failed:', error);
      await this.handlePostError(postId, error as Error);
    }
  }

  /**
   * Retry logic: 3x with exponential backoff
   */
  private async handlePostError(postId: string, error: Error): Promise<void> {
    const post = this.scheduledPosts.get(postId);
    if (!post) return;

    post.retryCount++;
    post.errorMessage = error.message;

    if (post.retryCount < this.MAX_RETRIES) {
      const delayMs = this.RETRY_DELAY_MS * Math.pow(2, post.retryCount - 1);
      console.log(`🔄 Retrying post ${postId} in ${delayMs}ms (attempt ${post.retryCount}/${this.MAX_RETRIES})`);

      const timer = setTimeout(() => {
        this.executePost(postId).catch(e => console.error('Retry failed:', e));
      }, delayMs);

      this.activeIntervals.set(`${postId}-retry`, timer);
    } else {
      // Failed all retries
      post.status = 'failed';
      await this.saveFinalStatus(postId, 'failed', null, error.message);

      // Notify user of failure
      await this.notifyUserWebSocket(post.userId, {
        type: 'campaign_failed',
        message: `Campaign post failed after ${this.MAX_RETRIES} attempts. Please try again.`,
        error: error.message,
        platform: post.platform
      });

      console.error(`❌ Post ${postId} failed after ${this.MAX_RETRIES} retries`);
    }
  }

  /**
   * 1. Pull campaign assets (copy, image, video, audio)
   */
  private async getAssets(
    campaignId: string,
    assetId: string
  ): Promise<{ text: string; imageUrl?: string; videoUrl?: string; audioUrl?: string } | null> {
    try {
      const { data, error } = await supabaseClient
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('id', assetId)
        .single();

      if (error || !data) {
        console.error('Asset fetch error:', error);
        return null;
      }

      return {
        text: data.copy || 'Check out our latest campaign!',
        imageUrl: data.image_url,
        videoUrl: data.video_url,
        audioUrl: data.audio_url // Jingle URL
      };
    } catch (e) {
      console.error('Error fetching assets:', e);
      return null;
    }
  }

  /**
   * 2. Format for platform (IG carousel: text + image + jingle as Reel audio)
   */
  private formatForPlatform(assets: any, platform: string): PostAssetPayload {
    if (platform === 'instagram') {
      // IG Carousel: multiple images with text, or Reel with audio
      return {
        text: assets.text,
        imageUrl: assets.imageUrl,
        videoUrl: assets.videoUrl || assets.audioUrl ? 'carousel_reel' : undefined,
        audioUrl: assets.audioUrl, // Jingle as Reel audio
        platform: 'instagram'
      };
    } else if (platform === 'tiktok') {
      // TikTok: video + audio + text overlay
      return {
        text: assets.text,
        videoUrl: assets.videoUrl,
        audioUrl: assets.audioUrl,
        platform: 'tiktok'
      };
    }

    return { text: assets.text, platform: platform as 'instagram' | 'tiktok' };
  }

  /**
   * 3. Call Meta Graph API (or TikTok API)
   * Returns { success, postUrl, error }
   */
  private async callMetaGraphAPI(
    platform: string,
    payload: PostAssetPayload,
    accessToken: string
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    try {
      if (platform === 'instagram') {
        // Meta Graph API: POST /ig/posting_limit
        // In production, call actual Meta endpoint
        const response = await fetch(
          `https://graph.instagram.com/v18.0/me/media?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: payload.imageUrl,
              caption: payload.text,
              media_type: payload.videoUrl ? 'VIDEO' : 'IMAGE'
            })
          }
        );

        if (!response.ok) {
          const err = await response.json();
          return {
            success: false,
            error: err.error?.message || 'Instagram API error'
          };
        }

        const result = await response.json();
        const postUrl = `https://instagram.com/p/${result.id}`;

        return { success: true, postUrl };
      } else if (platform === 'tiktok') {
        // TikTok API: POST /v1/post/publish
        const response = await fetch(
          'https://open-api.tiktok.com/v1/post/publish/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              video_url: payload.videoUrl,
              caption: payload.text,
              disable_comment: false,
              disable_duet: false,
              disable_stitch: false
            })
          }
        );

        if (!response.ok) {
          const err = await response.json();
          return {
            success: false,
            error: err.error?.message || 'TikTok API error'
          };
        }

        const result = await response.json();
        const postUrl = `https://tiktok.com/@user/video/${result.data.video_id}`;

        return { success: true, postUrl };
      }

      return { success: false, error: 'Unknown platform' };
    } catch (error) {
      console.error('API call error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 4. Update campaign status + link
   */
  private async updateCampaignStatus(
    campaignId: string,
    status: string,
    postUrl: string
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('campaigns')
        .update({
          status: 'active',
          post_url: postUrl,
          posted_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) console.error('Campaign update error:', error);
    } catch (e) {
      console.error('Error updating campaign:', e);
    }
  }

  /**
   * 5. WebSocket notification: "Campaign live on IG!"
   */
  private async notifyUserWebSocket(
    userId: string,
    notification: {
      type: string;
      message: string;
      postUrl?: string;
      platform?: string;
      error?: string;
    }
  ): Promise<void> {
    try {
      // In production, use actual WebSocket or Supabase realtime
      // For now, log to console
      console.log(`📢 [WebSocket to ${userId}]:`, notification.message);

      // Trigger Supabase realtime channel
      const channel = supabaseClient.channel(`user_${userId}`);
      channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: notification
      });
    } catch (e) {
      console.warn('WebSocket notification failed:', e);
    }
  }

  /**
   * Save final status to database
   */
  private async saveFinalStatus(
    postId: string,
    status: 'posted' | 'failed',
    postUrl: string | null,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('scheduled_posts')
        .update({
          status,
          post_url: postUrl,
          error_message: errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) console.error('Status update error:', error);
    } catch (e) {
      console.error('Error saving status:', e);
    }
  }

  /**
   * Load pending posts from database on init
   */
  private async loadPendingPosts(): Promise<void> {
    try {
      const { data, error } = await supabaseClient
        .from('scheduled_posts')
        .select('*')
        .eq('status', 'pending');

      if (error || !data) {
        console.warn('Could not load pending posts');
        return;
      }

      for (const row of data) {
        const post: ScheduledPost = {
          id: row.id,
          campaignId: row.campaign_id,
          userId: row.user_id,
          assetId: row.asset_id,
          scheduledFor: new Date(row.scheduled_for),
          platform: row.platform,
          status: row.status,
          postUrl: row.post_url,
          retryCount: row.retry_count,
          metaAccessToken: row.meta_access_token,
          createdAt: new Date(row.created_at)
        };

        this.scheduledPosts.set(post.id, post);
        this.setExecutionTimer(post.id, post.scheduledFor);
      }

      console.log(`✅ Loaded ${data.length} pending posts`);
    } catch (e) {
      console.warn('Error loading pending posts:', e);
    }
  }

  /**
   * Get scheduled posts for user
   */
  async getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
    return Array.from(this.scheduledPosts.values()).filter(p => p.userId === userId);
  }

  /**
   * Cancel a scheduled post
   */
  async cancelPost(postId: string): Promise<boolean> {
    const post = this.scheduledPosts.get(postId);
    if (!post) return false;

    // Clear timer
    const timer = this.activeIntervals.get(postId);
    if (timer) {
      clearTimeout(timer);
      this.activeIntervals.delete(postId);
    }

    // Update in database
    try {
      const { error } = await supabaseClient
        .from('scheduled_posts')
        .update({ status: 'cancelled' })
        .eq('id', postId);

      if (!error) {
        this.scheduledPosts.delete(postId);
        return true;
      }
    } catch (e) {
      console.error('Error cancelling post:', e);
    }

    return false;
  }

  /**
   * Get post status
   */
  getPostStatus(postId: string): ScheduledPost | undefined {
    return this.scheduledPosts.get(postId);
  }

  // Cleanup on service destruction
  destroy(): void {
    for (const [, timer] of this.activeIntervals) {
      clearTimeout(timer);
    }
    this.activeIntervals.clear();
    this.scheduledPosts.clear();
  }
}

export const calendarService = new CalendarService();
