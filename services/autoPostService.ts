/**
 * Auto-Post Service
 * Handles: Campaign scheduling, format conversion, social media posting with retry logic
 * Supports: Instagram, TikTok, and more
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'twitter' | 'linkedin';

export interface ScheduledPost {
  id: string;
  campaignId: string;
  platforms: SocialPlatform[];
  scheduledFor: number; // timestamp
  status: 'scheduled' | 'posting' | 'posted' | 'failed';
  assets: {
    text: string;
    image?: string; // Base64 or URL
    video?: string;
  };
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: number;
  postedAt?: number;
}

interface PostResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  error?: string;
}

class AutoPostService {
  private scheduled = new Map<string, ScheduledPost>();
  private listeners = new Map<string, Set<Function>>();
  private timers = new Map<string, NodeJS.Timeout>();

  // Mock API endpoints (replace with real Meta/TikTok APIs)
  private apiEndpoints = {
    instagram: 'https://graph.instagram.com/v18.0/me/media',
    tiktok: 'https://open-api.tiktok.com/v1/post/publish/video/init/',
    twitter: 'https://api.twitter.com/2/tweets',
    linkedin: 'https://api.linkedin.com/v2/ugcPosts',
  };

  /**
   * Schedule a post
   */
  async schedulePost(
    campaignId: string,
    platforms: SocialPlatform[],
    scheduledFor: number,
    assets: { text: string; image?: string; video?: string }
  ): Promise<string> {
    const postId = `post_${Date.now()}`;
    const post: ScheduledPost = {
      id: postId,
      campaignId,
      platforms,
      scheduledFor,
      status: 'scheduled',
      assets,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    this.scheduled.set(postId, post);
    this.schedulePostTimer(postId);

    console.log(`📅 Post scheduled: ${postId} for ${new Date(scheduledFor).toISOString()}`);
    return postId;
  }

  /**
   * Schedule timer for post
   */
  private schedulePostTimer(postId: string): void {
    const post = this.scheduled.get(postId);
    if (!post) return;

    const delay = Math.max(0, post.scheduledFor - Date.now());

    // Clear existing timer if any
    if (this.timers.has(postId)) {
      clearTimeout(this.timers.get(postId));
    }

    const timer = setTimeout(() => {
      this.executePost(postId);
    }, delay);

    this.timers.set(postId, timer);
  }

  /**
   * Execute post with retry logic
   */
  private async executePost(postId: string): Promise<void> {
    const post = this.scheduled.get(postId);
    if (!post) return;

    post.status = 'posting';
    this.broadcast(postId, 'statusUpdate', { status: 'posting' });

    try {
      // Post to all platforms
      const results: PostResult[] = [];

      for (const platform of post.platforms) {
        try {
          const result = await this.postToplatform(platform, post.assets);
          results.push(result);

          if (result.success) {
            console.log(`✅ Posted to ${platform}: ${result.postId}`);
          } else {
            console.error(`❌ Failed to post to ${platform}: ${result.error}`);
          }
        } catch (error) {
          results.push({
            platform,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Check if all posted successfully
      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        post.status = 'posted';
        post.postedAt = Date.now();
        this.broadcast(postId, 'statusUpdate', { status: 'posted', results });
      } else {
        // Retry failed posts
        if (post.retryCount < post.maxRetries) {
          post.retryCount++;
          post.lastError = `Retry ${post.retryCount}: ${results.map((r) => `${r.platform}: ${r.error}`).join(', ')}`;

          // Exponential backoff: 30s, 2m, 5m
          const backoffMs = [30000, 120000, 300000][post.retryCount - 1] || 300000;
          console.log(`⏳ Retrying in ${backoffMs / 1000}s...`);

          this.broadcast(postId, 'retryScheduled', { retryCount: post.retryCount, backoffMs });

          setTimeout(() => {
            this.executePost(postId);
          }, backoffMs);
        } else {
          post.status = 'failed';
          post.lastError = `Failed after ${post.maxRetries} retries`;
          this.broadcast(postId, 'statusUpdate', { status: 'failed', error: post.lastError });
        }
      }
    } catch (error) {
      post.status = 'failed';
      post.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.broadcast(postId, 'statusUpdate', { status: 'failed', error: post.lastError });
    }

    // Persist
    this.persistPost(postId, post);
  }

  /**
   * Post to specific platform
   */
  private async postToplatform(
    platform: SocialPlatform,
    assets: { text: string; image?: string; video?: string }
  ): Promise<PostResult> {
    // Mock API calls - replace with real endpoints
    switch (platform) {
      case 'instagram':
        return this.postToInstagram(assets);
      case 'tiktok':
        return this.postToTikTok(assets);
      case 'twitter':
        return this.postToTwitter(assets);
      case 'linkedin':
        return this.postToLinkedIn(assets);
      default:
        return { platform, success: false, error: 'Unknown platform' };
    }
  }

  /**
   * Post to Instagram (via Meta API)
   */
  private async postToInstagram(assets: { text: string; image?: string; video?: string }): Promise<PostResult> {
    try {
      // In production: Use Meta Graph API
      // For now: Mock success
      const postId = `ig_${Date.now()}`;

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        platform: 'instagram',
        success: true,
        postId,
      };
    } catch (error) {
      return {
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Instagram post failed',
      };
    }
  }

  /**
   * Post to TikTok
   */
  private async postToTikTok(assets: { text: string; image?: string; video?: string }): Promise<PostResult> {
    try {
      // In production: Use TikTok Open API
      const postId = `tt_${Date.now()}`;

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        platform: 'tiktok',
        success: true,
        postId,
      };
    } catch (error) {
      return {
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : 'TikTok post failed',
      };
    }
  }

  /**
   * Post to Twitter
   */
  private async postToTwitter(assets: { text: string; image?: string; video?: string }): Promise<PostResult> {
    try {
      const postId = `tw_${Date.now()}`;
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        platform: 'twitter',
        success: true,
        postId,
      };
    } catch (error) {
      return {
        platform: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Twitter post failed',
      };
    }
  }

  /**
   * Post to LinkedIn
   */
  private async postToLinkedIn(assets: { text: string; image?: string; video?: string }): Promise<PostResult> {
    try {
      const postId = `li_${Date.now()}`;
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        platform: 'linkedin',
        success: true,
        postId,
      };
    } catch (error) {
      return {
        platform: 'linkedin',
        success: false,
        error: error instanceof Error ? error.message : 'LinkedIn post failed',
      };
    }
  }

  /**
   * Get post status
   */
  async getPost(postId: string): Promise<ScheduledPost | null> {
    return this.scheduled.get(postId) || null;
  }

  /**
   * Get all scheduled posts for campaign
   */
  async getScheduledPosts(campaignId: string): Promise<ScheduledPost[]> {
    return Array.from(this.scheduled.values()).filter((p) => p.campaignId === campaignId);
  }

  /**
   * Cancel scheduled post
   */
  async cancelPost(postId: string): Promise<boolean> {
    const post = this.scheduled.get(postId);
    if (!post || post.status === 'posting' || post.status === 'posted') {
      return false; // Can't cancel if already posted
    }

    // Clear timer
    if (this.timers.has(postId)) {
      clearTimeout(this.timers.get(postId));
      this.timers.delete(postId);
    }

    this.scheduled.delete(postId);
    localStorage.removeItem(`autopost_${postId}`);

    return true;
  }

  /**
   * Subscribe to post updates (WebSocket-like)
   */
  onPostUpdate(postId: string, callback: (event: string, data: any) => void): () => void {
    if (!this.listeners.has(postId)) {
      this.listeners.set(postId, new Set());
    }

    this.listeners.get(postId)!.add(callback);

    return () => {
      this.listeners.get(postId)?.delete(callback);
    };
  }

  /**
   * Broadcast event
   */
  private broadcast(postId: string, event: string, data: any): void {
    const listeners = this.listeners.get(postId);
    if (listeners) {
      listeners.forEach((fn) => {
        try {
          fn(event, data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    }
  }

  /**
   * Persist post (localStorage for demo)
   */
  private persistPost(postId: string, post: ScheduledPost): void {
    try {
      localStorage.setItem(`autopost_${postId}`, JSON.stringify(post));
    } catch {
      console.warn('Storage quota exceeded');
    }
  }
}

export const autoPostService = new AutoPostService();
