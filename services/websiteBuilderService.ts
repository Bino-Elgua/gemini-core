/**
 * Website Builder Service (Gemini-only, Google Stack)
 * Vibe Coding: Generate full landing pages from DNA JSON
 * 
 * Flow: DNA JSON → Gemini generates HTML/CSS/JS → Preview + ZIP download
 * Features:
 * - One-click generation
 * - Hero section with logo/colors
 * - CTA buttons
 * - Contact forms
 * - Responsive mobile design
 * - ZIP download
 */

import { universalAiService } from './universalAiService';
import { creditsService } from './creditsService';
import JSZip from 'jszip';

export interface WebsiteConfig {
  company: string;
  tagline: string;
  description: string;
  colors: string[];
  logo?: string;
  ctaText: string;
  ctaUrl: string;
  contactEmail: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface GeneratedWebsite {
  id: string;
  html: string;
  css: string;
  js: string;
  previewUrl: string;
  zipUrl?: string;
  generatedAt: string;
}

class WebsiteBuilderService {
  /**
   * Generate full landing page from DNA config
   */
  async generateWebsite(config: WebsiteConfig): Promise<GeneratedWebsite> {
    console.log(`🎨 Generating website for: ${config.company}`);

    // Check credits (50 for website generation)
    const canAfford = await creditsService.canAffordOperation('website-generation');
    if (!canAfford) {
      throw new Error('❌ Insufficient credits for website generation (requires 50 credits)');
    }

    // Generate via Gemini
    const { html, css, js } = await this.generateViaGemini(config);

    // Deduct credits
    await creditsService.deductOperationCredits('website-generation');

    // Create preview blob
    const previewUrl = this.createPreviewUrl(html, css, js);

    const website: GeneratedWebsite = {
      id: `website_${Date.now()}`,
      html,
      css,
      js,
      previewUrl,
      generatedAt: new Date().toISOString()
    };

    console.log(`✅ Website generated: ${website.id}`);
    return website;
  }

  /**
   * Generate HTML, CSS, JS via Gemini
   */
  private async generateViaGemini(config: WebsiteConfig): Promise<{ html: string; css: string; js: string }> {
    const prompt = `Generate a professional, modern landing page for "${config.company}".

REQUIREMENTS:
- Company: ${config.company}
- Tagline: ${config.tagline}
- Description: ${config.description}
- Primary Color: ${config.colors[0] || '#0d948c'}
- Secondary Color: ${config.colors[1] || '#1a1a1a'}
- CTA Text: "${config.ctaText}"
- CTA URL: ${config.ctaUrl}
- Contact Email: ${config.contactEmail}
${config.logo ? `- Logo URL: ${config.logo}` : ''}

OUTPUT STRUCTURE: Return ONLY a JSON object (no markdown) with exactly these keys:
{
  "html": "<html>...</html> (complete HTML structure, no external deps except standard libs)",
  "css": "<style>...</style> (complete inline CSS, responsive design, mobile-first)",
  "js": "<script>...</script> (vanilla JavaScript, no frameworks, minimal)"
}

DESIGN REQUIREMENTS:
1. Hero section with company name, tagline, and CTA button
2. Features/benefits section highlighting key points
3. Contact form (name, email, message)
4. Footer with contact info and social links
5. Fully responsive (mobile, tablet, desktop)
6. Modern dark theme with accent colors
7. Smooth animations and transitions
8. No external dependencies (CSS, JS all inline)

Be creative. Make it look professional and modern. Include proper semantic HTML.`;

    try {
      const response = await universalAiService.generateText({
        prompt,
        responseMimeType: 'application/json',
        featureId: 'website-generation'
      });

      if (response === "FALLBACK_TRIGGERED") {
        throw new Error('Google API fallback triggered—try again in 30 seconds');
      }

      const parsed = JSON.parse(response);

      return {
        html: parsed.html || '<html><body>Error generating HTML</body></html>',
        css: parsed.css || '<style>body { font-family: sans-serif; }</style>',
        js: parsed.js || '<script>// No JS</script>'
      };
    } catch (error: any) {
      console.error('❌ Website generation failed:', error);
      throw new Error(`Failed to generate website: ${error.message}`);
    }
  }

  /**
   * Create a data URL preview (for in-app preview)
   */
  private createPreviewUrl(html: string, css: string, js: string): string {
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Preview</title>
  ${css}
</head>
<body>
  ${html.replace(/<html[^>]*>.*?<\/html>/is, '').replace(/<head[^>]*>.*?<\/head>/is, '')}
  ${js}
</body>
</html>
    `.trim();

    return `data:text/html;base64,${Buffer.from(fullHtml).toString('base64')}`;
  }

  /**
   * Generate downloadable ZIP with HTML, CSS, JS
   */
  async generateZip(website: GeneratedWebsite, companyName: string): Promise<Blob> {
    const zip = new JSZip();

    // Create index.html
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${website.html}
  <script src="script.js"></script>
</body>
</html>`;

    // Extract CSS from tags if needed
    let css = website.css.replace(/<style[^>]*>/g, '').replace(/<\/style>/g, '');
    let js = website.js.replace(/<script[^>]*>/g, '').replace(/<\/script>/g, '');

    zip.file('index.html', fullHtml);
    zip.file('style.css', css);
    zip.file('script.js', js);

    // Add a README
    zip.file('README.md', `# ${companyName} Landing Page

Generated by Vibe Coding.

## Files
- \`index.html\` - Main HTML file
- \`style.css\` - Styles
- \`script.js\` - JavaScript

## Deployment
Simply upload \`index.html\` to your hosting provider (Vercel, Netlify, etc).`);

    return zip.generateAsync({ type: 'blob' });
  }

  /**
   * Get download URL for ZIP
   */
  async getDownloadUrl(website: GeneratedWebsite, companyName: string): Promise<string> {
    const blob = await this.generateZip(website, companyName);
    return URL.createObjectURL(blob);
  }
}

export const websiteBuilderService = new WebsiteBuilderService();
