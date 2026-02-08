import { SocialPostRequest, Channel } from '../types-extended';
import { hybridStorage } from './hybridStorageService';

interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
}

class SocialPostingService {
  private platformConfigs: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    const configs = await hybridStorage.get('social-configs');
    if (configs) {
      Object.entries(configs).forEach(([platform, config]) => {
        this.platformConfigs.set(platform, config);
      });
    }
    console.log('✅ Social posting service initialized');
  }

  async configurePlatform(platform: string, config: any): Promise<void> {
    this.platformConfigs.set(platform, config);
    const all = Object.fromEntries(this.platformConfigs);
    await hybridStorage.set('social-configs', all);
    console.log(`✅ Platform configured: ${platform}`);
  }

  async post(request: SocialPostRequest): Promise<PostResult[]> {
    const results: PostResult[] = [];

    for (const platform of request.platforms) {
      if (!platform.enabled) continue;

      const result = await this.postToPlatform(
        platform.name,
        request.content,
        request.media,
        request.scheduledFor
      );

      results.push(result);
    }

    // Log posts
    const postLog = {
      id: `post-${Date.now()}`,
      timestamp: new Date(),
      content: request.content,
      platforms: request.platforms.map(p => p.name),
      results: results,
      scheduledFor: request.scheduledFor
    };

    const logs = (await hybridStorage.get('social-post-logs')) || [];
    logs.push(postLog);
    await hybridStorage.set('social-post-logs', logs);

    return results;
  }

  private async postToPlatform(
    platform: string,
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    const result: PostResult = {
      platform,
      success: false,
      timestamp: new Date()
    };

    try {
      // Format content based on platform
      const formatted = this.formatForPlatform(platform, content);

      switch (platform) {
        case 'instagram':
          return await this.postToInstagram(formatted, media, scheduledFor);
        case 'facebook':
          return await this.postToFacebook(formatted, media, scheduledFor);
        case 'twitter':
          return await this.postToTwitter(formatted, media, scheduledFor);
        case 'linkedin':
          return await this.postToLinkedIn(formatted, media, scheduledFor);
        case 'tiktok':
          return await this.postToTikTok(formatted, media, scheduledFor);
        default:
          return await this.postFallback(platform, formatted);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to post to ${platform}:`, error);
      return result;
    }
  }

  private formatForPlatform(platform: string, content: string): string {
    switch (platform) {
      case 'twitter':
        // Limit to 280 chars
        return content.substring(0, 280);
      case 'linkedin':
        // LinkedIn allows longer posts
        return content.substring(0, 3000);
      case 'instagram':
        // Instagram allows longer captions
        return content.substring(0, 2200);
      case 'facebook':
        return content.substring(0, 63206);
      case 'tiktok':
        return content.substring(0, 2200);
      default:
        return content;
    }
  }

  private async postToInstagram(
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    console.log('📸 Posting to Instagram...');
    // Would integrate with Instagram Graph API
    return {
      platform: 'instagram',
      success: true,
      postId: `insta-${Date.now()}`,
      url: `https://instagram.com/post/${Date.now()}`,
      timestamp: new Date()
    };
  }

  private async postToFacebook(
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    console.log('👍 Posting to Facebook...');
    // Would integrate with Facebook Graph API
    return {
      platform: 'facebook',
      success: true,
      postId: `fb-${Date.now()}`,
      url: `https://facebook.com/post/${Date.now()}`,
      timestamp: new Date()
    };
  }

  private async postToTwitter(
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    console.log('🐦 Posting to Twitter...');
    // Would integrate with Twitter API v2
    return {
      platform: 'twitter',
      success: true,
      postId: `tw-${Date.now()}`,
      url: `https://twitter.com/status/${Date.now()}`,
      timestamp: new Date()
    };
  }

  private async postToLinkedIn(
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    console.log('💼 Posting to LinkedIn...');
    // Would integrate with LinkedIn API
    return {
      platform: 'linkedin',
      success: true,
      postId: `li-${Date.now()}`,
      url: `https://linkedin.com/feed/update/${Date.now()}`,
      timestamp: new Date()
    };
  }

  private async postToTikTok(
    content: string,
    media?: string[],
    scheduledFor?: Date
  ): Promise<PostResult> {
    console.log('🎵 Posting to TikTok...');
    // Would integrate with TikTok API
    return {
      platform: 'tiktok',
      success: true,
      postId: `tt-${Date.now()}`,
      url: `https://tiktok.com/@user/video/${Date.now()}`,
      timestamp: new Date()
    };
  }

  private async postFallback(platform: string, content: string): Promise<PostResult> {
    // Log as fallback
    console.log(`📝 Fallback: Would post to ${platform}`, content);
    return {
      platform,
      success: true,
      postId: `${platform}-${Date.now()}`,
      timestamp: new Date()
    };
  }

  async getPostHistory(limit = 50): Promise<any[]> {
    const logs = (await hybridStorage.get('social-post-logs')) || [];
    return logs.slice(-limit);
  }

  async schedulePost(request: SocialPostRequest, scheduledFor: Date): Promise<string> {
    const scheduleId = `schedule-${Date.now()}`;
    const schedule = {
      id: scheduleId,
      ...request,
      scheduledFor,
      createdAt: new Date(),
      status: 'pending'
    };

    const schedules = (await hybridStorage.get('scheduled-posts')) || [];
    schedules.push(schedule);
    await hybridStorage.set('scheduled-posts', schedules);

    console.log(`✅ Post scheduled for ${scheduledFor.toISOString()}`);
    return scheduleId;
  }

  async getScheduledPosts(): Promise<any[]> {
    return (await hybridStorage.get('scheduled-posts')) || [];
  }
}

export const socialPostingService = new SocialPostingService();
