import React, { useState } from 'react';
import { Code2, Download, Eye, Zap, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiOnlyService';
import { creditSystemService } from '../services/creditSystemService';
import { toastService } from '../services/toastService';
import JSZip from 'jszip';

interface GeneratedSite {
  html: string;
  css: string;
  js: string;
  dnaUsed: any;
}

export default function WebsiteBuilderGooglePage() {
  const [site, setSite] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState({ remaining: 500, usedToday: 0 });

  const dnaFromStorage = localStorage.getItem('brandDNA')
    ? JSON.parse(localStorage.getItem('brandDNA')!)
    : null;

  // Generate website from DNA
  const handleGenerateWebsite = async () => {
    if (!dnaFromStorage) {
      toastService.error('Please extract DNA first');
      return;
    }

    // Check credits
    const cost = creditSystemService.getCost('websiteGeneration');
    if (credits.remaining < cost) {
      toastService.error(`Need ${cost} credits (${credits.remaining} remaining)`);
      return;
    }

    setLoading(true);

    try {
      const generated = await geminiService.generateWebsite(dnaFromStorage);

      setSite({
        html: generated.html,
        css: generated.css,
        js: generated.js,
        dnaUsed: dnaFromStorage,
      });

      setCredits((prev) => ({
        ...prev,
        remaining: Math.max(0, prev.remaining - cost),
        usedToday: prev.usedToday + cost,
      }));

      toastService.success('✨ Website generated! One-click ready.');
    } catch (error) {
      toastService.error('Website generation failed. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  // Download as ZIP
  const handleDownloadZip = async () => {
    if (!site) return;

    try {
      const zip = new JSZip();

      // Create folder structure
      const root = zip.folder('website')!;

      // Add files
      root.file('index.html', site.html);
      root.file('styles.css', site.css);
      root.file('script.js', site.js);

      // Add metadata
      root.file(
        'README.md',
        `# Generated Website\nCreated from Brand DNA: ${site.dnaUsed.niche}\n\n## To use:\n1. Open index.html in a browser\n2. Customize content as needed\n3. Deploy to your hosting`
      );

      // Generate ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `website-${site.dnaUsed.niche.toLowerCase().replace(/\s+/g, '-')}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toastService.success('📦 Website downloaded as ZIP');
    } catch (error) {
      toastService.error('Download failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">🌐 Website Builder (Vibe Coding)</h1>
        <p className="text-slate-400 mb-8">Generate landing pages from brand DNA - one click</p>

        {/* Credit Info */}
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Credits Available</span>
            <span className="font-mono text-cyan-400">{credits.remaining}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-white mb-4">Generate</h2>

              {dnaFromStorage ? (
                <>
                  <div className="mb-4 p-3 bg-cyan-900/30 border border-cyan-700 rounded text-sm">
                    <p className="text-cyan-200 font-medium">{dnaFromStorage.niche}</p>
                    <p className="text-cyan-300/70 text-xs mt-1">Brand colors: {dnaFromStorage.colors.join(', ')}</p>
                  </div>

                  <button
                    onClick={handleGenerateWebsite}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 mb-4"
                  >
                    {loading ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code2 className="w-4 h-4" />
                        Generate (100 credits)
                      </>
                    )}
                  </button>

                  {site && (
                    <>
                      <button
                        onClick={() => {
                          const newWindow = window.open();
                          if (newWindow) {
                            newWindow.document.write(site.html);
                            newWindow.document.write(`<style>${site.css}</style>`);
                            newWindow.document.write(`<script>${site.js}<\/script>`);
                          }
                        }}
                        className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 mb-3"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>

                      <button
                        onClick={handleDownloadZip}
                        className="w-full px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download ZIP
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded text-sm text-yellow-200">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Extract DNA first
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {site && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-300">
                <div
                  className="aspect-video bg-slate-100 overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          ${site.css}
                        </style>
                      </head>
                      <body>
                        ${site.html}
                        <script>${site.js}</script>
                      </body>
                      </html>
                    `,
                  }}
                />
              </div>

              {/* Code Tabs */}
              <div className="mt-6 space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="flex border-b border-slate-700">
                    <button className="flex-1 px-4 py-2 text-sm font-medium bg-slate-700 text-white">
                      HTML
                    </button>
                    <button className="flex-1 px-4 py-2 text-sm font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50">
                      CSS
                    </button>
                    <button className="flex-1 px-4 py-2 text-sm font-medium bg-slate-800/50 text-slate-400 hover:bg-slate-700/50">
                      JS
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-300 text-xs overflow-x-auto max-h-48">
                    <code>{site.html.substring(0, 500)}...</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {!site && (
          <div className="mt-12 p-8 bg-slate-800/30 border border-slate-700/50 rounded-lg text-center">
            <p className="text-slate-400">
              Generate a website and preview it here. It's fully responsive and ready to deploy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
