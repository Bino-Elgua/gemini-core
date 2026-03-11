import React, { useState, useEffect } from 'react';
import { Calendar, Zap, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { geminiService } from '../services/geminiOnlyService';
import { autoPostService } from '../services/autoPostService';
import { creditSystemService } from '../services/creditSystemService';
import { toastService } from '../services/toastService';

interface CampaignData {
  title: string;
  copy: string;
  igReelScript: string;
  tiktokScript: string;
  emailSubject: string;
  emailBody: string;
}

interface ScheduledPost {
  postId: string;
  platforms: string[];
  scheduledFor: Date;
  status: 'scheduled' | 'posting' | 'posted' | 'failed';
  campaign: CampaignData;
}

export default function CampaignForgeGooglePage() {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState({ remaining: 500, usedToday: 0 });

  const dnaFromStorage = localStorage.getItem('brandDNA')
    ? JSON.parse(localStorage.getItem('brandDNA')!)
    : null;

  // Generate campaign from DNA
  const handleGenerateCampaign = async () => {
    if (!dnaFromStorage) {
      toastService.error('Error', 'Please extract DNA first');
      return;
    }

    setLoading(true);

    try {
      const generated = await geminiService.generateCampaign(dnaFromStorage);
      setCampaign(generated);

      // Deduct credits
      setCredits((prev) => ({
        ...prev,
        remaining: Math.max(0, prev.remaining - 30),
        usedToday: prev.usedToday + 30,
      }));

      toastService.success('Success', 'Campaign generated!');
    } catch (error) {
      toastService.error('Error', 'Campaign generation failed');
    } finally {
      setLoading(false);
    }
  };

  // Schedule post
  const handleSchedulePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaign) {
      toastService.error('Error', 'Generate a campaign first');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toastService.error('Error', 'Please select date and time');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toastService.error('Error', 'Select at least one platform');
      return;
    }

    // Check credits
    const cost = creditSystemService.getCost('autoPost');
    if (credits.remaining < cost) {
      toastService.error('Credits', `Need ${cost} credits to schedule post (${credits.remaining} remaining)`);
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

    try {
      const postId = await autoPostService.schedulePost(
        'campaign_1',
        selectedPlatforms as any,
        scheduledDateTime.getTime(),
        {
          text: campaign.copy,
          image: 'data:image/png;base64,...', // Would be actual generated image
        }
      );

      // Subscribe to post updates
      const unsubscribe = autoPostService.onPostUpdate(postId, (event, data) => {
        console.log(`Post ${postId} - ${event}:`, data);

        if (event === 'statusUpdate') {
          setPosts((prev) =>
            prev.map((p) =>
              p.postId === postId ? { ...p, status: data.status } : p
            )
          );

          if (data.status === 'posted') {
            toastService.success('Published', '✅ Post published!');
          } else if (data.status === 'failed') {
            toastService.error('Failed', `❌ Post failed: ${data.error}`);
          }
        }
      });

      const newPost: ScheduledPost = {
        postId,
        platforms: selectedPlatforms,
        scheduledFor: scheduledDateTime,
        status: 'scheduled',
        campaign,
      };

      setPosts((prev) => [...prev, newPost]);

      // Deduct credits
      setCredits((prev) => ({
        ...prev,
        remaining: Math.max(0, prev.remaining - cost),
        usedToday: prev.usedToday + cost,
      }));

      toastService.success('Scheduled', '📅 Post scheduled! Will post at ' + scheduledDateTime.toLocaleTimeString());

      // Clear form
      setScheduledDate('');
      setScheduledTime('10:00');
    } catch (error) {
      toastService.error('Error', 'Failed to schedule post');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">🚀 Campaign Forge</h1>

        {/* Credit Bar */}
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Credits Available</span>
            <span className="font-mono text-blue-400">{credits.remaining}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Campaign Generation */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">1️⃣ Generate Campaign</h2>

              {dnaFromStorage ? (
                <>
                  <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded text-sm text-blue-200">
                    Using DNA: <strong>{dnaFromStorage.niche}</strong>
                  </div>

                  <button
                    onClick={handleGenerateCampaign}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate Campaign (30 credits)
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-200">
                  Please extract DNA first →
                </div>
              )}
            </div>

            {/* Campaign Preview */}
            {campaign && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Campaign Preview</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Title</p>
                    <p className="text-white font-semibold">{campaign.title}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Main Copy</p>
                    <p className="text-slate-300">{campaign.copy}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Instagram Reel Script</p>
                    <p className="text-slate-300 text-sm">{campaign.igReelScript}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">TikTok Script</p>
                    <p className="text-slate-300 text-sm">{campaign.tiktokScript}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Schedule Post */}
          <div className="space-y-6">
            <form onSubmit={handleSchedulePost} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">2️⃣ Schedule Post</h2>

              <div className="space-y-4">
                {/* Platform Selection */}
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-3">Select Platforms</p>
                  <div className="space-y-2">
                    {['instagram', 'tiktok', 'twitter', 'linkedin'].map((platform) => (
                      <label key={platform} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms((prev) => [...prev, platform]);
                            } else {
                              setSelectedPlatforms((prev) =>
                                prev.filter((p) => p !== platform)
                              );
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-blue-600"
                        />
                        <span className="text-slate-300 capitalize">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!campaign}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule Post (50 credits)
                </button>
              </div>
            </form>

            {/* Scheduled Posts */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Scheduled Posts ({posts.length})</h3>

              {posts.length === 0 ? (
                <p className="text-slate-400">No posts scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div
                      key={post.postId}
                      className="p-3 bg-slate-900/50 border border-slate-700 rounded"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {post.platforms.join(', ')}
                          </p>
                          <p className="text-xs text-slate-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {post.scheduledFor.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {post.status === 'posted' && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                          {post.status === 'failed' && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 capitalize">
                        Status: <strong>{post.status}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
