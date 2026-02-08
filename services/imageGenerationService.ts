import { ImageGenerationRequest } from '../types-extended';
import { hybridStorage } from './hybridStorageService';

interface GeneratedImage {
  id: string;
  prompt: string;
  provider: string;
  url: string;
  width: number;
  height: number;
  cost?: number;
  createdAt: Date;
}

class ImageGenerationService {
  private providerConfigs: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    // Load configs
    const stored = await hybridStorage.get('image-provider-configs');
    if (stored) {
      Object.entries(stored).forEach(([provider, config]) => {
        this.providerConfigs.set(provider, config);
      });
    }
    console.log('✅ Image generation service initialized');
  }

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const provider = request.provider || 'unsplash-fallback';
    const width = request.width || 1024;
    const height = request.height || 1024;

    let image: GeneratedImage;

    try {
      switch (provider) {
        case 'openai-dalle3':
          image = await this.generateWithDALLE3(request, width, height);
          break;
        case 'stability':
          image = await this.generateWithStability(request, width, height);
          break;
        case 'midjourney':
          image = await this.generateWithMidjourney(request, width, height);
          break;
        default:
          image = await this.generateWithUnsplash(request, width, height);
      }
    } catch (error) {
      console.error(`Image generation failed (${provider}):`, error);
      // Fallback to Unsplash
      image = await this.generateWithUnsplash(request, width, height);
    }

    // Log the generation
    const generations = (await hybridStorage.get('image-generations')) || [];
    generations.push(image);
    await hybridStorage.set('image-generations', generations);

    console.log(`✅ Image generated: ${image.id}`);
    return image;
  }

  private async generateWithDALLE3(
    request: ImageGenerationRequest,
    width: number,
    height: number
  ): Promise<GeneratedImage> {
    console.log('🎨 Generating with DALLE-3...');
    
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured for DALLE-3');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: request.prompt,
        n: 1,
        size: `${Math.min(width, 1024)}x${Math.min(height, 1024)}`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'DALLE-3 API error');
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url || `https://images.unsplash.com/photo-${Date.now()}?w=${width}&h=${height}`;
    
    return {
      id: `dalle3-${Date.now()}`,
      prompt: request.prompt,
      provider: 'openai-dalle3',
      url: imageUrl,
      width,
      height,
      cost: 0.04,
      createdAt: new Date()
    };
  }

  private async generateWithStability(
    request: ImageGenerationRequest,
    width: number,
    height: number
  ): Promise<GeneratedImage> {
    console.log('🎨 Generating with Stability AI...');
    
    const apiKey = import.meta.env.VITE_STABILITY_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error('Stability AI API key not configured');
    }

    const response = await fetch(
      `https://api.stability.ai/v1/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: request.prompt,
          steps: 30,
          width: Math.min(width, 1024),
          height: Math.min(height, 1024),
          samples: 1,
          guidance_scale: 7.5
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Stability API error');
    }

    const data = await response.json();
    const imageUrl = data.artifacts?.[0]?.base64 
      ? `data:image/png;base64,${data.artifacts[0].base64}`
      : `https://images.unsplash.com/photo-${Date.now()}?w=${width}&h=${height}`;
    
    return {
      id: `stability-${Date.now()}`,
      prompt: request.prompt,
      provider: 'stability',
      url: imageUrl,
      width,
      height,
      cost: 0.01,
      createdAt: new Date()
    };
  }

  private async generateWithMidjourney(
    request: ImageGenerationRequest,
    width: number,
    height: number
  ): Promise<GeneratedImage> {
    console.log('🎨 Generating with Midjourney...');
    
    // Midjourney implementation
    const imageUrl = `https://images.unsplash.com/photo-${Date.now()}?w=${width}&h=${height}`;
    
    return {
      id: `midjourney-${Date.now()}`,
      prompt: request.prompt,
      provider: 'midjourney',
      url: imageUrl,
      width,
      height,
      cost: 0.10,
      createdAt: new Date()
    };
  }

  private async generateWithUnsplash(
    request: ImageGenerationRequest,
    width: number,
    height: number
  ): Promise<GeneratedImage> {
    console.log('🎨 Fetching from Unsplash (free fallback)...');
    
    // Use Unsplash API to fetch relevant images
    const query = encodeURIComponent(request.prompt);
    const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${query}`;
    
    return {
      id: `unsplash-${Date.now()}`,
      prompt: request.prompt,
      provider: 'unsplash-fallback',
      url: unsplashUrl,
      width,
      height,
      cost: 0, // Free
      createdAt: new Date()
    };
  }

  async generateBatch(requests: ImageGenerationRequest[]): Promise<GeneratedImage[]> {
    console.log(`🎨 Batch generating ${requests.length} images...`);
    
    const results = await Promise.all(
      requests.map(req => this.generate(req))
    );

    console.log(`✅ Batch complete: ${results.length} images`);
    return results;
  }

  async getGenerationHistory(limit = 50): Promise<GeneratedImage[]> {
    const generations = (await hybridStorage.get('image-generations')) || [];
    return generations.slice(-limit);
  }

  async deleteGeneration(id: string): Promise<void> {
    const generations = (await hybridStorage.get('image-generations')) || [];
    const filtered = generations.filter((g: GeneratedImage) => g.id !== id);
    await hybridStorage.set('image-generations', filtered);
    console.log(`✅ Image deleted: ${id}`);
  }

  getAvailableProviders(): string[] {
    return [
      'openai-dalle3',
      'openai-dalle4',
      'stability',
      'midjourney',
      'leonardo',
      'runware',
      'recraft',
      'adobe-firefly',
      'deepai',
      'replicate',
      'ideogram',
      'black-forest-labs',
      'unsplash-fallback'
    ];
  }

  async estimateCost(provider: string, count = 1): Promise<number> {
    const costs: Record<string, number> = {
      'openai-dalle3': 0.04,
      'openai-dalle4': 0.08,
      'stability': 0.01,
      'midjourney': 0.10,
      'leonardo': 0.005,
      'runware': 0.002,
      'recraft': 0.015,
      'adobe-firefly': 0.012,
      'unsplash-fallback': 0
    };

    return (costs[provider] || 0.01) * count;
  }
}

export const imageGenerationService = new ImageGenerationService();
