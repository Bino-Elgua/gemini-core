import React, { useState, useEffect } from 'react';
import { Zap, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { geminiService } from '../services/geminiOnlyService';
import { creditSystemService } from '../services/creditSystemService';
import { toastService } from '../services/toastService';

interface DNAResult {
  sector: string;
  niche: string;
  values: string[];
  colors: string[];
  tone: string;
  competitors: string[];
}

export default function IntelligenceHubPage() {
  const [sector, setSector] = useState('');
  const [context, setContext] = useState('');
  const [dnaResult, setDnaResult] = useState<DNAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ healthy: true, message: '✅ Ready' });
  const [credits, setCredits] = useState({ usedToday: 0, remaining: 500 });

  // Check API health on mount
  useEffect(() => {
    checkApiStatus();
    geminiService.initialize({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }, []);

  const checkApiStatus = async () => {
    const status = await geminiService.checkStatus();
    setApiStatus({
      healthy: status.healthy,
      message: status.message,
    });
    setCredits({
      usedToday: status.dailyUsed,
      remaining: status.remaining,
    });
  };

  const handleExtractDNA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sector.trim()) {
      toastService.error('Missing Input', 'Please enter a sector');
      return;
    }

    // Check API health
    if (!apiStatus.healthy) {
      toastService.error('API Error', 'Google API not ready. Please check your API key.');
      return;
    }

    // Check credits
    const hasSufficientCredits = creditSystemService.hasEnoughCredits(
      { tier: 'starter', totalCredits: credits.remaining, usedToday: credits.usedToday, usedThisMonth: 0, refundPending: 0, nextResetDate: '' },
      'dnaExtraction'
    );

    if (!hasSufficientCredits) {
      toastService.error('Credits', 'Insufficient credits. Upgrade to Pro or wait for daily reset.');
      return;
    }

    setLoading(true);

    try {
      // If sector is vague, prompt user
      if (['services', 'business', 'company'].includes(sector.toLowerCase())) {
        toastService.info('Clarification Needed', `Please clarify: "services" is too broad. Try "barbershop", "plumbing", "fitness coaching", etc.`);
        setLoading(false);
        return;
      }

      const result = await geminiService.extractDNA(sector, context || '');

      if (result.niche.includes('Specify niche')) {
        toastService.warning('Be More Specific', 'Please be more specific with your sector. Example: "yoga studio" instead of "fitness"');
        setDnaResult(result);
      } else {
        setDnaResult(result);
        toastService.success('Success', '🧬 DNA extracted successfully');
      }

      // Update credits
      setCredits((prev) => ({
        ...prev,
        usedToday: prev.usedToday + 50,
        remaining: Math.max(0, prev.remaining - 50),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Extraction failed';
      toastService.error('Extraction Failed', message);

      if (message.includes('API key')) {
        setApiStatus({ healthy: false, message: '❌ Invalid API key' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      {/* Status Banner */}
      <div
        className={`mb-6 p-4 rounded-lg border ${
          apiStatus.healthy
            ? 'bg-green-950/20 border-green-700'
            : 'bg-red-950/20 border-red-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {apiStatus.healthy ? (
            <Zap className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm">{apiStatus.message}</span>
          <button
            onClick={checkApiStatus}
            className="ml-auto text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
          >
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Check Status
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🧬 Intelligence Hub</h1>
          <p className="text-slate-400">Extract brand DNA using Google Gemini</p>
        </div>

        {/* Credit Info */}
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Daily Credits Used</span>
            <span className={`font-mono ${credits.remaining < 50 ? 'text-red-400' : 'text-green-400'}`}>
              {credits.usedToday} / 500
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                credits.remaining < 50 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${(credits.usedToday / 500) * 100}%` }}
            />
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleExtractDNA} className="mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sector / Industry
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="e.g., barbershop, SaaS, fitness coaching, e-commerce"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Be specific: "services" is too vague. Try "yoga studio", "plumbing", "digital marketing", etc.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Additional Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Target audience, unique selling points, market position..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !apiStatus.healthy}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Extracting DNA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract DNA (50 credits)
                </>
              )}
            </button>
          </div>
        </form>

        {/* DNA Result */}
        {dnaResult && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">DNA Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sector</p>
                  <p className="text-lg font-semibold text-white">{dnaResult.sector}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Niche</p>
                  <p className="text-lg font-semibold text-white">{dnaResult.niche}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Brand Values</p>
                <div className="flex flex-wrap gap-2">
                  {dnaResult.values.map((value, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-purple-900/50 border border-purple-700 rounded-full text-sm text-purple-200"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Brand Colors</p>
                <div className="flex gap-3">
                  {dnaResult.colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded border border-slate-600"
                        style={{ backgroundColor: color }}
                      />
                      <code className="text-sm text-slate-300">{color}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Brand Tone</p>
                <p className="text-white capitalize">{dnaResult.tone}</p>
              </div>

              {dnaResult.competitors.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Competitors</p>
                  <ul className="text-slate-300 list-disc list-inside space-y-1">
                    {dnaResult.competitors.map((comp, i) => (
                      <li key={i}>{comp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium">
              Use This DNA for Campaign →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
