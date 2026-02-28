import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { geminiService } from '../services/geminiOnlyService';
import { toastService } from '../services/toastService';

export default function SettingsGooglePage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load from env or localStorage on mount
  useEffect(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const storedKey = localStorage.getItem('gemini_api_key');
    const key = storedKey || envKey || '';

    if (key) {
      setApiKey(key);
      setSaved(true);
    }
  }, []);

  // Test API key
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      toastService.error('Please enter an API key');
      return;
    }

    setTesting(true);

    try {
      // Initialize with test key
      geminiService.initialize({ apiKey });

      // Test with simple call
      const status = await geminiService.checkStatus();

      if (status.healthy) {
        setIsValid(true);
        toastService.success('✅ API key is valid');
      } else {
        setIsValid(false);
        toastService.error(status.message);
      }
    } catch (error) {
      setIsValid(false);
      toastService.error('Invalid API key');
    } finally {
      setTesting(false);
    }
  };

  // Save API key
  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toastService.error('Please enter an API key');
      return;
    }

    if (!isValid) {
      toastService.error('Please test and validate the API key first');
      return;
    }

    localStorage.setItem('gemini_api_key', apiKey);
    geminiService.initialize({ apiKey });
    setSaved(true);
    toastService.success('✅ API key saved');
  };

  // Clear key
  const handleClearKey = () => {
    if (confirm('Remove saved API key?')) {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setIsValid(false);
      setSaved(false);
      toastService.info('API key cleared');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">⚙️ Settings</h1>
        <p className="text-slate-400 mb-8">Google-only configuration</p>

        {/* Google Gemini API Key */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🔑 Gemini API Key</h2>
            <p className="text-slate-400 text-sm">
              All features use Google Gemini. Get a free API key at{' '}
              <a
                href="https://ai.google.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                ai.google.dev
              </a>
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {saved && isValid ? (
              <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700 rounded">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-200">API key configured and valid</span>
              </div>
            ) : saved && !isValid ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-700 rounded">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-200">API key needs validation</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-200">No API key configured</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsValid(false); // Invalidate when changed
                    setSaved(false);
                  }}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTestKey}
              disabled={!apiKey.trim() || testing}
              className="flex-1 px-4 py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Test Key
                </>
              )}
            </button>

            <button
              onClick={handleSaveKey}
              disabled={!isValid}
              className="flex-1 px-4 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Key
            </button>

            {saved && (
              <button
                onClick={handleClearKey}
                className="px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Info Boxes */}
          <div className="space-y-4 pt-6 border-t border-slate-700">
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-sm font-medium text-slate-300 mb-2">🔐 What you can do:</p>
              <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                <li>Extract brand DNA (50 credits)</li>
                <li>Generate campaigns (30 credits)</li>
                <li>Build landing pages (100 credits)</li>
                <li>Chat with agents (10 credits per message)</li>
                <li>Schedule auto-posts (50 credits)</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-sm font-medium text-slate-300 mb-2">💰 Free tier limits:</p>
              <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                <li>500 credits per day (automatically resets)</li>
                <li>Single agent creation</li>
                <li>Manual campaign scheduling only</li>
                <li>No team collaboration</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-700/30 rounded-lg">
              <p className="text-sm font-medium text-slate-300 mb-2">🚀 Upgrade to Pro:</p>
              <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                <li>$49/month for 2,000 credits</li>
                <li>Auto-post to Instagram & TikTok</li>
                <li>Up to 5 agents</li>
                <li>Team collaboration (5 members)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* One-click Setup */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-3">🚀 Quick Setup</h3>
          <ol className="text-sm text-slate-300 list-decimal list-inside space-y-2">
            <li>
              Get free API key:{' '}
              <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="text-blue-400">
                ai.google.dev
              </a>
            </li>
            <li>Paste key above and click "Test Key"</li>
            <li>Click "Save Key" when validated</li>
            <li>Go to Intelligence Hub → Extract DNA</li>
            <li>Use DNA in Campaign Forge & Website Builder</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
